# ALGORITHM_COMPARISON.md — Benchmark des approches algorithmiques alternatives

> Référence croisée avec ALGORITHM_AUDIT.md §11  
> Aucune modification de code.

---

## 1. Problème actuel

HashCode Sync résout aujourd'hui :

> **Given:** N membres, chacun avec un ensemble d'intervalles de disponibilité (jour, start, end) et un poids pᵢ ∈ [0,1].  
> **Find:** Jusqu'à 6 créneaux de `windowHours` heures, non chevauchants par jour, maximisant Σ pᵢ.

**C'est un Weighted Interval Scheduling (WIS) par jour, dégénéré:**
- Pas de contraintes métier (capacité, rôles, équité).
- Pas de planification multi-événements.
- Le problème est exact et polynomial.

---

## 2. État de l'art 2024-2026

### Sources consultées

| Source | Domaine | Pertinence |
|---|---|---|
| [Google OR-Tools CP-SAT](https://developers.google.com/optimization) | CP / CP-SAT | ⭐⭐⭐⭐⭐ |
| [Timefold](https://timefold.ai/docs) | Constraint Solver (Java) | ⭐⭐⭐⭐ |
| [IBM CPLEX](https://www.ibm.com/products/ilog-cplex-optimization-studio) | MILP | ⭐⭐⭐ |
| [arXiv 2024-2026 — meeting scheduling](https://arxiv.org/search/?query=meeting+scheduling&searchtype=all) | Recherche académique | ⭐⭐⭐ |
| [IEEE/ACM — scheduling algorithms](https://ieeexplore.ieee.org/document/935009) | Recherche académique | ⭐⭐ |
| [GA for scheduling survey](https://ieeexplore.ieee.org/document/935009) | Genetic Algorithms | ⭐ |

---

## 3. Comparaison détaillée des approches

### A. Greedy / Heuristics

| Critère | Évaluation |
|---|---|
| **Problème adapté** | Sélection rapide de créneaux populaires sans garantie d'optimalité |
| **Avantages** | Simple, rapide, déterministe |
| **Inconvénients** | Pas de garantie d'optimalité, peut bloquer sur des optimums locaux |
| **Complexité** | O(n log n) |
| **Qualité** | 60-80% de l'optimal pour des instances simples |
| **Performance** | Excellente |
| **Scalabilité** | Excellente |
| **Intégration** | Très facile (déjà partiellement présent) |
| **Maintenabilité** | Excellente |
| **Explicabilité** | Excellente |
| **Pertinence HashCode Sync** | ✅ **Actuellement suffisant** pour le problème sans contraintes |

**Verdict:** Le système actuel EST une heuristique greedy + WIS optimal. C'est la bonne approche pour la taille actuelle.

---

### B. Weighted Scoring

| Critère | Évaluation |
|---|---|
| **Problème adapté** | Ranking de créneaux selon un score composite |
| **Avantages** | Extensible, explicable, facile à calibrer |
| **Inconvénients** | Pas de garantie d'optimalité, les poids sont arbitraires |
| **Complexité** | O(n) |
| **Qualité** | Dépend de la calibration des poids |
| **Performance** | Excellente |
| **Scalabilité** | Excellente |
| **Intégration** | Très facile |
| **Maintenabilité** | Excellente |
| **Explicabilité** | Excellente |
| **Pertinence HashCode Sync** | ✅ **Recommandé en V2** pour ajouter des dimensions (mentor, capacité, équité) |

**Verdict:** Amélioration naturelle du scoring actuel. Permet d'ajouter des dimensions sans changer d'algorithme.

---

### C. Bipartite Matching

| Critère | Évaluation |
|---|---|
| **Problème adapté** | Affectation membre ↔ atelier (1:1) |
| **Avantages** | Optimal pour matching parfait, algorithmes efficents (Hopcroft-Karp O(E√V)) |
| **Inconvénients** | Nécessite une bipartition stricte, pas de contraintes complexes |
| **Complexité** | O(E√V) |
| **Qualité** | Optimal pour le matching |
| **Performance** | Excellente |
| **Scalabilité** | Excellente jusqu'à 10k nœuds |
| **Intégration** | Moyenne (nécessite refactoring du modèle) |
| **Maintenabilité** | Bonne |
| **Explicabilité** | Bonne |
| **Pertinence HashCode Sync** | ⚠️ **Pas directement applicable** — le problème n'est pas un matching bipartite (un membre couvre plusieurs créneaux, un créneau couvre plusieurs membres) |

**Verdict:** Pas pertinent pour le problème de sélection de créneaux. Pourrait être utile pour l'affectation membre ↔ atelier une fois les créneaux choisis.

---

### D. Maximum Weight Matching

| Critère | Évaluation |
|---|---|
| **Problème adapté** | Matching bipartite avec poids |
| **Avantages** | Optimal, gère les poids |
| **Inconvénients** | Même limitation que bipartite matching |
| **Complexité** | O(V³) (Hungarian) ou O(E√V log V) |
| **Qualité** | Optimal |
| **Performance** | Bonne pour V < 1000 |
| **Scalabilité** | Moyenne |
| **Intégration** | Moyenne |
| **Maintenabilité** | Bonne |
| **Explicabilité** | Bonne |
| **Pertinence HashCode Sync** | ⚠️ **Pas directement applicable** — voir C |

**Verdict:** Même limitation que C. Utile pour une étape d'affectation, pas pour la sélection de créneaux.

---

### E. Min-Cost Max-Flow

| Critère | Évaluation |
|---|---|
| **Problème adapté** | Affectation avec contraintes de capacité, flux réseau |
| **Avantages** | Gère les capacités, les coûts, les flux |
| **Inconvénients** | Complexe à modéliser, surkill pour le problème actuel |
| **Complexité** | O(V²E) avec Edmonds-Karp |
| **Qualité** | Optimal |
| **Performance** | Bonne pour petits graphes |
| **Scalabilité** | Moyenne |
| **Intégration** | Difficile |
| **Maintenabilité** | Moyenne |
| **Explicabilité** | Moyenne |
| **Pertinence HashCode Sync** | ❌ **Sur-engineering** — le problème actuel n'a pas de flux ni de capacités à optimiser |

**Verdict:** Inutilement complexe pour le problème actuel. Pertinent seulement si on modélise un réseau de flux (ex: membres → créneaux → ateliers avec capacités).

---

### F. Interval Scheduling

| Critère | Évaluation |
|---|---|
| **Problème adapté** | Sélection de créneaux non chevauchants |
| **Avantages** | Optimal, simple, bien compris |
| **Inconvénients** | Pas de poids, pas de contraintes complexes |
| **Complexité** | O(n log n) avec tri + glouton |
| **Qualité** | Optimal pour la maximisation du nombre de créneaux |
| **Performance** | Excellente |
| **Scalabilité** | Excellente |
| **Intégration** | Très facile |
| **Maintenabilité** | Excellente |
| **Explicabilité** | Excellente |
| **Pertinence HashCode Sync** | ✅ **Déjà utilisé (WIS est une extension pondérée)** |

**Verdict:** C'est exactement ce que fait le système actuel (ALG-005). C'est la bonne approche pour la sélection de créneaux non chevauchants.

---

### G. Constraint Programming (CP)

| Critère | Évaluation |
|---|---|
| **Problème adapté** | Satisfaction de contraintes complexes, optimisation multi-objectifs |
| **Avantages** | Très expressif, gère nativement les contraintes métier |
| **Inconvénients** | Courbe d'apprentissage, surkill pour problèmes simples |
| **Complexité** | Dépend du solveur (exponentielle dans le pire cas) |
| **Qualité** | Optimal ou meilleure borne |
| **Performance** | Bonne pour contraintes moyennes |
| **Scalabilité** | Bonne jusqu'à ~1000 variables |
| **Intégration** | Difficile (nécessite OR-Tools, Choco, etc.) |
| **Maintenabilité** | Moyenne (langage de contraintes spécifique) |
| **Explicabilité** | Moyenne (les solveurs CP sont des "boîtes noires" relatives) |
| **Pertinence HashCode Sync** | ⭐ **Pertinent en V2** si ≥ 3 contraintes métier actives |

**Verdict:** Devient pertinent quand les contraintes métier (capacité, rôles, équité, budgets) dépassent ce qu'une heuristique peut gérer proprement. Google OR-Tools CP-SAT est la référence 2026.

---

### H. CP-SAT / OR-Tools

| Critère | Évaluation |
|---|---|
| **Problème adapté** | COP (Constraint Optimization Problem) avec variables entières |
| **Avantages** | Optimal ou meilleure borne, gère contraintes linéaires, propagations |
| **Inconvénients** | Courbe d'apprentissage, intégration complexe (C++/Python), taille du problème |
| **Complexité** | Exponentielle (pire cas), mais très efficace en pratique |
| **Qualité** | Excellente (optimal ou near-optimal) |
| **Performance** | Bonne pour 100-1000 variables, dégrade au-delà |
| **Scalabilité** | Moyenne |
| **Intégration** | Difficile (nécessite service séparé ou WASM) |
| **Maintenabilité** | Moyenne |
| **Explicabilité** | Moyenne |
| **Pertinence HashCode Sync** | ⭐ **Pertinent en V3** si le problème devient multi-contraintes et multi-événements |

**Verdict:** La référence pour l'optimisation sous contraintes en 2026. Pertinent seulement si le problème actuel (12 fenêtres × 7 jours) devient un problème de planification multi-ateliers avec contraintes. Pour le problème actuel, c'est du sur-engineering.

---

### I. MILP / Integer Programming

| Critère | Évaluation |
|---|---|
| **Problème adapté** | Problèmes d'affectation binaire, optimisation linéaire |
| **Avantages** | Optimal, mature, nombreuses solveurs |
| **Inconvénients** | Modélisation complexe, dégradation au-delà de 1000 variables |
| **Complexité** | NP-hard (pire cas) |
| **Qualité** | Excellente |
| **Performance** | Bonne pour petits problèmes |
| **Scalabilité** | Faible au-delà de 1000 variables |
| **Intégration** | Difficile |
| **Maintenabilité** | Moyenne |
| **Explicabilité** | Bonne (formulation mathématique) |
| **Pertinence HashCode Sync** | ❌ **Sur-engineering** — CP-SAT est préférable pour ce type de problème |

**Verdict:** MILP est moins adapté que CP-SAT pour les problèmes de scheduling avec contraintes discrètes. CP-SAT (qui est un solver SAT + IP hybride) est préférable.

---

### J. Timefold / Constraint Solver

| Critère | Évaluation |
|---|---|
| **Problème adapté** | Planning et scheduling complexes (employés, shifts, ressources) |
| **Avantages** | Spécialisé scheduling, API Java/TS, scalable |
| **Inconvénients** | Java-centric, courbe d'apprentissage, overkill pour petits problèmes |
| **Complexité** | Dépend du problème |
| **Qualité** | Excellente |
| **Performance** | Excellente (basé sur OptaPlanner) |
| **Scalabilité** | Excellente |
| **Intégration** | Difficile (Java/TS bridge) |
| **Maintenabilité** | Moyenne |
| **Explicabilité** | Bonne (explication des contraintes violées) |
| **Pertinence HashCode Sync** | ⚠️ **Pertinent en V3** si le problème devient un vrai planning de ressources |

**Verdict:** Très bon outil mais hors stack actuelle (TypeScript/Node.js). Nécessiterait un service séparé. Pertinent pour une scale-up avec planning complexe.

---

### K. Genetic Algorithms

| Critère | Évaluation |
|---|---|
| **Problème adapté** | Optimisation multi-objectifs, espaces de recherche vastes |
| **Avantages** | Explore bien l'espace, parallélisable |
| **Inconvénients** | Non déterministe, pas de garantie d'optimalité, paramètres à calibrer |
| **Complexité** | O(générations × population × fitness) |
| **Qualité** | Variable (dépend de la fonction de fitness) |
| **Performance** | Moyenne |
| **Scalabilité** | Moyenne |
| **Intégration** | Moyenne |
| **Maintenabilité** | Faible (paramètres magiques) |
| **Explicabilité** | Faible (non déterministe) |
| **Pertinence HashCode Sync** | ❌ **Non pertinent** — pas de preuve de supériorité sur CP-SAT/WIS pour ce type de problème |

**Verdict:** Les GAs sont utiles pour des problèmes sans structure exploitable (ex: NAS, feature selection). Pour le scheduling avec contraintes, CP-SAT est préférable.

---

### L. Simulated Annealing

| Critère | Évaluation |
|---|---|
| **Problème adapté** | Optimisation locale, grands espaces de recherche |
| **Avantages** | Simple à implémenter, échappe aux optimums locaux |
| **Inconvénients** | Non déterministe, lent, paramètres à calibrer |
| **Complexité** | O(iterations × voisins) |
| **Qualité** | Variable |
| **Performance** | Moyenne |
| **Scalabilité** | Moyenne |
| **Intégration** | Facile |
| **Maintenabilité** | Moyenne |
| **Explicabilité** | Faible |
| **Pertinence HashCode Sync** | ❌ **Non pertinent** — même motif que GA |

**Verdict:** Même limitation que GA. Pour le problème actuel, WIS est optimal et déterministe.

---

### M. Local Search

| Critère | Évaluation |
|---|---|
| **Problème adapté** | Affinage d'une solution existante |
| **Avantages** | Rapide, simple, bon pour le refining |
| **Inconvénients** | Dépend de la solution initiale, optimum local |
| **Complexité** | O(iterations × voisins) |
| **Qualité** | Bonne pour refining |
| **Performance** | Excellente |
| **Scalabilité** | Excellente |
| **Intégration** | Facile |
| **Maintenabilité** | Bonne |
| **Explicabilité** | Bonne |
| **Pertinence HashCode Sync** | ⭐ **Pertinent en V2** comme post-processeur après WIS pour respecter des contraintes souples |

**Verdict:** Intéressant comme couche d'affinage après WIS pour gérer des contraintes souples (équité, diversification) sans changer le solveur principal.

---

### N. Multi-objective Optimization

| Critère | Évaluation |
|---|---|
| **Problème adapté** | Optimisation de plusieurs objectifs conflictuels (ex: couverture vs équité) |
| **Avantages** | Formalisme rigoureux, Pareto optimal |
| **Inconvénients** | Complexe à implémenter, explosion combinatorial |
| **Complexité** | Dépend du nombre d'objectifs |
| **Qualité** | Excellente (Pareto front) |
| **Performance** | Moyenne |
| **Scalabilité** | Moyenne |
| **Intégration** | Difficile |
| **Maintenabilité** | Faible |
| **Explicabilité** | Moyenne |
| **Pertinence HashCode Sync** | ⚠️ **Pertinent en V3** si les objectifs deviennent conflictuels (ex: maximiser couverture ET équité) |

**Verdict:** Pertinent seulement si le problème devient vraiment multi-objectif avec des trade-offs explicites. Pour l'instant, le problème est mono-objectif (maximiser Σ pᵢ).

---

### O. Hybrid Algorithms

| Critère | Évaluation |
|---|---|
| **Problème adapté** | Combinaison de plusieurs approches pour couvrir différents aspects |
| **Avantages** | Flexibilité, meilleure couverture des besoins |
| **Inconvénients** | Complexité accrue, risque de sur-engineering |
| **Complexité** | Dépend des composants |
| **Qualité** | Potentiellement excellente |
| **Performance** | Variable |
| **Scalabilité** | Variable |
| **Intégration** | Difficile |
| **Maintenabilité** | Faible |
| **Explicabilité** | Faible |
| **Pertinence HashCode Sync** | ⭐ **Architecture cible recommandée** (voir ALGORITHM_ROADMAP.md) |

**Verdict:** L'architecture hybride (Weighted Scoring + Local Search + WIS) est la meilleure approche pour évoluer sans sur-engineering.

---

## 4. Matrice de décision

| Algorithme | Besoin actuel | Complexité | Performance | Qualité | Scalabilité | Intégration | Recommandation |
|---|---|---|---|---|---|---|---|
| **WIS (actuel)** | 5 | 3 | 5 | 5 | 4 | 5 | **5 — Conserver** |
| **Weighted Scoring** | 4 | 5 | 5 | 4 | 5 | 5 | **5 — Ajouter en V2** |
| **Local Search** | 3 | 4 | 4 | 4 | 5 | 4 | **4 — Ajouter en V2** |
| **CP-SAT** | 2 | 2 | 3 | 5 | 3 | 2 | **3 — Ajouter en V3 si trigger** |
| **CP (générique)** | 2 | 2 | 3 | 4 | 3 | 2 | **2 — Évaluer en V3** |
| **MILP** | 1 | 2 | 2 | 5 | 2 | 2 | **1 — Éviter** |
| **Min-Cost Max-Flow** | 1 | 3 | 4 | 5 | 4 | 3 | **2 — Éviter pour l'instant** |
| **Bipartite Matching** | 1 | 4 | 5 | 5 | 5 | 4 | **1 — Pas applicable** |
| **Max Weight Matching** | 1 | 3 | 4 | 5 | 4 | 3 | **1 — Pas applicable** |
| **Genetic Algorithms** | 1 | 2 | 2 | 2 | 2 | 3 | **0 — Éviter** |
| **Simulated Annealing** | 1 | 2 | 2 | 2 | 2 | 3 | **0 — Éviter** |
| **Multi-objective** | 1 | 2 | 2 | 4 | 2 | 2 | **2 — Évaluer en V3** |
| **Timefold** | 1 | 2 | 4 | 5 | 4 | 1 | **1 — Éviter (hors stack)** |

### Légende

| Score | Signification |
|---|---|
| 5 | Idéal / Parfaitement adapté |
| 4 | Bon / Recommandé |
| 3 | Moyen /acceptable dans certains cas |
| 2 | Faible / À éviter sauf cas spécifique |
| 1 | Inutile / Pas applicable |
| 0 | À ne pas ajouter (sur-engineering) |

---

## 5. Analyse par taille de cohorte

| Taille | N utilisateurs | N slots | Contraintes | Meilleure approche | Pourquoi |
|---|---|---|---|---|---|
| **S** | 10-100 | 1k-10k | 0-1 | WIS + Weighted Scoring | Simple, optimal, suffisant |
| **M** | 100-1k | 10k-100k | 2-3 | WIS + Weighted Scoring + Local Search | Ajouter des dimensions sans solveur lourd |
| **L** | 1k-10k | 100k-1M | 3-5 | CP-SAT ou hybrid solver | Contraintes métier deviennent critiques |
| **XL** | 10k+ | 1M+ | 5+ | CP-SAT + pré-calcul + cache distribué | Nécessite architecture distribuée |

---

## 6. Trigger mesurable pour chaque approche

| Approche | Trigger d'introduction | Métrique |
|---|---|---|
| Weighted Scoring | ≥ 1 contrainte métier non couverte | Nombre de contraintes dans le backlog |
| Local Search | ≥ 2 contraintes souples à équilibrer | Nombre de soft constraints |
| CP-SAT | ≥ 3 contraintes dures + WIS insuffisant | Taux d'échec du WIS à trouver une solution |
| Pré-calcul | > 5 000 membres actifs | Temps de réponse > 500ms |
| Cache distribué | > 10 000 membres actifs | Hit rate cache < 80% |
| Multi-objective | ≥ 2 objectifs conflictuels | Écart entre solutions mono-objectif |

---

## 7. Conclusion

**Le système actuel (WIS + Bayesian weight) est optimal pour le problème qu'il résout.** Les alternatives lourdes (CP-SAT, MILP, GA) ne deviennent pertinentes que lorsque le problème évolue vers un vrai problème de planification multi-contraintes.

**La roadmap recommandée:**
1. **V1 (actuel):** WIS + Weighted Scoring monocritère → suffisant pour N < 1 000.
2. **V2:** Weighted Scoring multicritère + Local Search → suffisant pour N < 10 000 avec contraintes souples.
3. **V3:** CP-SAT (OR-Tools) → seulement si les contraintes dures deviennent nombreuses et que WIS + LS échouent.
