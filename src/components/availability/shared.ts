import { DAY_SHORT, DAY_NAMES } from "@/components/availability/constants";

export type Availability = {
  id: string;
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

export function computeStats(list: Availability[]): AvailabilityStats {
  if (list.length === 0) {
    return { slots: 0, hours: 0, minutes: 0, daysCount: 0, bestDay: null, avgSlotMinutes: null };
  }
  let minutes = 0;
  const perDay = new Array(7).fill(0);
  const days = new Set<number>();
  for (const a of list) {
    const d = toMinutes(a.endTime) - toMinutes(a.startTime);
    minutes += d;
    perDay[a.day] += d;
    days.add(a.day);
  }
  let bestDay = 0;
  for (let i = 1; i < 7; i++) if (perDay[i] > perDay[bestDay]) bestDay = i;
  return {
    slots: list.length,
    hours: minutes / 60,
    minutes,
    daysCount: days.size,
    bestDay: perDay[bestDay] > 0 ? bestDay : null,
    avgSlotMinutes: minutes / list.length,
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

export { DAY_NAMES, DAY_SHORT };