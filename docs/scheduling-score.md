# Score de créneau multi-critères (V2-01 / issues #52, #53)

> Références : ALGORITHM_ROADMAP.md §3 (V2-1), ALGORITHM_AUDIT.md §16 (explicabilité),
> issue #47 (sémantique memberCount/expectedAttendance/coveragePercent).
> Document de conception — l'implémentation de référence est `src/lib/scoring.ts`.

---

## 1. Objectif

Remplacer le score monodimensionnel `score(slot) = Σ pᵢ` (somme des probabilités de
présence des membres couvrant la fenêtre) par un **score composé pondéré**, intégrable
progressivement, dont chaque terme est normalisé, documenté et décomposable
(explicabilité). Le score ne se substitue pas aux **contraintes** (filtrage) — il
**classe** les créneaux candidats.

## 2. Formule

```
score(slot) = w_cov · f_cov              (couverture / présence attendue)
            + w_men · f_men              (adéquation mentor)
            + w_cap · f_cap              (marge de capacité)
            + w_pref · f_pref            (satisfaction des préférences)
            + w_fair · f_fair            (bonus d'équité)
            − w_conf · f_conf            (pénalité de conflit)
```

- **Défaut (rétrocompat)** : `w_cov = 1`, tous les autres poids à `0` →
  `score = Σ pᵢ`, **strictement identique** au comportement historique (test de parité).
- Chaque terme `f_k` est borné ; la seule exception assumée est `f_cov` qui reste en
  **valeur brute `Σ pᵢ`** pour préserver l'ordonnancement historique (voir §4).

## 3. Les 7 dimensions

| Terme | Symbole | Bornes | Données requises | Dispo | Issue |
|---|---|---|---|---|---|
| Couverture (présence attendue) | `f_cov` | `[0, Σpᵢmax]` (brut) | pᵢ des membres couvrants | **V1 ✅** | #47 |
| Adéquation mentor | `f_men` | `[0,1]` | mentor lié à l'activité + dispo | V2 | #34/#54 |
| Marge de capacité | `f_cap` | `[0,1]` | `Workshop.capacity` | V2 | #55 |
| Préférences membres | `f_pref` | `[0,1]` | modèle `UserPreference` | V2 | #57 |
| Équité | `f_fair` | `[0,1]` | vue semaine globale (WIS multi-créneaux) | V2 | #58 |
| Pénalité conflit | `f_conf` | `[0,1]` | ateliers déjà planifiés dans la fenêtre | V2 | #54 |

## 4. Normalisation par terme

- **`f_cov` (couverture)** — brute : `f_cov = Σ pᵢ` sur les membres couvrant
  entièrement la fenêtre. Non normalisée pour garantir la rétrocompatibilité
  (`config par défaut ⇒ score = Σ pᵢ`). Quand la capacité sera disponible (V2-3),
  une variante normalisée `f_cov' = min(Σpᵢ, capacity) / capacity` pourra être
  activée par un poids dédié sans toucher au défaut.
- **`f_men` (mentor)** — binaire : `1` si un mentor (du groupe/activité) est
  disponible sur la fenêtre, sinon `0`. (Étendre en ratio `mentors_dispo / mentors_requis`.)
- **`f_cap` (capacité)** — `min(1, Σpᵢ / capacity)` si `capacity > 0`, sinon `0`.
  Un créneau déjà rempli (`Σpᵢ ≥ capacity`) a `f_cap = 1` : le terme ne *pénalise*
  pas, il *lisse* ; la sur-capacité relève de la pénalité conflit ou d'une contrainte dure.
- **`f_pref` (préférences)** — part des membres couvrants dont les préférences
  (jour/heure) sont satisfaites : `nb_membres_ok / nb_membres_couvrants`.
- **`f_fair` (équité)** — bonus quand le créneau sollicite des membres **peu**
  utilisés la semaine : `1 − util_moyenne_des_membres_couvrants` (utilité normalisée
  au budget hebdo). Tie-breaker intentionnellement faible.
- **`f_conf` (conflit)** — `1` si la fenêtre chevauche un atelier déjà planifié
  (incompatibilité membre/ressource), sinon `0`. Appliqué **négativement**.

## 5. Poids initiaux (et pourquoi ils ne sont pas arbitraires)

| Poids | Valeur initiale | Justification |
|---|---|---|
| `w_cov` | `1` | Terme de référence historique ; ordonnancement inchangé par défaut. |
| `w_men` | `0.4` | Un atelier sans mentor est un échec opérationnel quasi certain → poids élevé dès que la donnée existe, sans dominer la couverture (compromis couverture vs mentor). |
| `w_cap` | `0.3` | La sur-capacité est coûteuse (frustration, no-show) mais secondaire face à la couverture. |
| `w_pref` | `0.15` | Satisfaction utilisateur, soft — doit rester inférieur aux termes « critiques ». |
| `w_fair` | `0.1` | Tie-breaker d'équité, volontairement minimal. |
| `w_conf` | `0.5` | Les conflits sont sévères : pénalité appliquée sur `f_conf ∈ [0,1]`, plafonnée à `0.5 × score` négatif possible. |

**Règle** : aucun poids n'est « réglé à la main » de façon définitive. Chaque poids
est une **hypothèse** à valider par calibration (§6) ; le défaut reste
`w_cov = 1, autres = 0` tant que la donnée de validation n'existe pas.

## 6. Stratégie de calibration (pas de réglage manuel pur)

- **Donnée** : fréquentation réelle des ateliers planifiés (participants présents
  vs attendus). Seuil de déclenchement : **≥ 30 ateliers** avec données de présence
  ET **n médian ≥ 30** observations par membre (sinon le bruit domine).
- **Métrique cible** : corrélation de rang (Spearman) entre `score` et fréquentation
  réelle ≥ `0.3`, ou top-1 recommandé présent dans les 3 meilleurs créneaux réels
  dans ≥ `60 %` des cas.
- **Méthode** : validation croisée `K=5` sur les ateliers passés ; recherche par
  grille puis descente de coordonnées sur les poids, en partant du défaut
  (`w_cov=1`) comme baseline. On **n'active pas** un poids s'il ne bat pas la baseline.
- **Explicabilité de la calibration** : après chaque passe, l'écart `score ↔ réel`
  est décomposé par terme pour savoir *quoi* recalibrer.

## 7. Explicabilité et décomposition

Chaque créneau recommandé expose dans la réponse API :
- `score` : score composé (arrondi) ;
- `scoreBreakdown` : `{ coverage, mentorFit, capacityFit, preference, fairness, conflict }`
  (valeurs brutes par terme avant poids) ;
- `factors` (champ existant) : raisons lisibles construites depuis le breakdown.

La décomposition permet à un admin de répondre « pourquoi ce créneau ? » et de
contester un classement (ex. « la couverture est bonne mais le mentor manque »).

## 8. Critères d'acceptation d'un « bon score »

1. **Parité** : config par défaut ⇒ `score = Σ pᵢ` exactement (test de régression).
2. **Corrélation** : Spearman(score, fréquentation réelle) ≥ 0.3 sur ≥ 30 ateliers.
3. **Stabilité** : pas de dérive de classement entre deux passes à données identiques.
4. **Explicabilité** : tout changement de score est attribuable à ≥ 1 terme du breakdown.

## 9. Disponibilité par version

| Terme | V1.1 | V2 |
|---|---|---|
| coverage (`Σ pᵢ`) | ✅ actif (`w=1`) | actif |
| mentor | — (`w=0`) | #34 + #54 |
| capacité | — (`w=0`) | #55 |
| préférences | — (`w=0`) | #57 |
| équité | — (`w=0`) | #58 |
| conflit | — (`w=0`) | #54 |

Les termes inactifs ont un poids `0` **et** un `f_k = 0` : aucun effet de bord
possible sur le classement tant que la donnée n'est pas branchée.