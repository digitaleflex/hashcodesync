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
};

type HeatmapData = {
  totalMembers: number;
  totalAvailabilities: number;
  windowHours: number;
  minHour: number;
  maxHour: number;
  heatmap: { day: number; hour: number; count: number }[];
  // Version lissée (KDE gaussien) de la heatmap, optionnelle.
  heatmapSmoothed?: { day: number; hour: number; count: number }[];
  recommendation: {
    day: number;
    startHour: number;
    startTime: string;
    endTime: string;
    available: number;
    percent: number;
  }[];
};

type CandSlot = {
  day: number;
  startMin: number;
  endMin: number;
  startHour: number;
  endHour: number;
  weight: number;
};

// Somme des poids des dispo couvrant une fenêtre [start,end] un jour donné.
function weightedMembers(
  availabilities: SlotAvail[],
  day: number,
  start: number,
  end: number
): number {
  let w = 0;
  for (const a of availabilities) {
    if (a.day === day && a.startMin <= start && a.endMin >= end) {
      w += a.weight ?? 1;
    }
  }
  return w;
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

  const byUser = new Map<string, Map<number, { startMin: number; endMin: number; weight?: number }[]>>();
  for (const s of slots) {
    let byDay = byUser.get(s.userId!);
    if (!byDay) {
      byDay = new Map();
      byUser.set(s.userId!, byDay);
    }
    const arr = byDay.get(s.day) ?? [];
    arr.push({ startMin: s.startMin, endMin: s.endMin, weight: s.weight });
    byDay.set(s.day, arr);
  }

  const merged: SlotAvail[] = [];
  for (const [userId, byDay] of byUser) {
    for (const [day, intervals] of byDay) {
      intervals.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
      let cur = intervals[0];
      let weight = cur.weight ?? 1;
      const flush = () => {
        merged.push({ day, startMin: cur.startMin, endMin: cur.endMin, userId, weight });
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
      const weight = weightedMembers(members, day, start, end);
      if (weight > 0) {
        out.push({ day, startMin: start, endMin: end, startHour, endHour: end / 60, weight });
      }
    }
  }
  return out;
}

// Selection bi pondérée par optimisation d'intervalle : fenêtres non chevauchantes
// d'un même jour, maximisant la somme des poids.
function selectNonOverlappingHours(slots: CandSlot[]): CandSlot[] {
  const sorted = [...slots].sort(
    (a, b) => a.endMin - b.endMin || a.startMin - b.startMin
  );
  const n = sorted.length;
  const p = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    for (let j = i - 1; j >= 0; j--) {
      if (sorted[j].endMin <= sorted[i].startMin) {
        p[i] = j;
        break;
      }
    }
  }
  const dp = new Array(n).fill(0);
  const take = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    const incl = sorted[i].weight + (p[i] >= 0 ? dp[p[i]] : 0);
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

// computeScheduling : pondère chaque dispo par `weight` (probabilité de présence)
// et peut appliquer un lissage gaussien à la heatmap. Le pondéré sert au comptage
// et à la sélection WIS ; `available` = somme attendue des présences.
export function computeScheduling(
  availabilities: SlotAvail[],
  totalMembers: number,
  windowHours: number,
  opts: { smooth?: boolean; smoothSigma?: number } = {}
): HeatmapData {
  const heatmap: { day: number; hour: number; count: number }[] = [];
  let minHour = 24;
  let maxHour = -1;
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const start = hour * 60;
      const end = start + 60;
      const count = weightedMembers(availabilities, day, start, end);
      heatmap.push({ day, hour, count });
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

  const windowMinutes = windowHours * 60;
  const slots = candidateSlots(availabilities, windowMinutes, minHour, maxHour);

  const selectedByDay: CandSlot[] = [];
  for (let day = 0; day < 7; day++) {
    const daySlots = slots.filter((s) => s.day === day);
    if (daySlots.length) {
      selectedByDay.push(...selectNonOverlappingHours(daySlots));
    }
  }
  selectedByDay.sort(
    (a, b) => b.weight - a.weight || a.day - b.day || a.startHour - b.startHour
  );

  const recommendation = selectedByDay.slice(0, 6).map((s) => ({
    day: s.day,
    startHour: s.startHour,
    startTime: `${pad(s.startHour)}:00`,
    endTime: `${pad(s.endHour)}:00`,
    available: Math.round(s.weight * 100) / 100,
    percent: totalMembers ? Math.round((s.weight / totalMembers) * 100) : 0,
  }));

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