# ALGORITHM_INVENTORY.md — Inventaire des algorithmes HashCode Sync

> Référence croisée avec ALGORITHM_AUDIT.md §3  
> Aucune modification de code.

---

## Tableau récapitulatif

| ID | Nom | Fichier | Type | Complexité |
|---|---|---|---|---|
| ALG-001 | Interval Merge (Masse Horaire) | `src/lib/masse-horaire.ts:11` | Greedy + sort | O(n log n) |
| ALG-002 | Bayesian Presence Probability | `src/lib/probability.ts:27` | Statistical (Beta-binomial) | O(1) |
| ALG-003 | Weighted Member Counting | `src/lib/scheduling.ts:49` | Brute-force filtering | O(n) par appel |
| ALG-004 | Candidate Slot Generation | `src/lib/scheduling.ts:66` | Sliding window + filtering | O(d × h × n) |
| ALG-005 | Weighted Interval Scheduling (DP) | `src/lib/scheduling.ts:90` | Dynamic Programming | O(n²) |
| ALG-006 | Gaussian KDE Smoothing | `src/lib/scheduling.ts:132` | Statistical smoothing | O(h²) |
| ALG-007 | Timezone Normalization | `src/lib/timezone.ts:99` | Rule-based + Intl API | O(n) |
| ALG-008 | Overlap Detection (CRUD) | `src/app/api/availabilities/route.ts:136` | Interval intersection | O(n) |
| ALG-009 | Gap Detection | `src/app/api/admin/scheduling/gaps/route.ts:37` | Linear scan | O(d × h) |
| ALG-010 | Coverage History Replay | `src/app/api/admin/scheduling/history/route.ts:96` | Re-run computeScheduling | O(weeks × n²) |
| ALG-011 | Weighted Rows Filtering | `src/app/api/admin/scheduling/route.ts:17` | Filtering + aggregation | O(n × m) |
| ALG-012 | Recommendation Ranking | `src/lib/scheduling.ts:204` | Sort + slice | O(n log n) |

---

## Détails par algorithme

### ALG-001 — Interval Merge (Masse Horaire)

**Nom:** `computeMassHours`  
**Localisation:** `src/lib/masse-horaire.ts:11`  
**Objectif:** Calculer les heures totales de disponibilité par utilisateur par semaine, en fusionnant les intervalles qui se chevauchent ou se touchent.

**Entrées:**
- `slots: Slot[]` — liste de `{day, startTime, endTime}`

**Sorties:**
- `number` — heures totales, arrondies à 0.5h près

**Méthode:**
1. Grouper les slots par jour (`Map<day, [start, end][]>`).
2. Pour chaque jour, trier par start croissant, puis end décroissant.
3. Fusion gloutonne : si `current.start <= last.end`, étendre `last.end = max(last.end, current.end)`.
4. Sommer les durées fusionnées.
5. Convertir en heures et arrondir à 0.5h (`Math.round(hours * 2) / 2`).

**Type:** Greedy + sort  
**Complexité:** O(n log n) par jour, n = slots par jour  
**Espace:** O(n)

**Hypothèses implicites:**
- Les slots sont valides (end > start, validé en amont).
- Un slot ne traverse pas minuit (format HH:mm).
- Les slots d'un même jour sont indépendants des autres jours.

**Limites:**
- Ne détecte pas les slots inversés (end < start) — ils sont ignorés silencieusement (ligne 16).
- Arrondi global à 0.5h peut masquer des variations fines.
- Pas de gestion des slots partiels (ex: 23h30-00h30 traversant minuit).

---

### ALG-002 — Bayesian Presence Probability

**Nom:** `presenceProbability`  
**Localisation:** `src/lib/probability.ts:27`  
**Objectif:** Estimer la probabilité de présence pᵢ ∈ [0,1] d'un membre en fusionnant historique d'assiduité et masse horaire déclarée.

**Entrées:**
- `history: PresenceHistory` — `{present, absent}` (comptages bruts)
- `massHours: number` — heures déclarées (ALG-001)
- `baseMax?: number` — borne supérieure du prior (défaut 0.85)
- `baseMin?: number` — borne inférieure du prior (défaut 0.25)

**Sorties:**
- `number` — probabilité p ∈ [baseMin, baseMax]

**Méthode:**
1. Calculer le prior: `prior = clamp(0.3 + massHours/60, baseMin, baseMax)`.
2. Si `n = present + absent === 0`: retourner `prior`.
3. Sinon: `sb = (1 + present) / (2 + n)` (estimateur Beta-binomial avec α=β=1).
4. Combiner: `p = prior * 0.3 + sb * 0.7`.

**Type:** Statistical (Beta-binomial Bayesian estimator)  
**Complexité:** O(1)  
**Espace:** O(1)

**Hypothèses implicites:**
- A priori non informatif Beta(α=1, β=1).
- Le prior est dominé par l'historique quand n ≥ 5 (0.7 > 0.3).
- La masse horaire déclarée est un proxy de fiabilité.

**Limites:**
- Poids 0.3/0.7 arbitraires, non calibrés.
- Prior linéaire en massHours (0.3 + massHours/60) sans justification empirique.
- Pas de fenêtre glissante de récence (l'historique complet est utilisé).
- Pas de composante temporelle (pᵢ est identique pour tous les créneaux d'un membre).
- Plafond 0.85 aplatit la discrimination en haut de l'échelle.

---

### ALG-003 — Weighted Member Counting

**Nom:** `weightedMembers`  
**Localisation:** `src/lib/scheduling.ts:49`  
**Objectif:** Pour un jour et une fenêtre [start, end], sommer les poids des membres dont la disponibilité couvre cette fenêtre.

**Entrées:**
- `availabilities: SlotAvail[]` — slots du jour
- `day: number`
- `start: number` — minutes
- `end: number` — minutes

**Sorties:**
- `number` — somme des weights couvrant [start, end]

**Méthode:**
```typescript
let w = 0;
for (const a of availabilities) {
  if (a.day === day && a.startMin <= start && a.endMin >= end) {
    w += a.weight ?? 1;
  }
}
return w;
```

**Type:** Brute-force filtering  
**Complexité:** O(n) par appel, n = slots du jour  
**Espace:** O(1)

**Hypothèses implicites:**
- Chaque membre a un seul weight pour tous ses slots.
- Les slots sont déjà normalisés dans le fuseau de référence.

**Limites:**
- Appelé ~168 fois pour la heatmap + ~100 fois par jour pour les candidats = ~268 × S_opérations.
- Goulot principal du pipeline pour N > 1 000.
- Pas d'index spatial (interval tree, segment tree).

---

### ALG-004 — Candidate Slot Generation

**Nom:** `candidateSlots`  
**Localisation:** `src/lib/scheduling.ts:66`  
**Objectif:** Générer toutes les fenêtres candidates de `windowMinutes` minutes pour chaque jour, avec leur poids total.

**Entrées:**
- `availabilities: SlotAvail[]`
- `windowMinutes: number`
- `minHour: number`
- `maxHour: number`

**Sorties:**
- `CandSlot[]` — créneaux avec `{day, startMin, endMin, startHour, endHour, weight}`

**Méthode:**
1. Pour chaque jour (0-6):
   - Filtrer les slots du jour.
   - Pour chaque `startHour` de `minHour` à `maxHour - windowMinutes/60`:
     - Calculer `start = startHour * 60`, `end = start + windowMinutes`.
     - Appeler `weightedMembers(day, start, end)`.
     - Si `weight > 0`, ajouter le créneau.
2. Retourner la liste.

**Type:** Sliding window + filtering  
**Complexité:** O(d × h × n), d=7, h=heures explorées, n=slots du jour  
**Espace:** O(candidats)

**Hypothèses implicites:**
- Pas de sous-heures: le pas est de 1 heure.
- `minHour` et `maxHour` bornent l'exploration.

**Limites:**
- Créneaux commençant à 8h30 non explorés.
- Pas de sliding window adaptatif (pas de pas de 15min ou 30min).

---

### ALG-005 — Weighted Interval Scheduling (DP)

**Nom:** `selectNonOverlappingHours`  
**Localisation:** `src/lib/scheduling.ts:90`  
**Objectif:** Sélectionner un sous-ensemble de créneaux non chevauchants sur un jour donné maximisant la somme des poids.

**Entrées:**
- `slots: CandSlot[]` — créneaux d'un jour

**Sorties:**
- `CandSlot[]` — sous-ensemble optimal (non chevauchants)

**Méthode:**
1. Trier par `endMin` croissant, puis `startMin` croissant.
2. Construire `p[i]` = index du dernier créneau non chevauchant avant i (**dichotomie** sur `endMin`, O(log n) par créneau — ALG-004 clôturé).
3. DP: `dp[i] = max(weight[i] + dp[p[i]], dp[i-1])`.
4. Reconstruction du sous-ensemble optimal.

**Type:** Dynamic Programming (Weighted Interval Scheduling classique)  
**Complexité:** O(n log n) pour p + O(n) pour DP  
**Espace:** O(n)

**Hypothèses implicites:**
- Les créneaux sont sur un seul jour.
- Pas de contrainte de durée minimale au niveau du WIS.
- Les poids sont additifs (pas de saturation).

**Limites:**
- ✅ La recherche de prédécesseur est optimisée en O(n log n) par dichotomie (ALG-004, test de parité vs O(n²) sur 1000 cas aléatoires).
- Appliqué **par jour indépendamment** — pas de vue semaine globale.
- Peut sélectionner plusieurs créneaux par jour, mais le système ne sait pas si c'est désiré.

---

### ALG-006 — Gaussian KDE Smoothing

**Nom:** `smoothHourly` / `gaussianHeatmap`  
**Localisation:** `src/lib/scheduling.ts:132` / `:147`  
**Objectif:** Lisser la heatmap horaire pour réduire le bruit et renforcer les pics d'affluence.

**Entrées:**
- `counts: number[]` — valeurs par heure (24)
- `sigma?: number` — écart-type (défaut 1.2)

**Sorties:**
- `number[]` — valeurs lissées

**Méthode:**
Pour chaque heure h avec `counts[h] > 0`:
  Pour chaque heure k (0..23):
    `out[k] += counts[h] * exp(-(h-k)² / (2σ²))`

**Type:** Statistical smoothing (KDE gaussien 1D)  
**Complexité:** O(h²) = O(576) — constant  
**Espace:** O(h)

**Hypothèses implicites:**
- Sigma fixe (1.2) — pas d'adaptation au nombre de participants.
- Les valeurs nulles ne diffusent pas (optimisation).

**Limites:**
- Sigma fixe peut créer des faux positifs dans les heures vides.
- Les valeurs lissées ne correspondent plus à un nombre de membres ni à une probabilité.

---

### ALG-007 — Timezone Normalization

**Nom:** `convertToReference` / `convertAvailability`  
**Localisation:** `src/lib/timezone.ts:99` / `:134`  
**Objectif:** Convertir toutes les disponibilités dans un fuseau de référence (Africa/Porto-Novo) avant calcul.

**Entrées:**
- `rows: {day, startTime, endTime, userTz, weight?}[]`
- `refTz?: string` (défaut: Africa/Porto-Novo)
- `now?: Date`

**Sorties:**
- `RefAvailability[]` — `{day, startMin, endMin, userTz, weight?}` dans le fuseau de référence

**Méthode:**
1. Fast-path: si tous les `userTz === refTz`, conversion arithmétique directe.
2. Sinon: pour chaque slot:
   - Ancrer la semaine dans le fuseau du membre.
   - Calculer l'occurrence du jour dans la semaine.
   - Convertir `wallToUtc` (local → UTC) puis `partsInTz` (UTC → référence).
   - Calculer `startMin`, `endMin` dans le référentiel.
   - Si la fin retombe le jour suivant, borner `endMin` à 1440.

**Type:** Rule-based + Intl API  
**Complexité:** O(n) avec cache DTF  
**Espace:** O(n)

**Hypothèses implicites:**
- La semaine est ancrée au lundi (ISO weekday).
- Les slots ne traversent pas minuit dans le fuseau de référence (borne 1440).
- DST géré via `Intl.DateTimeFormat` (pas de calcul manuel).

**Limites:**
- `staticOffset` utilise un instant fixe (pas de gestion dynamique du DST pour tous les fuseaux).
- Conversion complète ~8.5s pour 100k slots (vs 0.15s en fast-path).
- Pas de gestion des fuseaux avec offset demi-heure (ex: India +5:30).

---

### ALG-008 — Overlap Detection (CRUD)

**Nom:** `overlaps` (inline)  
**Localisation:** `src/app/api/availabilities/route.ts:136`  
**Objectif:** Empêcher la création de deux slots qui se chevauchent pour un même utilisateur dans un même scope.

**Entrées:**
- `existing: Availability[]` — slots existants
- `startTime, endTime: string` — nouveau slot

**Sorties:**
- `boolean` — true si chevauchement détecté

**Méthode:**
```typescript
const overlaps = existing.some(
  (a) => startTime < a.endTime && endTime > a.startTime
);
```

**Type:** Interval intersection  
**Complexité:** O(n)  
**Espace:** O(1)

**Hypothèses implicites:**
- Comparaison sur strings "HH:mm" — fonctionne car format lexicographiquement cohérent.
- Vérification scope par scope (groupe/activité vs global).

**Limites:**
- Les slots généraux (groupId=null) ne sont pas comparés aux slots de groupe.
- Pas de détection de chevauchement partiel complexe (mais la condition standard suffit).

---

### ALG-009 — Gap Detection

**Nom:** `detectGaps`  
**Localisation:** `src/app/api/admin/scheduling/gaps/route.ts:37`  
**Objectif:** Trouver les plages horaires vides dans la heatmap.

**Entrées:**
- `heatmap: {day, hour, count}[]`
- `minHour, maxHour: number`
- `threshold?: number` (défaut 0.15 — **mort**)

**Sorties:**
- `{day, gaps: [{startHour, endHour, duration}]}[]`

**Méthode:**
1. Grouper la heatmap par jour (`Map<day, Map<hour, count>>`).
2. Pour chaque jour, scanner de `minHour` à `maxHour`:
   - Si `count === 0` et pas en gap → début de gap.
   - Si `count > 0` et en gap → fin de gap.
3. Collecter les gaps.

**Type:** Linear scan  
**Complexité:** O(d × h)  
**Espace:** O(gaps)

**Hypothèses implicites:**
- `count === 0` signifie "personne n'est dispo".
- `threshold` n'est pas utilisé (bug).

**Limites:**
- Seuil relatif (`threshold`) déclaré mais mort (ligne 41 vs 62).
- Ne considère que les cellules strictement vides, pas les cellules sous-seuil.
- `DAY_NAMES` déclaré mais inutilisé (ligne 43).

---

### ALG-010 — Coverage History Replay

**Nom:** `history` (route)  
**Localisation:** `src/app/api/admin/scheduling/history/route.ts:96`  
**Objectif:** Rejouer les snapshots historiques pour tracer la couverture au fil des semaines.

**Entrées:**
- `weeks: number` (max 12)
- `groupId?: string`
- `WeekSnapshot` avec `slots`

**Sorties:**
- `{weekStart, coveragePercent, totalMembers, totalAvailabilities}[]`

**Méthode:**
1. Pour chaque semaine passée (max 12):
   - Charger les snapshots avec slots.
   - Convertir en `RefAvailability`.
   - Appeler `computeScheduling` (weight=1 pour tous).
   - Calculer `coveragePercent = totalAvailabilities / (users * 40)`.

**Type:** Re-run computeScheduling  
**Complexité:** O(weeks × n²)  
**Espace:** O(weeks)

**Hypothèses implicites:**
- Les snapshots contiennent tous les slots de la semaine.
- 40 slots par utilisateur est un dénominateur raisonnable.

**Limites:**
- `coveragePercent` incorrect: `users * 40` est une constante magique non sourcée.
- Weights forcés à 1 (pas de Bayesian weight sur l'historique).
- `coveragePercent` est un ratio de slots, pas de couverture réelle.

---

### ALG-011 — Weighted Rows Filtering

**Nom:** `weightedRows`  
**Localisation:** `src/app/api/admin/scheduling/route.ts:17`  
**Objectif:** Filtrer les availabilités par scope (groupe/activité) et calculer le weight par utilisateur.

**Entrées:**
- `u: UserSlots` — utilisateur avec availabilities
- `groupScope: string | null`
- `activityId: string | null`
- `massScope: boolean`

**Sorties:**
- `{day, startTime, endTime, userTz, weight}[]`

**Méthode:**
1. Filtrer les slots par scope:
   - Si `massScope`: tous les slots.
   - Sinon: slots matching `groupId === groupScope || groupId === null` ET `activityId` match.
2. Calculer `mass = computeMassHours(slots)`.
3. Calculer `weight = presenceProbability(attendance, mass)`.
4. Retourner les slots avec `weight`.

**Type:** Filtering + aggregation  
**Complexité:** O(n × m)  
**Espace:** O(n)

**Hypothèses implicites:**
- Un utilisateur a un seul weight pour tous ses slots.
- `massScope` détermine si on utilise tous les slots ou seulement le scope.

**Limites:**
- `massScope` booléen change le comportement de filtrage de manière non intuitive.
- Code dupliqué dans `admin/scheduling`, `mentor/scheduling`, `gaps`.

---

### ALG-012 — Recommendation Ranking

**Nom:** Ranking final  
**Localisation:** `src/lib/scheduling.ts:204`  
**Objectif:** Classer les créneaux sélectionnés par ordre de priorité.

**Entrées:**
- `selectedByDay: CandSlot[]` — créneaux sélectionnés par WIS

**Sorties:**
- Top 6 créneaux (dans `recommendation`)

**Méthode:**
1. Trier par `weight DESC`, puis `day ASC`, puis `startHour ASC`.
2. `slice(0, 6)`.

**Type:** Sort + slice  
**Complexité:** O(n log n)  
**Espace:** O(1)

**Hypothèses implicites:**
- Le weight est le seul critère de ranking.
- 6 créneaux suffisent pour l'UI.

**Limites:**
- Pas de diversification (6 créneaux peuvent être très similaires).
- Pas de prise en compte des préférences, mentor, équité.
- `slice(0, 6)` arbitraire.

---

## Pipeline complet avec algorithmes

```
[DB Query]
    ↓
[ALG-011] Weighted Rows Filtering
    ↓
[ALG-007] Timezone Normalization
    ↓
[ALG-002] Bayesian Presence Probability (déjà calculé dans ALG-011)
    ↓
[ALG-003] Weighted Member Counting × 168 (heatmap brute)
    ↓
[ALG-006] Gaussian KDE Smoothing (optionnel)
    ↓
[ALG-004] Candidate Slot Generation
    ↓
[ALG-005] Weighted Interval Scheduling (par jour)
    ↓
[ALG-012] Recommendation Ranking
    ↓
[Sortie] HeatmapData
```

---

## Dépendances entre algorithmes

```
ALG-002 ← ALG-001 (massHours)
ALG-003 ← ALG-002 (weight)
ALG-004 ← ALG-003 (weightedMembers)
ALG-005 ← ALG-004 (candidateSlots)
ALG-006 ← ALG-003 (heatmap)
ALG-007 ← ALG-004 (normalisation)
ALG-012 ← ALG-005 (ranking)
```

---

## Points de goulot identifiés

| Goulot | Algorithme | Complexité actuelle | Complexité optimale |
|---|---|---|---|
| Heatmap counting | ALG-003 | O(n) par cellule | O(log n) avec interval tree |
| WIS predecessor | ALG-005 | ✅ O(n log n) (dichotomie, ALG-004) | O(n log n) |
| Timezone conversion | ALG-007 | O(n) (fast-path: O(1)) | O(1) avec pré-calcul |
| DB fetching | — | O(N × S) | O(N) avec matérialisation |

---

## Redondances et duplications

1. **`weightedRows` dupliqué:** Même fonction dans `admin/scheduling`, `mentor/scheduling`, `gaps`.
2. **`computeMassHours` appelé plusieurs fois:** Une fois dans `weightedRows`, potentiellement plusieurs fois par utilisateur.
3. **`convertToReference` appelé plusieurs fois:** Une fois par route, pas de cache partagé.
4. **`presenceProbability` appelé plusieurs fois:** Une fois par utilisateur dans `weightedRows`, potentiellement plusieurs fois dans `mentor/scheduling`.

---

## Suggestions de refactor (sans changer l'algorithme)

1. Extraire `weightedRows` dans `src/lib/scheduling.ts` (ou un module partagé).
2. Ajouter un cache par utilisateur pour `presenceProbability` (déjà calculé dans `weightedRows`).
3. ✅ **Fait** — ALG-005 optimisé : `p[i]` par dichotomie (O(n log n)), test de parité vs O(n²) sur 1000 cas aléatoires (`selectNonOverlappingHours`).
4. Ajouter un index spatial pour ALG-003 (interval tree) si N > 5 000.

---

## Matrice de couverture des besoins

| Besoin métier | Algorithme actuel | Couverture | Manque |
|---|---|---|---|
| Collecter les disponibilités | ALG-008 | ✅ | — |
| Représenter les disponibilités | ALG-007 | ✅ | — |
| Identifier les créneaux possibles | ALG-004 | ✅ | Pas de sous-heures |
| Calculer le nombre de personnes disponibles | ALG-003 | ✅ | Somme de probabilités, pas de compte exact |
| Recommander les meilleurs créneaux | ALG-005 + ALG-012 | ⚠️ | Un seul critère (weight) |
| Planifier des événements | ALG-012 | ⚠️ | Pas de planification multi-événements |
| Respecter des contraintes | ALG-008 | ⚠️ | Seulement overlap; pas de capacité, rôle, équité |
| Prendre en compte des préférences | ALG-002 | ⚠️ | Pas de préférences explicites |
| Gérer mentors / rôles / capacités | — | ❌ | Non implémenté |
| Éviter les conflits | ALG-008 | ✅ (CRUD only) | Pas au niveau scheduling |
| Favoriser une bonne participation | ALG-002 | ⚠️ | Historique d'assiduité, pas de feedback loop |
| Évoluer vers une optimisation plus intelligente | ALG-005 | ⚠️ | Pas de contraintes métier |

---

## Conclusion

Le système actuel utilise **12 algorithmes distincts**, tous custom en TypeScript, sans dépendance externe. Le cœur est un **Weighted Interval Scheduling optimal par jour** avec un **modèle bayésien de présence**. L'architecture est **simple, transparente et performante** pour la taille actuelle, mais **sous-dimensionnée** pour les contraintes métier futures (capacité, rôles, équité, multi-événements).
