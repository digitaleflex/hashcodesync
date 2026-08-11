import { DAY_SHORT, DAY_NAMES } from "@/components/availability/constants";
import { computeMassHours } from "@/lib/masse-horaire";

export type Availability = {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
  group?: { id: string; name: string } | null;
  activity?: { id: string; name: string } | null;
  recurring?: boolean;
};

export type SlotInput = {
  day: number;
  startTime: string;
  endTime: string;
};

export type AvailabilityStats = {
  slots: number;
  hours: number;
  minutes: number;
  daysCount: number;
  bestDay: number | null;
  avgSlotMinutes: number | null;
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function computeStats(list: SlotInput[]): AvailabilityStats {
  if (list.length === 0) {
    return { slots: 0, hours: 0, minutes: 0, daysCount: 0, bestDay: null, avgSlotMinutes: null };
  }
  let rawMinutes = 0;
  const days = new Set<number>();
  for (const a of list) {
    days.add(a.day);
    const d = toMinutes(a.endTime) - toMinutes(a.startTime);
    if (d > 0) rawMinutes += d;
  }
  // Masse horaire hebdomadaire = même calcul que le dashboard (fusion des
  // chevauchements par jour) → un seul chiffre de référence partout.
  const hours = computeMassHours(list);
  const minutes = Math.round(hours * 60);
  let bestDay: number | null = null;
  let bestMinutes = 0;
  for (const day of days) {
    const m = Math.round(computeMassHours(list.filter((a) => a.day === day)) * 60);
    if (m > bestMinutes) {
      bestMinutes = m;
      bestDay = day;
    }
  }
  return {
    slots: list.length,
    hours,
    minutes,
    daysCount: days.size,
    bestDay: bestMinutes > 0 ? bestDay : null,
    avgSlotMinutes: list.length > 0 ? Math.round(rawMinutes / list.length) : null,
  };
}

export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0").replace(/00$/, "").trim() || ""}`.trim();
}

export function rangeLabel(start: string, end: string): string {
  return `${start}–${end}`;
}

export function groupSlots(slots: SlotInput[]): Record<number, SlotInput[]> {
  const g: Record<number, SlotInput[]> = {};
  for (let i = 0; i < 7; i++) g[i] = [];
  slots.forEach((s) => {
    if (g[s.day]) g[s.day].push(s);
  });
  return g;
}

export function compareSlots(a: SlotInput, b: SlotInput) {
  return a.day - b.day || a.startTime.localeCompare(b.startTime);
}

export type ScopeCorrelation = {
  totalHours: number;
  activityHours: number;
  marginHours: number;
  activityPercent: number;
};

function addInterval(
  map: Map<number, [number, number][]>,
  day: number,
  start: number,
  end: number
) {
  const arr = map.get(day) ?? [];
  arr.push([start, end]);
  map.set(day, arr);
}

function mergedMinutes(map: Map<number, [number, number][]>): number {
  let totalMin = 0;
  for (const intervals of map.values()) {
    intervals.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const merged: [number, number][] = [];
    for (const [s, e] of intervals) {
      const last = merged[merged.length - 1];
      if (last && s <= last[1]) {
        if (e > last[1]) last[1] = e;
      } else {
        merged.push([s, e]);
      }
    }
    for (const [s, e] of merged) totalMin += e - s;
  }
  return totalMin;
}

const roundHalfHour = (minutes: number) => Math.round((minutes / 60) * 2) / 2;

// Corrélation des portées : la masse horaire liée à des groupes/activités
// doit rester dans la masse totale déclarée. On fusionne les chevauchements
// par jour pour ne pas compter deux fois la même fenêtre.
export function computeScopeCorrelation(
  list: (SlotInput & {
    group?: { id: string } | null;
    activity?: { id: string } | null;
  })[]
): ScopeCorrelation {
  const all = new Map<number, [number, number][]>();
  const scoped = new Map<number, [number, number][]>();
  for (const a of list) {
    const start = toMinutes(a.startTime);
    const end = toMinutes(a.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    addInterval(all, a.day, start, end);
    if (a.group != null || a.activity != null) {
      addInterval(scoped, a.day, start, end);
    }
  }
  const totalMin = mergedMinutes(all);
  const activityMin = mergedMinutes(scoped);
  const totalHours = roundHalfHour(totalMin);
  const activityHours = roundHalfHour(activityMin);
  return {
    totalHours,
    activityHours,
    marginHours: roundHalfHour(totalMin - activityMin),
    activityPercent:
      totalHours > 0 ? Math.min(100, Math.round((activityHours / totalHours) * 100)) : 0,
  };
}

export { DAY_NAMES, DAY_SHORT };