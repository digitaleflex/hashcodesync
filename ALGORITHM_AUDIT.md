# ALGORITHM_AUDIT.md — Audit algorithmique complet de HashCode Sync

> Audit indépendant — **aucune modification de code**.
> Convention : **FAIT** = observé dans le code (ligne référencée) · **INTERPRÉTATION** = déduction de l'auditeur · **RECO** = recommandation (avec déclencheur mesurable).

---

## 1. Vue d'ensemble du système

HashCode Sync aide une cohorte d'encadrants à se rendre disponibles sur des créneaux horaires, puis conseille à l'admin des **fenêtres de 1 à 4 h** où planifier des ateliers, en croisant :
- les disponibilités déclarées (jour/heures, par groupe/activité) ;
- la **probabilité de présence** calculée depuis l'historique d'assiduité ;
- une heatmap 7×24 et un lissage KDE.

Le système comporte **deux moteurs distincts** :
1. **Moteur de recommandation** (heatmap + top-6 créneaux) — `src/lib/scheduling.ts` + routes `admin/scheduling`, `mentor/scheduling`, `gaps`, `history`, `cell`.
2. **Moteur d'inscription aux ateliers** (capacité + waitlist FIFO) — routes `workshops/[id]/participants` et admin.

Il n'existe **aucun solveur** (CP-SAT, MILP, recherche locale) dans la stack. La recommandation est une **heuristique de scoring pondéré + WIS**.

**Stack** : Next.js 16.2.12 (App Router), React 19.2.8, Prisma 7.9.1 + PostgreSQL 16, better-auth 1.6.25, SWR, recharts. Aucune dépendance d'optimisation. Fuseau de référence : `Africa/Porto-Novo` (`src/lib/timezone.ts:5`).

## 2. Pipeline réel de traitement (de la requête au rendu)

```
GET /api/admin/scheduling?window&groupId&activityId&smooth
 1. auth (better-auth) — role admin            [route.ts:48-54]
 2. lecture groupes (liste affichée)            [route.ts:64]
 3. cache lookup (clé window|group|activity)    [route.ts:73-86]   TTL 4 s
 4. DB : members + user.timezone + attendances  [route.ts:99] ou ALL users avec dispo [route.ts:128]
 5. weightedRows : filtre portée + mass + p_i   [route.ts:17-35]   ALG-010
 6. convertToReference (fuseaux)                [route.ts:156]     ALG-008
 7. computeScheduling (heatmap + reco top-6)    [route.ts:158]     ALG-001
 8. (option) gaussianHeatmap σ=1.2              [scheduling.ts:226]
 9. cache.set + JSON (heatmap, reco, groups)    [route.ts:167-183]
```

Front : `src/components/admin-scheduling.tsx` → `scheduling-views.tsx` (HeatmapCard, RecommendationCard) et `admin/cockpit.tsx` (insights, gaps, tendance, export).

## 3. Objectif du système — formalisation mathématique du problème

Le problème sous-jacent se modélise ainsi (c'est **ce que le code implémente implicitement**) :

- 7 jours × H heures de départ (H ≤ 24), fenêtres de `w` heures (1 ≤ w ≤ 4).
- Chaque membre i a un poids de présence pᵢ ∈ [0.25, 0.85] (ALG-006).
- Score d'un créneau = Σ pᵢ sur les membres couvrant entièrement le créneau (**couverture pondérée**).
- Objectif : sélectionner ≤ 6 créneaux, non chevauchants **par jour**, maximisant Σ scores (WIS, ALG-004).

**FAIT** : il n'y a ni fonction objectif multi-contraintes, ni contrainte dure (minimum de participants, capacité, équité), ni conflit inter-ateliers. Le « problème » résolu est un **problème d'optimisation d'intervalle pondéré par jour**, dégénéré (S ≤ 12 fenêtres), pour lequel WIS est **exact et optimal** (recherche de prédécesseur par dichotomie, O(S log S)).

**INTERPRÉTATION** : la partie « recommandation » est mathématiquement bien posée mais **sous-dimensionnée** : elle répond « où les gens sont-ils le plus disponibles ? » et non « quand peut-on tenir tel atelier avec les bonnes personnes ? ». Le vrai problème opérationnel (affecter plusieurs ateliers à des membres, capacités, préférences) n'est **pas** modélisé.

## 4. Contraintes — dur / souple

| Contrainte | Type | Où | Statut |
|---|---|---|---|
| Un membre couvre une fenêtre s'il couvre TOUT l'intervalle | dur (math) | `scheduling.ts:57` | OK |
| Non-chevauchement des créneaux recommandés **par jour** | dur (math) | WIS `scheduling.ts:90` | OK, mais pas inter-jours |
| Capacité d'un atelier (nombre max de participants) | dur (métier) | `participants/route.ts:31` | OK au moment de l'inscription |
| Waitlist FIFO (`joinedAt ASC`) | dur (métier) | `waitlist/route.ts:21` | OK |
| Validation hebdo verrouille les dispo (423) | dur (métier) | `validate/route.ts:62` | OK |
| Max 3 re-modifications/semaine | dur (métier) | `validate/route.ts:8` | OK |
| Recommandation « assez de membres » (min de participants) | **absente** | — | Manquante |
| Aucun membre sur-affecté (2 ateliers à la même heure) | **absente** | — | Manquante |
| Équité (chacun participe ~également) | **absente** | — | Manquante |
| Préférences (jour/heure préférés, types d'activité) | **absente** | — | Manquante |
| Capacité **pondérée** (par pᵢ, pas par tête) | **absente** | — | Manquante |

## 5. Audit du scoring de recommandation

**FAIT** :
- Score d'un créneau = Σ poids de présence ; `available` = arrondi à 0.01 près (`scheduling.ts:213`).
- `percent = round(weight / totalMembers × 100)` (`scheduling.ts:214`) — basé sur `totalMembers` (taille de cohorte/du groupe), **pas** sur le nombre de membres couvrant.
- Classement final : poids décroissant, puis jour, puis heure (`scheduling.ts:204`).

**INTERPRÉTATION** :
- pᵢ plafonné à 0.85 (ALG-006) : deux membres « parfaits » (0.85+0.85) pèsent moins que trois membres moyens (0.6×3=1.8 vs 1.7) → le score peut **sous-estimer** les petits groupes très fiables. C'est un choix de sécurité (conservateur) mais non documenté.
- `percent` mêle des membres qui ne couvrent pas la fenêtre : un créneau couvert par 5 membres sur 100 affiche 5 % — le chiffre est peu exploitable tel quel pour « prendre une décision ».
- Le WIS optimise par jour isolément : deux fenêtres de jours différents peuvent mobiliser les **mêmes** membres (pas de budget hebdomadaire par membre).

**RECO** (déclencheur mesurable) : dès que ≥ 2 ateliers sont planifiés par semaine en moyenne (mesure : compteur hebdomadaire d'ateliers), introduire un **budget hebdomadaire par membre** (max k ateliers) dans la sélection ; exposer `coverage = nb membres couvrant` et `expectedPresent = Σpᵢ` séparément plutôt qu'un seul `available` flottant.

## 6. Audit de la heatmap

**FAIT** :
- Granularité **horaire** fixe (168 cellules), `minHour/maxHour` auto-déduits des données non vides, fallback `[8,20]` (`scheduling.ts:183-192`).
- Valeur d'une cellule = somme des poids (ALG-002), pas le nombre de membres.
- Lissage KDE optionnel σ=1.2 par défaut côté API (`smooth !== "false"`, `route.ts:62`), constant en coût (ALG-005).

**INTERPRÉTATION** :
- « count » (le champ JSON s'appelle `count`) est en réalité une **somme pondérée** pouvant être fractionnaire — sémantique trompeuse pour le front (`scheduling-views.tsx` colore selon `count`).
- Le lissage est appliqué sur ces valeurs pondérées : les valeurs lissées (ex. 3.7) ne correspondent plus ni à un nombre de membres ni à une probabilité.

**RECO** (déclencheur mesurable) : renommer/dupliquer le champ en `weightSum` (ou exposer `memberCount` en plus) dès que le front exploite la valeur pour une décision ; afficher la version brute par défaut et garder `heatmapSmoothed` en référence.

## 7. Audit de la détection de gaps

**FAIT (mise à jour)** :
- `detectGaps` signale les heures à couverture **sous le seuil** (par défaut : strictement nul).
- Le seuil relatif `threshold` est désormais **effectif** (paramètre de requête `?threshold=`, clampé 0–1) et comparé à la couverture max du jour : un jour totalement vide = tous les créneaux sont des gaps ; sinon un créneau est un gap si `count < threshold × dayMax` — `gaps/route.ts`.
- `DAY_NAMES` inutilisé supprimé.

**INTERPRÉTATION** : la notion de « gap » est « personne n'est dispo » ; une plage où 1 membre sur 20 est dispo n'est pas un gap, alors qu'opérationnellement elle est quasi inutilisable pour un atelier. Le seuil relatif permet de la considérer comme telle.

**RECO** (déclencheur mesurable) : ✅ **clôturé** — seuil activé et exposé (`?threshold=`). Prochaine étape UI : un contrôle admin pour régler le seuil sans URL (dès le prochain atelier annulé pour sous-effectif).

## 8. Audit de la probabilité de présence (ALG-006)

**FAIT** :
- Prior = `clamp(0.3 + mass/60, 0.25, 0.85)` ; sans historique `p = prior` ; avec historique `p = 0.3·prior + 0.7·(1+s)/(2+n)`.
- Poids unique par utilisateur, identique pour tous ses créneaux (ALG-010).

**INTERPRÉTATION** :
- Le prior est dérivé d'une **déclaration** (masse horaire), pas d'une observation → biais d'auto-évaluation possible.
- Pas de composante temporelle : pᵢ ne distingue pas 2 h le mardi de 2 h le dimanche.
- Plafond 0.85 : un membre d'une fiabilité parfaite ne peut dépasser 0.85, ce qui **aplatit le pouvoir discriminant** en haut de l'échelle.

**RECO** (déclencheur mesurable) : dès que le dataset d'assiduité atteint ≥ 30 ateliers validés par membre (mesure : `n = present+absent` médian), envisager (a) une fenêtre glissante de récence, (b) un ajustement du plafond à 0.95 avec seuil de confiance basé sur n (intervalle Beta), (c) des poids par tranche horaire si les données le supportent.

## 9. Audit de la masse horaire (ALG-007)

**FAIT** : fusion d'intervalles par jour (chevauchement/toucher) puis arrondi global à 0.5 h.

**INTERPRÉTATION** : définition robuste (pas de double-compte), mais **incohérente** avec `computeStats` (ALG-012) qui, lui, additionnait les durées brutes sans fusion — deux chiffres « d'heures » différents selon l'écran.

**RECO** (déclencheur mesurable) : ✅ **clôturé** — `computeStats` réutilise désormais ALG-007 (`computeMassHours`) pour `hours`/`minutes` et le `bestDay` (fusion par jour) : un seul chiffre source de vérité. `avgSlotMinutes` reste la moyenne brute des créneaux déclarés (sémantique distincte).

## 10. Audit des fuseaux horaires (ALG-008)

**FAIT** :
- Référentiel unique `Africa/Porto-Novo` ; fast-path arithmétique quand tout le monde est dans ce fuseau.
- Conversion complète : 6 appels `formatToParts` par dispo, cache `dtfCache`.
- Fenêtre franchissant minuit dans le référentiel : `endMin` borné à 1440.

**INTERPRÉTATION** :
- Cohorte actuelle quasi mono-fuseau → fast-path activé presque tout le temps → **rapide aujourd'hui**.
- Si la cohorte devenait multi-fuseaux (ex. diaspora), la conversion complète devient le **principal goulot** : mesuré ≈ 85 ms/1 000 dispo (~8.5 s pour 100 k) — 55× plus lent que le fast-path.

**RECO** (déclencheur mesurable) : dès que ≥ 5 % des dispo sont hors référentiel (mesure : ratio dispo converties), (a) pré-calculer les offsets à la **semaine** (une fois par semaine et par fuseau) au lieu de par dispo, (b) indexer la conversion dans un job/worker, (c) prévoir des fenêtres multi-jours.

## 11. Comparaison des approches de scheduling (détail dans ALGORITHM_COMPARISON.md)

**FAIT** : approche actuelle = « **weighted scoring + WIS** », exacte pour SON objectif (Σ poids de fenêtres non chevauchantes par jour) mais sans contraintes métier.

**INTERPRÉTATION** : les alternatives lourdes (CP-SAT, MILP, MaxSAT) apportent de la valeur **seulement si** on ajoute des contraintes (capacités, budgets, conflits, équité). Sur le problème actuel (12 fenêtres/jour), elles seraient du gaspillage pur. La littérature (arXiv 2024-2026, scheduling de réunions B2B) confirme : les encodeurs SAT/MaxSAT et CP battent les heuristiques **dès que** des contraintes de conflit/idle-time apparaissent ; pour 2 000 shifts × 100 employés, CP-SAT crée ~200 000 booléens vs 2 000 variables pour un framework à variables de planification (Timefold).

## 12. Benchmarks (détail dans ALGORITHM_BENCHMARK.md)

Résumé (mono-thread, best-of-5, machine locale, données synthétiques) :

| N dispo | computeScheduling (smooth ON) | computeMassHours | convertToReference (fast-path) | convertToReference (4 fuseaux) |
|---|---|---|---|---|
| 100 | 0.7 ms | 0.2 ms | 0.2 ms | 7.2 ms |
| 1 000 | 1.3 ms | 2.1 ms | 1.4 ms | 75 ms |
| 10 000 | 17 ms | 22 ms | 12 ms | 719 ms |
| 100 000 | 216 ms | 211 ms | 153 ms | 8 546 ms |
| 500 000 | 985 ms | 1 280 ms | — | — |

Scalabilité linéaire O(A) pour tout le pipeline mono-fuseau ; constant pour KDE ; O(1) pour `presenceProbability`.

## 13. Scalabilité (10 / 100 / 1 000 / 10 000 / 100 000 utilisateurs)

| Échelle (membres) | Dispo estimées (×12) | Temps pipeline estimé (mono-fuseau) | Verdict |
|---|---|---|---|
| 10 | ~120 | ~0.2 ms | trivial |
| 100 | ~1 200 | ~2 ms | trivial |
| 1 000 | ~12 000 | ~20 ms | OK, cache TTL suffit |
| 10 000 | ~120 000 | ~250 ms | limite du synchronisme ; prévoir précalcul/job |
| 100 000 | ~1 200 000 | ~2,5 s + DB | **exige** un précalcul asynchrone + cache persistant |

**INTERPRÉTATION** : le goulot est la **lecture DB + conversion de fuseaux**, pas les algorithmes (tous O(A)). Le cache mémoire TTL 4 s ne passe pas à l'échelle (per-instance, pas d'invalidation).

**RECO** (déclencheur mesurable) : au-delà de ~5 000 membres (mesure : `user` actifs avec dispo), passer à (a) une agrégation pré-calculée par semaine (matérialisée à la validation hebdo, modèle `weekSnapshot` déjà présent), (b) cache Redis avec invalidation sur écriture, (c) pagination côté DB.

## 14. Choix technologiques

**FAIT** : aucune lib d'optimisation ; implémentation TS pure, testable. Prisma côté données, Next.js route handlers.

**INTERPRÉTATION** : bon choix pour la taille du problème ; l'ajout d'OR-Tools nécessiterait un service Node addon (or-tools est C++/Python) — coût d'intégration élevé sans bénéfice démontré. Timefold (Java) est hors stack. Une implémentation TS pure des contraintes simples (budgets, capacité pondérée) suffit jusqu'à ~10 k membres.

## 15. Qualité des données

**FAIT (mise à jour)** :
- La masse horaire (prior) provient d'une **déclaration** non vérifiée.
- `history/route.ts` : `coveragePercent` était divisé par une constante magique **« 40 »** — désormais **référence dynamique** (max de créneaux observé par membre cette semaine, borné à 100).
- Les créneaux `groupId = null` sont considérés « globaux » dans toute portée.
- Validation hebdo fige les données → bonne qualité une fois validé, mais aucune donnée sur l'usage réel des créneaux recommandés (feedback atelier partiel : `workshops/[id]/feedback`).

**RECO** (déclencheur mesurable) : ✅ **clôturé** (constante « 40 » remplacée). Reste ouvert : collecter le feedback des ateliers pour **calibrer pᵢ** sur l'usage réel.

## 16. Explicabilité

**FAIT (mise à jour)** : la recommandation expose `available` (float), `percent`, **`expectedAttendance`** (somme des probabilités = `available`, renommé explicitement), **`coveragePercent`** (couverture relative à la cohorte = `memberCount/totalMembers`), **`memberCount`** (membres distincts couvrant le créneau), **`topContributors`** (top-3 membres + leur pᵢ, triés par poids décroissant) et **`factors`** (liste extensible de raisons du classement : couverture, présence attendue, fiabilité du top — préférences/conflits/pénalités à venir en V2). La heatmap expose désormais `memberCount` par cellule en plus de `count` (somme pondérée) — `src/lib/scheduling.ts`.

**INTERPRÉTATION** : pour un admin, « 13.94 » n'est pas décidable. `memberCount` (personnes) vs `expectedAttendance` (somme des pᵢ) séparent le comptage de l'espérance ; `factors` rend le classement contestable. La confiance est déductible (`percent × available/totalMembers`).

**RECO** (déclencheur mesurable) : ✅ **clôturé** — champs ajoutés au payload `recommendation` (coût O(S·topK), négligeable) et affichés dans le cockpit (membres couvrants / présence attendue / couverture + pastilles de facteurs). V2-01 livré : score composé `computeSlotScore` (`src/lib/scoring.ts`, conception `docs/scheduling-score.md`) — config par défaut = Σ pᵢ (parité testée), `score` + `scoreBreakdown` exposés, termes inactifs à poids 0.

## 17. Tests

**FAIT (mise à jour)** : une suite de tests unitaires existe désormais dans `test/` (`ownership-unavailability.test.ts`, `reliability.test.ts` — 10 cas, `npm test` ✅, ajoutée en `b0bffbd`). Il manque encore les cas des **fonctions pures scheduling** (WIS, fusion d'intervalles, fast-path fuseaux, `expandPatterns`, `detectGaps`).

**INTERPRÉTATION** : les fonctions pures (ALG-001 à ALG-008) sont idéalement testables ; couvrir celles du moteur de scheduling est la prochaine étape pour éliminer le risque de régression silencieuse (ex. le seuil `detectGaps` mort).

**RECO** (déclencheur mesurable, sans sur-ingénierie) : étendre la suite aux fonctions `src/lib/scheduling.ts` et `src/lib/timezone.ts` (≥ 8 cas : couverture partielle, chevauchement mass, fast-path fuseaux, WIS, Beta-binomiale, rounding). Critère de « done » : `npm test` passe avant chaque déploiement.

## 18. Performances opérationnelles

- Pipeline scheduling : O(A), mesuré ~1.3 ms pour 1 000 dispo (mono-fuseau) — **excellent** pour la cohorte actuelle.
- DB : chargement de **toutes** les dispo + attendances de la cohorte à chaque requête non en cache (pas de pagination ni index dédié vérifié) — principal coût réel.
- Cache TTL 4 s : amortit mais pas d'invalidation → données potentiellement périmées pendant 4 s (acceptable pour une planification hebdo).

## 19. Accessibilité (interface)

**FAIT** (constat global, hors périmètre algorithmique) : heatmap colorée sans alternative textuelle structurée ; pas de test d'accessibilité (aucun test automatisé).

## 20. Accessibilité internationale (i18n)

**FAIT** : fuseaux gérés (ALG-008), libellés en français codés en dur (`DAY_NAMES` dans `gaps/route.ts`, insights `use-admin-insights.ts`). Pas de framework i18n.

**INTERPRÉTATION** : hors portée algorithmique mais la gestion multi-fuseaux est le seul point sensible (voir §10).

## 21. Limitations et pièges identifiés

1. ~~`available` = somme de probabilités, sémantique trompeuse~~ ✅ **corrigé** — `expectedAttendance` exposé séparément de `memberCount` (V1.1-03).
2. ~~`percent` basé sur `totalMembers`, pas sur la couverture réelle~~ ✅ **corrigé** — `coveragePercent` (couverture réelle) exposé séparément.
3. ~~Seuil `detectGaps` déclaré mais inutilisé~~ ✅ **corrigé** — seuil relatif activé (`?threshold=`, clampé 0–1).
4. ~~Clé de cache incomplète (pas de `smooth`)~~ ✅ **corrigé** — `smooth` inclus dans la clé (`admin/scheduling/route.ts`, commit `9a38e6e`).
5. ~~Constante « 40 » dans la couverture hebdo~~ ✅ **corrigé** — référence dynamique (max observé par membre).
6. WIS par jour sans budget hebdomadaire ni anti-surcharge.
7. Poids pᵢ identique pour tous les créneaux d'un membre.
8. ~~Double définition des « heures » (fusionnée vs brute)~~ ✅ **corrigé** — `computeStats` réutilise ALG-007.
9. `computeMassHours` arrondi global à 0.5 h (masque les petites variations).
10. Conversion complète des fuseaux 55× plus lente que le fast-path.

## 22. Recommandations priorisées

| # | Reco | Effort | Impact | Déclencheur mesurable |
|---|------|--------|--------|----------------------|
| R1 | Rendre le seuil `detectGaps` effectif | Faible | Moyen | ✅ **clôturé** |
| R2 | Exposer `memberCount` + `topContributors` | Faible | Moyen | ✅ **clôturé** |
| R3 | Corriger la clé de cache (`smooth`) | Faible | Faible | ✅ **clôturé** (`9a38e6e`) |
| R4 | Réutiliser ALG-007 dans `computeStats` | Faible | Faible | ✅ **clôturé** |
| R5 | Sourcer/remplacer la constante « 40 » | Faible | Moyen | ✅ **clôturé** |
| R6 | Tests unitaires des fonctions pures | Moyen | Élevé | ✅ **partiel** — 10 tests passent (`b0bffbd`), couverture du moteur scheduling à compléter |
| R7 | Budget hebdo par membre + capacité pondérée | Moyen | Élevé | ≥ 2 ateliers/semaine planifiés |
| R8 | Pré-calcul hebdo + cache persistant | Élevé | Élevé | > 5 000 membres actifs |
| R9 | Calibrer pᵢ sur le feedback atelier | Élevé | Moyen | n médian ≥ 30 par membre |

## 23. Feuille de route (détail : ALGORITHM_ROADMAP.md)

**CURRENT** (recommandation scoring + WIS + Beta-binomiale) est **adapté** à la cohorte actuelle et **suffisant** en l'état. Améliorations par paliers : QUICK WINS (R1-R5 ✅ **clôturés**, R6 partiel — 10 tests ✅, couverture du moteur scheduling à compléter) → V2 contraintes métier (R7) → V3 échelle (R8, R9). Aucun solveur externe avant que le problème ne devienne réellement contraint (voir §24).

## 24. Résumé (verdict)

1. **Le moteur actuel est correct pour son objectif déclaré** (WIS optimal) et **très performant** (O(A), < 2 ms à l'échelle actuelle).
2. **Ce n'est pas encore un « solver » de planification** : aucune contrainte métier (capacité, conflits, équité, budgets) n'entre dans la recommandation — ce sont des pièges opérationnels, pas des bugs de calcul.
3. **Le principal risque de scalabilité est la conversion de fuseaux** et la lecture DB, pas les algorithmes.
4. **La valeur immédiate** est dans la correction de défauts de sémantique (champ `count`, `percent`, seuil mort, constante 40) et l'ajout de tests.
5. **Un solveur externe (CP-SAT/MILP/MaxSAT) n'est pas justifié aujourd'hui** ; il le deviendra si la planification devient multi-ateliers contrainte (R7) et que la taille dépasse les capacités d'une heuristique simple.
