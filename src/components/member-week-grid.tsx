"use client";

import { useMemo } from "react";
import { buildDayDates, DAY_HUES, DAY_NAMES } from "@/components/scheduling-views";
import { cn } from "@/lib/utils";

export type WeekSlot = { day: number; startTime: string; endTime: string };

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const PX_PER_HOUR = 26;

// Grille hebdomadaire compacte d'UNE personne : 7 colonnes (lundi → dimanche)
// avec les créneaux positionnés à l'échelle. Contrairement à la heatmap de
// cohorte (agrégée), ici chaque bloc = un créneau déclaré, lisible d'un coup
// d'œil. Les dates réelles s'affichent quand `weekStart` est fourni.
export function MemberWeekGrid({
  slots,
  weekStart,
  refTz,
  className,
}: {
  slots: WeekSlot[];
  weekStart?: string | null;
  refTz?: string;
  className?: string;
}) {
  const dayDates = useMemo(() => buildDayDates(weekStart, refTz), [weekStart, refTz]);
  const todayKey = useMemo(() => {
    try {
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: refTz || undefined,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return fmt.format(new Date());
    } catch {
      return null;
    }
  }, [refTz]);

  const { minHour, maxHour } = useMemo(() => {
    let lo = 24;
    let hi = -1;
    for (const s of slots) {
      lo = Math.min(lo, Math.floor(toMin(s.startTime) / 60));
      hi = Math.max(hi, Math.ceil(toMin(s.endTime) / 60));
    }
    if (hi <= lo) return { minHour: 8, maxHour: 20 };
    return { minHour: Math.max(0, lo - 1), maxHour: Math.min(24, hi + 1) };
  }, [slots]);

  const span = maxHour - minHour;
  const height = span * PX_PER_HOUR;
  const byDay = useMemo(() => {
    const map = new Map<number, WeekSlot[]>();
    for (const s of slots) {
      const arr = map.get(s.day) ?? [];
      arr.push(s);
      map.set(s.day, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
    return map;
  }, [slots]);

  const hourTicks: number[] = [];
  for (let h = minHour; h <= maxHour; h += 2) hourTicks.push(h);

  if (slots.length === 0) {
    return (
      <div
        className={cn(
          "flex h-28 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground",
          className
        )}
      >
        Aucune disponibilité sur cette semaine.
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="min-w-[560px]">
        {/* En-têtes de jours */}
        <div className="grid" style={{ gridTemplateColumns: "2.5rem repeat(7, 1fr)" }}>
          <div />
          {DAY_NAMES.map((name, day) => {
            const isToday = dayDates?.[day].key === todayKey;
            return (
              <div key={day} className="px-0.5 pb-1.5 text-center">
                <p
                  className={cn(
                    "text-xs font-medium leading-tight",
                    isToday ? "text-accent" : "text-muted-foreground"
                  )}
                >
                  {name}
                  {dayDates && (
                    <span className="ml-1 tabular-nums opacity-80">{dayDates[day].num}</span>
                  )}
                  {isToday && <span className="sr-only"> (aujourd&apos;hui)</span>}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid" style={{ gridTemplateColumns: "2.5rem repeat(7, 1fr)" }}>
          {/* Gouttière des heures */}
          <div className="relative" style={{ height }}>
            {hourTicks.map((h) => (
              <span
                key={h}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                style={{ top: ((h - minHour) / span) * height }}
              >
                {h}h
              </span>
            ))}
          </div>

          {/* Colonnes jours */}
          {DAY_NAMES.map((_, day) => (
            <div key={day} className="relative px-0.5" style={{ height }}>
              {/* Lignes horaires */}
              {hourTicks.map((h) => (
                <span
                  key={h}
                  aria-hidden="true"
                  className="absolute inset-x-0 border-t border-border/50"
                  style={{ top: ((h - minHour) / span) * height }}
                />
              ))}
              {(byDay.get(day) ?? []).map((s, i) => {
                const start = toMin(s.startTime);
                const end = toMin(s.endTime);
                const dur = Math.max(end - start, 30);
                const hue = DAY_HUES[day] ?? 0;
                const tall = (dur / 60) * PX_PER_HOUR >= 22;
                return (
                  <div
                    key={i}
                    title={`${DAY_NAMES[day]} ${s.startTime} – ${s.endTime}`}
                    className="absolute inset-x-0.5 overflow-hidden rounded-md px-1 ring-1 ring-inset"
                    style={{
                      top: ((start - minHour * 60) / 60) * PX_PER_HOUR,
                      height: Math.max((dur / 60) * PX_PER_HOUR, 10),
                      backgroundColor: `hsl(${hue}, 70%, 92%)`,
                      color: `hsl(${hue}, 45%, 32%)`,
                    }}
                  >
                    <span
                      className={cn(
                        "block truncate font-semibold tabular-nums",
                        tall ? "text-[10px] leading-[1.6]" : "sr-only"
                      )}
                    >
                      {s.startTime}–{s.endTime}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
