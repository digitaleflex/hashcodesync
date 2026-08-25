import { configForTarget, computeSlotScore, type ScoreConfig, type ScoreBreakdown } from "@/lib/scoring";

export function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Une disponibilité peut être pondérée par une probabilité de présence pᵢ (0..1).
// Sans poids, `weight` vaut 1 (simple comptage). Tous les calculs ci-dessous
// utilisent la somme des poids au lieu d'un simple comptage.
export type SlotAvail = {
  day: number;
  startMin: number;
  endMin: number;
  weight?: number;
  // Identifiant du membre propriétaire du créneau : permet de fusionner les
  // intervalles d'un même membre avant comptage (évite le double-comptage).
  userId?: string;
  // Le membre couvrant a le rôle mentor (terme mentorFit, issue #54).
  mentor?: boolean;
};

type HeatmapData = {
  totalMembers: number;
  totalAvailabilities: number;
  windowHours: number;
  minHour: number;
  maxHour: number;
  heatmap: { day: number; hour: number; count: number; memberCount: number }[];
  // Version lissée (KDE gaussien) de la heatmap, optionnelle.
  heatmapSmoothed?: { day: number; hour: number; count: number }[];
  recommendation: {
    day: number;
    startHour: number;
    startTime: string;
    endTime: string;
    available: number;
    percent: number;
    expectedAttendance: number;
    coveragePercent: number;
    memberCount: number;
    capacityInsufficient?: boolean;
    topContributors: { userId: string | null; weight: number }[];
    score: number;
    scoreBreakdown: ScoreBreakdown;
    factors: { kind: string; label: string; detail: string }[];
  }[];
};

export type CandSlot = {
  day: number;
  startMin: number;
  endMin: number;
  startHour: number;
  endHour: number;
  weight: number;
  score: number;
  breakdown: ScoreBreakdown;
  covering: SlotAvail[];
  mentorCovered: boolean;
};

// Membres (créneaux) couvrant entièrement la fenêtre — sert à compter les
// contributeurs et à exposer le top-3 de la recommandation.
function coveringMembers(
  availabilities: SlotAvail[],
  day: number,
  start: number,
  end: number
): SlotAvail[] {
  return availabilities.filter(
    (a) => a.day === day && a.startMin <= start && a.endMin >= end
  );
}

// Motif récurrent : masque de jours (bit i = jour i) + plage horaire.
export type RecurringPattern = {
  dayMask: number;
  startTime: string;
  endTime: string;
  groupId?: string | null;
  activityId?: string | null;
};

// Étend un motif récurrent en créneaux hebdomadaires (un par jour du masque).
export function expandPatterns(patterns: RecurringPattern[]): { day: number; startTime: string; endTime: string; groupId?: string | null; activityId?: string | null }[] {
  const out: { day: number; startTime: string; endTime: string; groupId?: string | null; activityId?: string | null }[] = [];
  for (const p of patterns) {
    for (let d = 0; d < 7; d++) {
      if (p.dayMask & (1 << d)) {
        out.push({ day: d, startTime: p.startTime, endTime: p.endTime, groupId: p.groupId, activityId: p.activityId });
      }
    }
  }
  return out;
}

// Fusionne les intervalles d'un même membre sur un même jour (après conversion
// vers le fuseau de référence). Sans fusion, un membre ayant plusieurs créneaux
// superposés (dispo générale + dispo de groupe/activité, ou 2 groupes) serait
// compté 2× dans la heatmap et les recommandations. L'intervalle fusionné garde
// le poids max du membre. Retourne les entrées inchangées si aucun userId.
export function mergePerUserIntervals(slots: SlotAvail[]): SlotAvail[] {
  const hasIds = slots.length > 0 && slots.every((s) => s.userId);
  if (!hasIds) return slots;

  const byUser = new Map<string, Map<number, { startMin: number; endMin: number; weight?: number; mentor?: boolean }[]>>();
  for (const s of slots) {
    let byDay = byUser.get(s.userId!);
    if (!byDay) {
      byDay = new Map();
      byUser.set(s.userId!, byDay);
    }
    const arr = byDay.get(s.day) ?? [];
    arr.push({ startMin: s.startMin, endMin: s.endMin, weight: s.weight, mentor: s.mentor });
    byDay.set(s.day, arr);
  }

  const merged: SlotAvail[] = [];
  for (const [userId, byDay] of byUser) {
    for (const [day, intervals] of byDay) {
      intervals.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
      let cur = intervals[0];
      let weight = cur.weight ?? 1;
      const flush = () => {
        merged.push({ day, startMin: cur.startMin, endMin: cur.endMin, userId, weight, mentor: cur.mentor });
      };
      for (let i = 1; i < intervals.length; i++) {
        const next = intervals[i];
        if (next.startMin <= cur.endMin) {
          cur.endMin = Math.max(cur.endMin, next.endMin);
          if (next.weight !== undefined) weight = Math.max(weight, next.weight);
        } else {
          flush();
          cur = next;
          weight = next.weight ?? 1;
        }
      }
      flush();
    }
  }
  return merged;
}

// --- Fenêtres candidates : chaque jour/heure de départ, on compte la somme des
// poids (probabilités) des membres qui couvrent exactement la fenêtre.
function candidateSlots(
  availabilities: SlotAvail[],
  windowMinutes: number,
  minHour: number,
  maxHour: number
): CandSlot[] {
  const out: CandSlot[] = [];
  for (let day = 0; day < 7; day++) {
    const members = availabilities.filter((a) => a.day === day);
    if (members.length === 0) continue;
    for (let startHour = minHour; startHour + windowMinutes / 60 <= maxHour; startHour++) {
      const start = startHour * 60;
      const end = start + windowMinutes;
      const covering = coveringMembers(members, day, start, end);
      const weight = covering.reduce((sum, c) => sum + (c.weight ?? 1), 0);
      if (weight > 0) {
        out.push({ day, startMin: start, endMin: end, startHour, endHour: end / 60, weight, score: weight, breakdown: { coverage: weight, mentorFit: 0, capacityFit: 0, preference: 0, fairness: 0, conflict: 0 }, covering, mentorCovered: covering.some((c) => c.mentor) });
      }
    }
  }
  return out;
}

// Selection bi pondérée par optimisation d'intervalle : fenêtres non chevauchantes
// d'un même jour, maximisant la somme des poids. Exportée pour tests de parité
// (ALG-004) : la recherche de prédécesseur est par dichotomie (O(S log S)).
export function selectNonOverlappingHours(slots: CandSlot[]): CandSlot[] {
  const sorted = [...slots].sort(
    (a, b) => a.endMin - b.endMin || a.startMin - b.startMin
  );
  const n = sorted.length;
  const p = new Array(n).fill(-1);
  // Recherche du prédécesseur compatible par dichotomie sur `endMin` (trié) :
  // dernier indice j dont `endMin ≤ startMin[i]`. Le tri garantit que les
  // endMin sont croissants → O(S log S) au lieu de O(S²). Comme
  // endMin[i] > startMin[i], le prédécesseur trouvé est toujours < i.
  const predecessor = (target: number): number => {
    let lo = 0;
    let hi = n - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid].endMin <= target) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  };
  for (let i = 0; i < n; i++) {
    p[i] = predecessor(sorted[i].startMin);
  }
  const dp = new Array(n).fill(0);
  const take = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    const incl = sorted[i].score + (p[i] >= 0 ? dp[p[i]] : 0);
    const excl = i > 0 ? dp[i - 1] : 0;
    if (incl >= excl) {
      dp[i] = incl;
      take[i] = true;
    } else {
      dp[i] = excl;
      take[i] = false;
    }
  }
  const selected: CandSlot[] = [];
  let i = n - 1;
  while (i >= 0) {
    if (take[i]) {
      selected.push(sorted[i]);
      i = p[i];
    } else {
      i--;
    }
  }
  return selected;
}

// KDE ou lissage gaussien 1D le long des heures, pour chaque jour.
// `sigma` ~0.8-1.5 lisse les pics isolés et renforce les amas horaires.
export function smoothHourly(counts: number[], sigma = 1.2): number[] {
  const n = counts.length;
  const out = new Array(n).fill(0);
  const sigma2 = sigma * sigma;
  for (let h = 0; h < n; h++) {
    if (counts[h] === 0) continue;
    for (let k = 0; k < n; k++) {
      const d = (h - k) ** 2;
      out[k] += counts[h] * Math.exp(-d / (2 * sigma2));
    }
  }
  return out;
}

// Applique le lissage gaussien par jour sur une heatmap [day,hour].
export function gaussianHeatmap(
  heatmap: { day: number; hour: number; count: number }[],
  sigma = 1.2
): { day: number; hour: number; count: number }[] {
  const byDay = new Map<number, number[]>();
  for (const c of heatmap) {
    const arr = byDay.get(c.day) ?? new Array(24).fill(0);
    arr[c.hour] = c.count;
    byDay.set(c.day, arr);
  }
  const out: { day: number; hour: number; count: number }[] = [];
  for (const [day, raw] of byDay) {
    const sm = smoothHourly(raw, sigma);
    sm.forEach((count, hour) => out.push({ day, hour, count: Math.round(count * 10) / 10 }));
  }
  return out;
}

// Couverture hebdomadaire : part des créneaux déclarés rapportée au maximum
// observé sur la cohorte (membre le plus rempli × nb de membres), bornée à 100.
// Référence dynamique — plus de constante arbitraire (ex. « 40 »). Même
// convention dans /api/admin/scheduling (cockpit) et /history (tendance).
export function computeCoveragePercent(
  totalAvailabilities: number,
  totalMembers: number,
  maxSlotsPerUser: number
): number {
  if (totalMembers <= 0 || maxSlotsPerUser <= 0) return 0;
  return Math.min(
    100,
    Math.round((totalAvailabilities / (totalMembers * maxSlotsPerUser)) * 100)
  );
}

// rankedSlots : toutes les fenêtres candidates scorées (score composé V2-01),
// non chevauchantes par jour via le WIS. Utilisé par computeScheduling et par
// le planificateur de séries (#79). `bounds` évite un recalcul quand l'appelant
// connaît déjà minHour/maxHour (comportement strictement identique).
export function rankedSlots(
  availabilities: SlotAvail[],
  windowHours: number,
  opts: {
    scoreConfig?: ScoreConfig;
    scoreContext?: import("@/lib/scoring").SlotScoreContext;
    requiresMentor?: boolean;
    capacity?: number | null;
  } = {},
  bounds?: { minHour: number; maxHour: number }
): CandSlot[] {
  let minHour = bounds?.minHour ?? 24;
  let maxHour = bounds?.maxHour ?? -1;
  if (!bounds) {
    for (let day = 0; day < 7; day++) {
      const members = availabilities.filter((a) => a.day === day);
      if (members.length === 0) continue;
      const hours = new Set<number>();
      // Bornes dérivées des créneaux déclarés : même convention que la heatmap.
      for (const m of members) {
        for (let h = Math.floor(m.startMin / 60); h < Math.ceil(m.endMin / 60); h++) {
          hours.add(h);
        }
      }
      for (const h of hours) {
        minHour = Math.min(minHour, h);
        maxHour = Math.max(maxHour, h + 1);
      }
    }
    if (minHour === 24) {
      minHour = 8;
      maxHour = 20;
    }
  }

  const slots = candidateSlots(availabilities, windowHours * 60, minHour, maxHour);

  const cfg =
    opts.scoreConfig ??
    configForTarget({ capacity: opts.capacity, requiresMentor: opts.requiresMentor });
  for (const s of slots) {
    const { score, breakdown } = computeSlotScore(
      s.covering.map((c) => c.weight ?? 1),
      {
        ...(opts.scoreContext ?? {}),
        mentorAvailable: opts.requiresMentor ? s.mentorCovered : opts.scoreContext?.mentorAvailable,
        capacity: opts.capacity ?? opts.scoreContext?.capacity,
      },
      cfg
    );
    s.score = score;
    s.breakdown = breakdown;
  }
  return slots;
}

// computeScheduling : pondère chaque dispo par `weight` (probabilité de présence)
// et peut appliquer un lissage gaussien à la heatmap. Le pondéré sert au comptage
// et à la sélection WIS ; `available` = somme attendue des présences.
export function computeScheduling(
  availabilities: SlotAvail[],
  totalMembers: number,
  windowHours: number,
  opts: {
    smooth?: boolean;
    smoothSigma?: number;
    scoreConfig?: ScoreConfig;
    scoreContext?: import("@/lib/scoring").SlotScoreContext;
    // Cible (atelier/activité) : active les termes mentorFit (#54) et
    // capacityFit (#55) sans pénaliser les autres cas (config par défaut).
    requiresMentor?: boolean;
    capacity?: number | null;
  } = {}
): HeatmapData {
  const heatmap: { day: number; hour: number; count: number; memberCount: number }[] = [];
  let minHour = 24;
  let maxHour = -1;
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const start = hour * 60;
      const end = start + 60;
      const covering = coveringMembers(availabilities, day, start, end);
      const count = covering.reduce((sum, c) => sum + (c.weight ?? 1), 0);
      const distinct = new Set<string>();
      for (const c of covering) if (c.userId) distinct.add(c.userId);
      const memberCount = distinct.size > 0 ? distinct.size : covering.length;
      heatmap.push({ day, hour, count, memberCount });
      if (count > 0) {
        minHour = Math.min(minHour, hour);
        maxHour = Math.max(maxHour, hour + 1);
      }
    }
  }
  if (minHour === 24) {
    minHour = 8;
    maxHour = 20;
  }

  const slots = rankedSlots(availabilities, windowHours, opts, { minHour, maxHour });

  const selectedByDay: CandSlot[] = [];
  for (let day = 0; day < 7; day++) {
    const daySlots = slots.filter((s) => s.day === day);
    if (daySlots.length) {
      selectedByDay.push(...selectNonOverlappingHours(daySlots));
    }
  }
  selectedByDay.sort(
    (a, b) => b.score - a.score || a.day - b.day || a.startHour - b.startHour
  );

  const recommendation = selectedByDay.slice(0, 6).map((s) => {
    const distinct = new Set<string>();
    for (const c of s.covering) if (c.userId) distinct.add(c.userId);
    const memberCount = distinct.size > 0 ? distinct.size : s.covering.length;
    const topContributors = [...s.covering]
      .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1))
      .slice(0, 3)
      .map((c) => ({
        userId: c.userId ?? null,
        weight: Math.round((c.weight ?? 1) * 100) / 100,
      }));
    // Raisons du classement (explicabilité). Extensible en V2 : préférences,
    // conflits, pénalités s'ajouteront comme facteurs supplémentaires.
    const factors: { kind: string; label: string; detail: string }[] = [
      {
        kind: "coverage",
        label: "Couverture",
        detail: `${memberCount} membre${memberCount > 1 ? "s" : ""} couvrent ce créneau`,
      },
      {
        kind: "expected-attendance",
        label: "Présence attendue",
        detail: `≈ ${Math.round(s.weight * 10) / 10} présent(s) attendu(s)`,
      },
    ];
    if (opts.requiresMentor) {
      factors.push(
        s.mentorCovered
          ? {
              kind: "mentor",
              label: "Mentor disponible",
              detail: "Un mentor couvre ce créneau",
            }
          : {
              kind: "mentor",
              label: "Aucun mentor",
              detail: "Aucun mentor disponible sur ce créneau",
            }
      );
    }
    if (opts.capacity && opts.capacity > 0) {
      const insufficient = memberCount < opts.capacity;
      factors.push({
        kind: "capacity",
        label: insufficient ? "Capacité insuffisante" : "Capacité OK",
        detail: `${memberCount} couvrant(s) pour une capacité de ${opts.capacity}`,
      });
    }
    if (topContributors.length > 0) {
      factors.push({
        kind: "top-contributors",
        label: "Fiabilité",
        detail: `Top ${topContributors.length} contributeur(s) à ${topContributors
          .map((c) => `${Math.round(c.weight * 100)}%`)
          .join(", ")}`,
      });
    }
    factors.push({
      kind: "score",
      label: "Score composé",
      detail: `Score ${Math.round(s.score * 100) / 100} (${Math.round(s.breakdown.coverage * 10) / 10} de couverture)`,
    });
    return {
      day: s.day,
      startHour: s.startHour,
      startTime: `${pad(s.startHour)}:00`,
      endTime: `${pad(s.endHour)}:00`,
      available: Math.round(s.weight * 100) / 100,
      expectedAttendance: Math.round(s.weight * 100) / 100,
      percent: totalMembers ? Math.round((s.weight / totalMembers) * 100) : 0,
      coveragePercent: totalMembers ? Math.round((memberCount / totalMembers) * 100) : 0,
      memberCount,
      capacityInsufficient:
        opts.capacity && opts.capacity > 0 ? memberCount < opts.capacity : undefined,
      topContributors,
      score: Math.round(s.score * 100) / 100,
      scoreBreakdown: s.breakdown,
      factors,
    };
  });

  const data: HeatmapData = {
    totalMembers,
    totalAvailabilities: availabilities.length,
    windowHours,
    minHour,
    maxHour,
    heatmap,
    recommendation,
  };
  if (opts.smooth) {
    data.heatmapSmoothed = gaussianHeatmap(heatmap, opts.smoothSigma ?? 1.2);
  }
  return data;
}