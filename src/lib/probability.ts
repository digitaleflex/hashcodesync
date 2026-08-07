// Estimation bayésienne de la probabilité de présence pᵢ d'un membre.
//
// Modèle Beta-binomial : on suppose pᵢ ~ Beta(α, β). A priori faiblement
// informatif (α=β=1, distribution uniforme). À chaque observation (présence
// ou absence à un atelier), on met à jour :
//   α' = α + s      (s = nb de présences)
//   β' = β + f      (f = nb d'absences)
// et l'espérance de présence vaut   E[p] = α' / (α' + β').
//
// On fusionne avec la "masse horaire" déclarée : un membre qui se déclare très
// disponible a un léger a priori optimiste, mais c'est l'historique qui prime
// dès qu'il y a des observations.

/** Données historiques d'un membre. */
export type PresenceHistory = {
  present: number; // nb d'ateliers où le membre était présent
  absent: number; // nb d'ateliers où le membre était absent
};

/**
 * Probabilité de présence pᵢ d'un membre dans [0,1].
 * - Sans historique : on part de la masse horaire (mieux = dispo plus fiable),
 *   borné entre BASE_MIN et BASE_MAX pour éviter les extrêmes.
 * - Avec historique : combinaison Beta-binomiale (le prior compte comme 2 obs
 *   fictives, conservative quand le nombre d'observations est petit).
 */
export function presenceProbability(
  history: PresenceHistory,
  massHours: number,
  baseMax = 0.85,
  baseMin = 0.25
): number {
  const n = history.present + history.absent;
  const prior = Math.min(baseMax, Math.max(baseMin, 0.3 + massHours / 60));

  if (n === 0) return prior;

  // Beta(α=1, β=1) + observations -> Beta(1+s, 1+f) ; E = (1+s)/(2+n).
  const sb = (1 + history.present) / (2 + n);

  // Une petite part du prior dès qu'on a de l'historique, elle amortit le bruit.
  return prior * 0.3 + sb * 0.7;
}