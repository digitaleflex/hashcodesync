// Planification en série (#79) : génère N semaines d'ateliers non chevauchants
// à partir des fenêtres scorées du moteur (WIS + score composé), en respectant
// les budgets hebdomadaires par membre (PlanningPreferences) et les absences
// planifiées (Unavailability) comme contraintes dures.
//
// Les disponibilités sont des motifs hebdomadaires exprimés dans le fuseau de
// référence : une proposition = (semaine, jour, heure) → date concrète via le
// lundi de la première semaine.

import {
  rankedSlots,
  selectNonOverlappingHours,
  type CandSlot,
  type SlotAvail,
} from "@/lib/scheduling";

export type SeriesParams = {
  weeks: number; // nombre de semaines à planifier (2..16)
  perWeek: number; // sessions par semaine (1..2)
  windowHours: number; // durée d'une session (1..4)
  /** Instant « lundi 00:00 » de la semaine 1, fuseau de référence. */
  startWeekStart: Date;
};

export type MemberBudget = {
  maxWorkshopsPerWeek?: number | null;
  maxHoursPerWeek?: number | null;
};

export type MemberAbsence = {
  userId: string;
  startDate: Date; // inclus
  endDate: Date; // inclus
};

export type SeriesProposal = {
  weekIndex: number;
  /** Date ISO du début de session (fuseau de référence). */
  startAt: string;
  endAt: string;
  day: number;
  startHour: number;
  endHour: number;
  score: number;
  expectedAttendance: number;
  memberCount: number;
};

export type SeriesPlanResult = {
  proposals: SeriesProposal[];
  /** Sessions demandées mais impossibles à satisfaire. */
  warnings: string[];
};

type UsageState = {
  workshopsThisWeek: Map<number, Map<string, number>>; // weekIndex → userId → count
  hoursThisWeek: Map<number, Map<string, number>>;
};

const DAY_MS = 86400000;

function distinctUserIds(slot: CandSlot): string[] {
  const ids = new Set<string>();
  for (const c of slot.covering) if (c.userId) ids.add(c.userId);
  return [...ids];
}

function audienceSignature(slot: CandSlot): string {
  return distinctUserIds(slot).sort().join(",");
}

/** La fenêtre concrète chevauche-t-elle une absence déclarée du membre ? */
function conflictsAbsence(
  absencesByUser: Map<string, MemberAbsence[]>,
  userIds: string[],
  startMs: number,
  endMs: number,
): boolean {
  for (const uid of userIds) {
    const list = absencesByUser.get(uid);
    if (!list) continue;
    for (const a of list) {
      if (startMs <= a.endDate.getTime() && a.startDate.getTime() <= endMs) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Génère les créneaux de la série. `slots` = toutes les fenêtres candidates
 * scorées (voir rankedSlots) ; la sélection se fait semaine par semaine :
 * meilleur score d'abord, jamais deux sessions qui se chevauchent la même
 * semaine pour un même membre, budget hebdo respecté par membre, absence =
 * blocage dur, et rotation des publics pour éviter de solliciter toujours
 * les mêmes membres (fairness).
 */
export function planSeries(args: {
  availabilities: SlotAvail[];
  totalMembers: number;
  params: SeriesParams;
  budgets: Map<string, MemberBudget>;
  absences: MemberAbsence[];
  requiresMentor?: boolean;
  capacity?: number | null;
}): SeriesPlanResult {
  const { availabilities, params, budgets, absences } = args;

  // Fenêtres candidates scorées une seule fois : les dispo sont récurrentes,
  // donc le classement hebdomadaire est identique d'une semaine à l'autre.
  const slots: CandSlot[] = rankedSlots(availabilities, params.windowHours, {
    requiresMentor: args.requiresMentor,
    capacity: args.capacity,
  });
  const selectedByDay: CandSlot[] = [];
  for (let day = 0; day < 7; day++) {
    const daySlots = slots.filter((s) => s.day === day);
    if (daySlots.length) selectedByDay.push(...selectNonOverlappingHours(daySlots));
  }

  const absencesByUser = new Map<string, MemberAbsence[]>();
  for (const a of absences) {
    const list = absencesByUser.get(a.userId) ?? [];
    list.push(a);
    absencesByUser.set(a.userId, list);
  }

  const usage: UsageState = {
    workshopsThisWeek: new Map(),
    hoursThisWeek: new Map(),
  };
  const dayUseCount = new Map<number, number>(); // fairness : rotation des jours
  const audienceUseCount = new Map<string, number>();

  const getWeekMap = (
    store: Map<number, Map<string, number>>,
    w: number,
  ): Map<string, number> => {
    let m = store.get(w);
    if (!m) {
      m = new Map();
      store.set(w, m);
    }
    return m;
  };

  const eligible = (slot: CandSlot, w: number): boolean => {
    const userIds = distinctUserIds(slot);
    const startMs =
      params.startWeekStart.getTime() + w * 7 * DAY_MS + slot.day * DAY_MS + slot.startHour * 3600000;
    const endMs = startMs + params.windowHours * 3600000;

    for (const uid of userIds) {
      const b = budgets.get(uid);
      const wkCount = getWeekMap(usage.workshopsThisWeek, w).get(uid) ?? 0;
      const wkHours = getWeekMap(usage.hoursThisWeek, w).get(uid) ?? 0;
      if (b?.maxWorkshopsPerWeek && wkCount + 1 > b.maxWorkshopsPerWeek) return false;
      if (b?.maxHoursPerWeek && wkHours + params.windowHours > b.maxHoursPerWeek) return false;
    }
    if (conflictsAbsence(absencesByUser, userIds, startMs, endMs)) return false;
    return true;
  };

  const commit = (slot: CandSlot, w: number): void => {
    const wkCount = getWeekMap(usage.workshopsThisWeek, w);
    const wkHours = getWeekMap(usage.hoursThisWeek, w);
    for (const uid of distinctUserIds(slot)) {
      wkCount.set(uid, (wkCount.get(uid) ?? 0) + 1);
      wkHours.set(uid, (wkHours.get(uid) ?? 0) + params.windowHours);
    }
    dayUseCount.set(slot.day, (dayUseCount.get(slot.day) ?? 0) + 1);
    const sig = audienceSignature(slot);
    audienceUseCount.set(sig, (audienceUseCount.get(sig) ?? 0) + 1);
  };

  const proposals: SeriesProposal[] = [];
  const warnings: string[] = [];
  const usedInWeek: { day: number; startMin: number; endMin: number }[][] = Array.from(
    { length: params.weeks },
    () => [],
  );

  const totalSessions = params.weeks * params.perWeek;

  for (let sessionIndex = 0; sessionIndex < totalSessions; sessionIndex++) {
    const w = Math.floor(sessionIndex / params.perWeek);

    const candidates = selectedByDay.filter(
      (s) =>
        !usedInWeek[w].some(
          (p) => p.day === s.day && s.startMin < p.endMin && p.startMin < s.endMin,
        ) && eligible(s, w),
    );
    if (candidates.length === 0) {
      warnings.push(`Semaine ${w + 1} : aucun créneau éligible restant.`);
      continue;
    }

    // Tri : score décroissant ; à score quasi égal (~5 %), on préfère les jours
    // et publics les moins sollicités sur la série (équité anti-capture).
    const bestScore = Math.max(...candidates.map((c) => c.score));
    const nearBest = candidates.filter((c) => c.score >= bestScore * 0.95);
    nearBest.sort((a, b) => {
      const fa = (dayUseCount.get(a.day) ?? 0) + (audienceUseCount.get(audienceSignature(a)) ?? 0) * 2;
      const fb = (dayUseCount.get(b.day) ?? 0) + (audienceUseCount.get(audienceSignature(b)) ?? 0) * 2;
      return fa - fb || b.score - a.score;
    });
    const chosen = nearBest[0];

    const startMs =
      params.startWeekStart.getTime() +
      w * 7 * DAY_MS +
      chosen.day * DAY_MS +
      chosen.startHour * 3600000;
    const endMs = startMs + params.windowHours * 3600000;
    const memberCount = new Set(distinctUserIds(chosen)).size;

    proposals.push({
      weekIndex: w,
      startAt: new Date(startMs).toISOString(),
      endAt: new Date(endMs).toISOString(),
      day: chosen.day,
      startHour: chosen.startHour,
      endHour: chosen.endHour,
      score: Math.round(chosen.score * 100) / 100,
      expectedAttendance: Math.round(chosen.weight * 10) / 10,
      memberCount,
    });
    usedInWeek[w].push({ day: chosen.day, startMin: chosen.startMin, endMin: chosen.endMin });
    commit(chosen, w);
  }

  return { proposals, warnings };
}
