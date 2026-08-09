"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { SlotInput } from "@/components/availability/shared";
import { DAY_SHORT, DAY_NAMES } from "@/components/availability/constants";
import { cn } from "@/lib/utils";

const FULL_DAY_MIN = 8 * 60;
const LANE_HEIGHT = 26;
const LANE_GAP = 4;
const MIN_TRACK_HEIGHT = 56;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m}`;
}

function computeRange(grouped: Record<number, SlotInput[]>): { start: number; end: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const slots of Object.values(grouped)) {
    for (const s of slots) {
      min = Math.min(min, toMinutes(s.startTime));
      max = Math.max(max, toMinutes(s.endTime));
    }
  }
  let start = min === Infinity ? 8 * 60 : Math.min(8 * 60, Math.floor(min / 60) * 60);
  let end = max === -Infinity ? 18 * 60 : Math.max(18 * 60, Math.ceil(max / 60) * 60);
  start = Math.max(0, start);
  end = Math.min(24 * 60, end);
  if (end - start < 8 * 60) end = Math.min(24 * 60, start + 8 * 60);
  return { start, end };
}

type Block = {
  key: string;
  id?: string;
  lane: number;
  left: number;
  width: number;
  startTime: string;
  endTime: string;
  title: string;
};

function buildBlocks(slots: SlotInput[], rangeStart: number, rangeEnd: number): Block[] {
  const span = rangeEnd - rangeStart;
  const sorted = [...slots].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const lanesEnd: number[] = [];
  const blocks: Block[] = [];
  for (const slot of sorted) {
    const st = Math.max(toMinutes(slot.startTime), rangeStart);
    const en = Math.min(toMinutes(slot.endTime), rangeEnd);
    if (en <= st) continue;
    let lane = lanesEnd.findIndex((e) => e <= st);
    if (lane === -1) {
      lane = lanesEnd.length;
      lanesEnd.push(en);
    } else {
      lanesEnd[lane] = en;
    }
    blocks.push({
      key: `${slot.startTime}-${slot.endTime}-${lane}`,
      id: (slot as { id?: string }).id,
      lane,
      left: ((st - rangeStart) / span) * 100,
      width: ((en - st) / span) * 100,
      startTime: slot.startTime,
      endTime: slot.endTime,
      title: `${DAY_NAMES[slot.day]} ${slot.startTime}–${slot.endTime}`,
    });
  }
  return blocks;
}

export const WeeklyCalendar = memo(function WeeklyCalendar({
  grouped,
  onOpenDay,
  onEditSlot,
}: {
  grouped: Record<number, SlotInput[]>;
  onOpenDay?: (day: number) => void;
  onEditSlot?: (slot: { id: string; day: number; startTime: string; endTime: string }) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);

  const range = useMemo(() => computeRange(grouped), [grouped]);
  const hours = useMemo(
    () => Array.from({ length: (range.end - range.start) / 60 }, (_, i) => range.start / 60 + i),
    [range]
  );

  const days = useMemo(
    () =>
      DAY_SHORT.map((name, day) => {
        const slots = grouped[day] ?? [];
        const blocks = buildBlocks(slots, range.start, range.end);
        const totalMinutes = slots.reduce(
          (acc, s) => acc + toMinutes(s.endTime) - toMinutes(s.startTime),
          0
        );
        const state = totalMinutes >= FULL_DAY_MIN ? "full" : slots.length > 0 ? "partial" : "empty";
        const laneCount = blocks.reduce((acc, b) => Math.max(acc, b.lane + 1), 0);
        return { name, day, slots, blocks, totalMinutes, state, laneCount };
      }),
    [grouped, range]
  );

  const todayIndex = useMemo(() => (new Date().getDay() + 6) % 7, []);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => setTrackWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const gridTemplate = `repeat(${hours.length}, minmax(0, 1fr))`;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        {/* Hour axis */}
        <div className="grid grid-cols-[6rem_1fr] gap-x-2">
          <div />
          <div
            ref={trackRef}
            className="grid pb-1"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {hours.map((h) => (
              <div
                key={h}
                className="pl-1 text-[11px] font-medium tabular-nums text-muted-foreground"
              >
                {h}h
              </div>
            ))}
          </div>
        </div>

        {/* Day rows */}
        {days.map((d) => {
          const isToday = d.day === todayIndex;
          const trackHeight =
            d.laneCount > 0
              ? d.laneCount * LANE_HEIGHT + (d.laneCount - 1) * LANE_GAP + 12
              : MIN_TRACK_HEIGHT;
          const showNow = isToday && nowMin >= range.start && nowMin <= range.end;
          const interactive = onOpenDay != null;

          return (
            <div
              key={d.day}
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              onClick={interactive ? () => onOpenDay(d.day) : undefined}
              onKeyDown={(e) => {
                if (interactive && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onOpenDay(d.day);
                }
              }}
              aria-label={interactive ? `Ouvrir ${DAY_NAMES[d.day]}` : undefined}
              className={cn(
                "group grid grid-cols-[6rem_1fr] gap-x-2 border-b border-border/60 transition-colors last:border-b-0",
                isToday
                  ? "bg-primary/[0.04] hover:bg-primary/[0.08]"
                  : interactive && "hover:bg-muted/40"
              )}
            >
              {/* Day label */}
              <div
                className={cn(
                  "sticky left-0 z-20 flex flex-col items-start justify-center gap-0.5 py-2 pr-1 transition-colors",
                  isToday
                    ? "bg-primary/[0.07] group-hover:bg-primary/[0.11]"
                    : "bg-card group-hover:bg-muted/40"
                )}
              >
                <span className={cn("text-sm font-semibold", isToday && "text-primary")}>
                  {d.name}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {d.state === "empty" ? "—" : fmtHours(d.totalMinutes)}
                </span>
                {isToday && (
                  <span className="mt-0.5 rounded-full bg-primary px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                    Aujourd'hui
                  </span>
                )}
              </div>

              {/* Track */}
              <div className="relative" style={{ height: trackHeight }}>
                {/* Hour gridlines */}
                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: gridTemplate }}>
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className={cn("border-l border-border/50", i === 0 && "border-l-0")}
                    />
                  ))}
                </div>

                {/* Now line on today */}
                {showNow && (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-10"
                    style={{ left: `${((nowMin - range.start) / (range.end - range.start)) * 100}%` }}
                    title="Maintenant"
                  >
                    <div className="h-full w-px bg-primary/70" />
                    <div className="absolute -left-[3px] top-1/2 size-[7px] -translate-y-1/2 rounded-full bg-primary" />
                  </div>
                )}

                {/* Slots */}
                {d.laneCount > 0 ? (
                  <div
                    className="absolute inset-x-0 top-0 flex flex-col justify-center px-0.5"
                    style={{ gap: LANE_GAP, height: trackHeight }}
                  >
                    {Array.from({ length: d.laneCount }, (_, lane) => (
                      <div key={lane} className="relative" style={{ height: LANE_HEIGHT }}>
                        {d.blocks
                          .filter((b) => b.lane === lane)
                          .map((b) => {
                            const pxWidth = (b.width / 100) * trackWidth;
                            const showLabel = trackWidth > 0 ? pxWidth >= 56 : b.width >= 15;
                            const editable = onEditSlot != null && b.id != null;
                            return (
                              <div
                                key={b.key}
                                role={editable ? "button" : undefined}
                                aria-label={editable ? `Modifier ${b.title}` : undefined}
                                onClick={
                                  editable || interactive
                                    ? (e) => {
                                        e.stopPropagation();
                                        if (editable) {
                                          onEditSlot({
                                            id: b.id as string,
                                            day: d.day,
                                            startTime: b.startTime,
                                            endTime: b.endTime,
                                          });
                                        } else {
                                          onOpenDay?.(d.day);
                                        }
                                      }
                                    : undefined
                                }
                                title={editable ? `Modifier : ${b.title}` : b.title}
                                style={{ left: `${b.left}%`, width: `${b.width}%` }}
                                className={cn(
                                  "absolute top-0 flex h-full items-center overflow-hidden rounded-md border px-1.5 transition-colors",
                                  (editable || interactive) && "cursor-pointer",
                                  d.state === "full"
                                    ? "border-primary/50 bg-primary/20 hover:bg-primary/30"
                                    : "border-warning/40 bg-warning/20 hover:bg-warning/30"
                                )}
                              >
                                {showLabel && (
                                  <span
                                    className={cn(
                                      "truncate text-[11px] font-medium leading-none tabular-nums",
                                      d.state === "full" ? "text-primary" : "text-warning"
                                    )}
                                  >
                                    {b.startTime}–{b.endTime}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground/30">
                    —
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-primary/50 bg-primary/20" />
          Journée complète (≥ 8 h)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-warning/40 bg-warning/20" />
          Disponibilité partielle
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-border bg-muted/30" />
          Non configuré
        </span>
      </div>
    </div>
  );
});
