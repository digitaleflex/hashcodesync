// Score de créneau multi-critères (V2-01, issues #52/#53).
// Conception complète : docs/scheduling-score.md.
//
// score(slot) = w_cov·f_cov + w_men·f_men + w_cap·f_cap + w_pref·f_pref
//               + w_fair·f_fair − w_conf·f_conf
//
// La config par défaut (w_cov = 1, autres = 0) doit reproduire EXACTEMENT le
// comportement historique (score = Σ pᵢ) — test de parité en test/scheduling.test.ts.

export type ScoreWeights = {
  coverage: number;
  mentorFit: number;
  capacityFit: number;
  preference: number;
  fairness: number;
  conflictPenalty: number;
};

export type ScoreConfig = {
  weights: ScoreWeights;
};

// Config par défaut : équivalente au moteur historique (simple somme des poids).
export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  weights: {
    coverage: 1,
    mentorFit: 0,
    capacityFit: 0,
    preference: 0,
    fairness: 0,
    conflictPenalty: 0,
  },
};

// Contexte d'un créneau candidat. Les dimensions absentes en V1 sont optionnelles
// et produisent f_k = 0 (poids à 0 en l'état, voir docs/scheduling-score.md §9).
export type SlotScoreContext = {
  // Somme des probabilités des membres couvrant (calculée par l'appelant) ;
  // peut être passée directement au lieu de coveringWeights.
  totalMembers?: number;
  // f_men : un mentor (groupe/activité) est disponible sur la fenêtre.
  mentorAvailable?: boolean;
  // f_cap : capacité de l'atelier visé par le créneau.
  capacity?: number;
  // f_pref : match préférences par membre couvrant.
  preferences?: { matched: boolean }[];
  // f_fair : 0..1, bonus d'équité (1 = sollicite surtout des membres peu utilisés).
  fairness?: number;
  // f_conf : 0..1, pénalité de conflit (1 = conflit max avec un atelier planifié).
  conflict?: number;
};

export type ScoreBreakdown = {
  coverage: number;
  mentorFit: number;
  capacityFit: number;
  preference: number;
  fairness: number;
  conflict: number;
};

// Score composé pur d'un créneau + décomposition par terme (avant pondération).
// `coveringWeights` = pᵢ des membres couvrant la fenêtre (Σ pᵢ = f_cov).
export function computeSlotScore(
  coveringWeights: number[],
  ctx: SlotScoreContext,
  config: ScoreConfig = DEFAULT_SCORE_CONFIG
): { score: number; breakdown: ScoreBreakdown } {
  const w = config.weights;

  // f_cov : valeur brute Σ pᵢ (non normalisée — rétrocompat, cf. doc §4).
  const coverage = coveringWeights.reduce((s, p) => s + p, 0);

  // f_men : binaire. Inactif si la donnée n'est pas fournie.
  const mentorFit = ctx.mentorAvailable !== undefined ? (ctx.mentorAvailable ? 1 : 0) : 0;

  // f_cap : marge de capacité normalisée. Inactif sans capacité.
  const capacityFit =
    ctx.capacity !== undefined && ctx.capacity > 0 ? Math.min(1, coverage / ctx.capacity) : 0;

  // f_pref : part des membres couvrants dont les préférences sont satisfaites.
  const preference =
    ctx.preferences && ctx.preferences.length > 0
      ? ctx.preferences.filter((p) => p.matched).length / ctx.preferences.length
      : 0;

  const fairness = ctx.fairness ?? 0;
  const conflict = ctx.conflict ?? 0;

  const score =
    w.coverage * coverage +
    w.mentorFit * mentorFit +
    w.capacityFit * capacityFit +
    w.preference * preference +
    w.fairness * fairness -
    w.conflictPenalty * conflict;

  return {
    score,
    breakdown: { coverage, mentorFit, capacityFit, preference, fairness, conflict },
  };
}