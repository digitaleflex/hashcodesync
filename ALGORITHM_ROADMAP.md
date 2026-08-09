# ALGORITHM_ROADMAP.md — Stratégie d'évolution algorithmique

> Référence croisée avec ALGORITHM_AUDIT.md §23, ALGORITHM_COMPARISON.md  
> Aucune modification de code.

---

## 1. État actuel (V1 — what we have)

### Architecture actuelle

```
Availability Input
        ↓
Normalization (ALG-007)
        ↓
Mass Calculation (ALG-001)
        ↓
Bayesian Weighting (ALG-002)
        ↓
Heatmap Generation (ALG-003 × 168)
        ↓
Smoothing (ALG-006, optionnel)
        ↓
Candidate Slot Generation (ALG-004)
        ↓
Weighted Interval Scheduling (ALG-005, par jour)
        ↓
Ranking (ALG-012)
        ↓
Recommendation Output
```

### Ce qui fonctionne bien

| Composant | Raison |
|---|---|
| ALG-001 (Interval Merge) | Correct, optimal pour la fusion d'intervalles 1D |
| ALG-002 (Bayesian Probability) | Modèle statistique fondé, interprétable |
| ALG-005 (WIS) | Optimal pour la sélection de créneaux non chevauchants |
| ALG-007 (Timezone) | Correct, fast-path efficace pour mono-fuseau |
| ALG-012 (Ranking) | Simple et déterministe |

### Ce qui est fragile

| Composant | Problème | Impact |
|---|---|---|
| ALG-003 (Weighted Counting) | O(n) par cellule, goulot à N > 1k | Performance |
| ALG-005 (WIS par jour) | Pas de vue semaine globale | Optimalité |
| Scoring (monocritère) | Seul weight considéré | Qualité |
| ALG-010 (History) | Coverage % incorrect | Data quality |
| ALG-009 (Gaps) | Seuil mort | Data quality |
| Tests | Aucun test | Régression |

---

## 2. Quick Wins (V1.1 — immédiat, < 1 semaine)

### QW-1: Réparer le seuil `detectGaps`

**Problème:** `threshold = 0.15` déclaré mais jamais utilisé (`gaps/route.ts:41` vs `:62`).  
**Solution:** Brancher le threshold dans la condition `isEmpty` → `count < threshold * maxDayCount`.  
**Effort:** 1 ligne de code.  
**Impact:** Moyen (meilleure détection des zones sous-utilisées).

### QW-2: Corriger la clé de cache

**Problème:** Clé = `windowHours|groupId|activityId`, mais `smooth` n'est pas dans la clé (`admin/scheduling/route.ts:43`).  
**Solution:** Ajouter `smooth` à la clé de cache.  
**Effort:** 2 lignes de code.  
**Impact:** Faible (évite des réponses incohérentes).

### QW-3: Exposer `memberCount` + `topContributors`

**Problème:** L'UI affiche `available` (float) et `percent`, mais pas le nombre de membres couvrant ni leurs contributions.  
**Solution:** Ajouter `memberCount` (entier) et `topContributors: [{userId, weight}]` au payload `recommendation`.  
**Effort:** 5-10 lignes de code.  
**Impact:** Moyen (améliore l'explicabilité).

### QW-4: Remplacer la constante "40"

**Problème:** `coveragePercent = totalAvailabilities / (users * 40)` — "40" est une constante magique (`history/route.ts:104`).  
**Solution:** Calculer le max observé de slots par utilisateur, ou utiliser un pourcentage de couverture basé sur les heures.  
**Effort:** 3-5 lignes de code.  
**Impact:** Moyen (corrige un indicateur de business).

### QW-5: Ajouter des tests unitaires

**Problème:** Aucun test sur les fonctions pures (ALG-001 à ALG-008).  
**Solution:** Ajouter vitest avec ≥ 8 cas par fonction pure.  
**Effort:** 1-2 jours.  
**Impact:** Élevé (prévention des régressions).

### QW-6: Réutiliser `computeMassHours` dans `computeStats`

**Problème:** Deux définitions des "heures" (fusionnée vs brute) (`shared.ts:33`).  
**Solution:** Importer et utiliser `computeMassHours` dans `computeStats`.  
**Effort:** 2 lignes de code.  
**Impact:** Faible (cohérence).

---

## 3. V2 — Contraintes métier (1-2 mois)

### Objectif V2

Ajouter les contraintes métier manquantes sans changer l'algorithme principal (WIS).

### V2-1: Weighted Scoring multicritère

**Problème:** Le scoring actuel est monocritère (Σ pᵢ).  
**Solution:** Ajouter des dimensions explicites :

```
score = w1 * Σ pᵢ                    (couverture)
      + w2 * (mentors_available > 0)  (disponibilité mentor)
      + w3 * capacity_headroom        (marge de capacité)
      + w4 * fairness_bonus           (équité)
      - w5 * conflict_penalty         (pénalité conflit)
```

**Effort:** 2-3 jours.  
**Impact:** Élevé (prend en compte plus de dimensions métier).  
**Dépendances:** Aucune (extension du scoring existant).

### V2-2: Budget hebdomadaire par membre

**Problème:** Le WIS par jour peut sélectionner le même membre tous les jours, causant une surcharge.  
**Solution:** Ajouter un compteur par membre dans la sélection WIS. Après sélection par jour, vérifier que chaque membre n'est pas sélectionné plus de `maxWorkshopsPerWeek` fois. Si violation, replanifier.  
**Effort:** 3-5 jours.  
**Impact:** Élevé (évite la surcharge des membres fiables).

### V2-3: Capacité pondérée

**Problème:** `Workshop.capacity` existe dans le schéma mais n'est pas utilisé dans le scheduling.  
**Solution:** Si `capacity` est définie, pondérer le score par `min(Σ pᵢ, capacity)`.  
**Effort:** 1 jour.  
**Impact:** Moyen (évite de recommander des créneaux surcapacité).

### V2-4: Local Search post-processeur

**Problème:** Le WIS ne gère pas les contraintes souples (équité, diversification).  
**Solution:** Après WIS, appliquer un Local Search pour:
- Swapper des créneaux entre jours pour améliorer l'équité.
- Ajouter de la diversification (éviter 6 créneaux similaires).

**Effort:** 3-5 jours.  
**Impact:** Moyen (améliore la diversité des recommandations).

### V2-5: Préférences explicites

**Problème:** Pas de préférences utilisateur (matin préféré, pas le vendredi, etc.).  
**Solution:** Ajouter un modèle `UserPreference` (jour préféré, heure préférée, type d'activité). Intégrer dans le scoring.  
**Effort:** 3-5 jours.  
**Impact:** Moyen (améliore la satisfaction utilisateur).

---

## 4. V3 — Optimisation avancée (3-6 mois)

### Objectif V3

Introduire un solveur d'optimisation pour gérer un nombre important de contraintes métier.

### V3-1: CP-SAT (Google OR-Tools)

**Problème:** Le Weighted Scoring + WIS ne peut pas gérer des contraintes complexes (ex: "au moins 1 mentor par atelier", "pas plus de 2 ateliers par jour pour un membre", "équité de participation").  
**Solution:** Introduire OR-Tools CP-SAT comme solveur alternatif quand le problème dépasse les capacités du WIS.  
**Modélisation:**
- Variables binaires: `x[i,d,s] = 1` si le membre i est assigné au créneau (jour d, start s).
- Contraintes: couverture, capacité, budgets, rôles.
- Objectif: maximiser Σ pᵢ × x[i,d,s].

**Trigger d'introduction:**
- ≥ 3 contraintes dures actives.
- WIS + Weighted Scoring échoue à trouver une solution > 30% du temps.
- N ≥ 5 000 membres.

**Effort:** 2-4 semaines.  
**Impact:** Élevé (résout des problèmes impossibles avec WIS).  
**Risques:**
- Courbe d'apprentissage CP-SAT.
- Intégration complexe (C++/Python → Node.js via service séparé ou WASM).
- Temps de résolution non garanti pour grandes instances.

### V3-2: Pré-calcul hebdomadaire + cache distribué

**Problème:** À N > 5 000, le pipeline scheduling devient lent (DB + conversion).  
**Solution:**
- Matérialiser la heatmap dans `WeekSnapshot` (déjà présent dans le schéma).
- Calculer la heatmap une fois par semaine (lors de la validation).
- Stocker dans Redis avec invalidation sur écriture.

**Trigger:** Temps de réponse > 500ms pour N > 5 000.  
**Effort:** 1-2 semaines.  
**Impact:** Élevé (scalabilité horizontale).

### V3-3: Calibration bayésienne avancée

**Problème:** Le modèle `presenceProbability` n'est pas calibré sur les données réelles.  
**Solution:**
- Fenêtre glissante de récence (ex: 3 derniers mois).
- Intervalle de confiance Beta (bornes sup/inf de pᵢ).
- Ajustement du prior par tranche horaire si les données le supportent.

**Trigger:** n médian ≥ 30 par membre.  
**Effort:** 1 semaine.  
**Impact:** Moyen (meilleure estimation de pᵢ).

---

## 5. V4 — Futur expérimental

### V4-1: Prédiction de présence (ML)

**Problème:** pᵢ est estimé par un modèle bayésien simple. Un modèle ML pourrait capturer des patterns complexes (heure, jour, type d'atelier, historique récent).  
**Solution:** Modèle de classification (XGBoost, LightGBM) pour prédire la présence. Features: heure, jour, type d'activité, historique récent, masse horaire, préférences.  
**Prérequis:**
- ≥ 1 000 ateliers planifiés avec données de présence.
- Pipeline de feature engineering + training + serving.

**Effort:** 4-8 semaines.  
**Impact:** Potentiellement élevé (meilleure prédiction).  
**Risque:** Over-engineering si les données sont insuffisantes.

### V4-2: Optimisation adaptative

**Problème:** Les poids du scoring sont fixes (w1, w2, w3...).  
**Solution:** Apprendre les poids par optimisation bayésienne ou reinforcement learning, en fonction du taux de présence réel des ateliers planifiés.  
**Prérequis:** Même que V4-1 + feedback loop automatisée.

### V4-3: Scheduling prédictif

**Problème:** Le système réagit aux disponibilités déclarées.  
**Solution:** Proposer des créneaux proactifs basés sur les patterns historiques (ex: "Mardi 14h a fonctionné 80% du fois").

---

## 6. Architecture cible recommandée

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Next.js Routes)               │
├─────────────┬──────────────┬──────────────┬─────────────────┤
│             │              │              │                 │
│  admin/scheduling    mentor/scheduling   gaps     history     │
│             │              │              │                 │
├─────────────┴──────────────┴──────────────┴─────────────────┤
│                    Scheduling Engine (src/lib/)             │
├─────────────┬──────────────┬──────────────┬─────────────────┤
│             │              │              │                 │
│  Input      │  Normalizer  │  Scorer      │  Optimizer      │
│  Adapter    │  (ALG-007)   │  (V2: multi) │  (ALG-005/V3)   │
│             │              │              │                 │
├─────────────┴──────────────┴──────────────┴─────────────────┤
│                    Data Layer                               │
├─────────────┬──────────────┬──────────────┬─────────────────┤
│  Prisma     │  Cache       │  Pre-compute │  ML Model       │
│  (Postgres) │  (Redis)     │  (WeekSnap)  │  (V4: optional) │
└─────────────┴──────────────┴──────────────┴─────────────────┘
```

### Responsabilités par composant

| Composant | Responsabilité | Algorithme | Complexité |
|---|---|---|---|
| Input Adapter | Fetch + format données | Prisma queries | O(N) |
| Normalizer | Timezone, validation | ALG-007 | O(N) |
| Scorer | Calcul du score multicritère | Weighted Scoring | O(N) |
| Optimizer | Sélection des créneaux optimaux | ALG-005 (V1-2) / CP-SAT (V3) | O(n²) / CP |
| Cache Layer | Réduction des recalculs | TTL + invalidation | O(1) |
| Pre-compute | Heatmap hebdomadaire | ALG-003 + ALG-006 | O(N) |

---

## 7. Migration strategy

### Phase 1: Quick Wins (semaine 1-2)

**Objectif:** Corriger les défauts identifiés sans changer l'architecture.

| Tâche | Fichier | Effort |
|---|---|---|
| Brancher `threshold` dans `detectGaps` | `gaps/route.ts` | 1h |
| Ajouter `smooth` à la clé de cache | `admin/scheduling/route.ts` | 1h |
| Exposer `memberCount` + `topContributors` | `scheduling.ts`, API routes | 4h |
| Remplacer constante "40" | `history/route.ts` | 2h |
| Réutiliser `computeMassHours` dans `computeStats` | `shared.ts` | 1h |
| Ajouter tests vitest | `tests/` (nouveau) | 2j |

### Phase 2: V2 — Contraintes métier (semaine 3-6)

**Objectif:** Ajouter les dimensions manquantes sans solveur externe.

| Tâche | Fichier | Effort |
|---|---|---|
| Weighted Scoring multicritère | `scheduling.ts` (nouvelle fonction) | 3j |
| Budget hebdomadaire par membre | `scheduling.ts`, API routes | 4j |
| Capacité pondérée | `scheduling.ts` | 1j |
| Local Search post-processeur | `scheduling.ts` | 4j |
| Préférences explicites (schéma + API) | Prisma, routes, UI | 5j |

### Phase 3: V3 — Solveur (mois 3-6, conditionnel)

**Objectif:** Introduire CP-SAT seulement si les triggers sont atteints.

| Tâche | Prérequis | Effort |
|---|---|---|
| Évaluer CP-SAT sur données synthétiques | V2 livré, N > 5k | 1j |
| Modéliser le problème en CP-SAT | Évaluation positive | 1sem |
| Intégrer OR-Tools (service séparé) | Modélisation validée | 2sem |
| A/B testing WIS vs CP-SAT | Intégration terminée | 2sem |
| Basculer par feature flag | Tests concluants | 3j |

### Phase 4: V4 — ML (mois 6+, conditionnel)

**Objectif:** Prédiction de présence et optimisation adaptative.

| Tâche | Prérequis | Effort |
|---|---|---|
| Collecter données de présence réelle | ≥ 1 000 ateliers | Continu |
| Entraîner modèle de prédiction | Données suffisantes | 2sem |
| Intégrer dans le pipeline | Modèle validé | 1sem |
| A/B testing | Intégration terminée | 2sem |

---

## 8. Risques de migration

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Over-engineering (CP-SAT trop tôt) | Élevée | Élevé | Respecter les triggers mesurables |
| Régressions algorithmiques | Moyenne | Élevé | Tests unitaires avant chaque migration |
| Dette technique (code dupliqué) | Élevée | Moyen | Refactor progressif (QW-5) |
| Performance dégradée | Moyenne | Moyen | Benchmarks avant/après chaque changement |
| Complexité exponentielle (CP-SAT) | Moyenne | Élevé | Limiter la taille des instances, timeouts |
| Courbe d'apprentissage | Moyenne | Moyen | Documentation + pair programming |

---

## 9. Checklist de validation

### Avant chaque migration

- [ ] Tests unitaires passent (couverture ≥ 80% sur les fonctions modifiées).
- [ ] Benchmark de performance (temps de réponse < seuil défini).
- [ ] Revue de code par un second ingénieur.
- [ ] Feature flag activable/désactivable sans déploiement.

### Triggers mesurables

| Migration | Trigger | Métrique |
|---|---|---|
| QW-1 à QW-6 | Aucun (quick wins) | — |
| V2-1 (Weighted Scoring) | ≥ 1 contrainte métier dans le backlog | Jira ticket |
| V2-2 (Budget hebdo) | ≥ 2 ateliers/semaine planifiés en moyenne | Compteur ateliers |
| V3-1 (CP-SAT) | WIS échoue > 30% du temps OU ≥ 3 contraintes dures | Taux d'échec |
| V3-2 (Pré-calcul) | Temps réponse > 500ms | APM / logs |
| V4-1 (ML) | ≥ 1 000 ateliers avec données de présence | Compteur ateliers |

---

## 10. Conclusion

La roadmap est **incrémentale et conditionnelle**. Chaque étape a un trigger mesurable. Aucun solveur externe n'est introduit avant que le problème actuel ne soit démontré insuffisant.

**Principe directeur:**
> Simplicité maximale + qualité suffisante + évolutivité maîtrisée.
