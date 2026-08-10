"use client";

import { memo, useMemo } from "react";
import type { SlotInput } from "@/components/availability/shared";
import { DAY_NAMES } from "@/components/availability/constants";
import { cn } from "@/lib/utils";
import {
  buildBlocks,
  computeRange,
  fmtHours,
  toMinutes,
} from "@/components/availability/weekly-calendar";
import { PlusIcon } from "lucide-react";

const FULL_DAY_MIN = 8 * 60;
const LANE_HEIGHT = 24;
const LANE_GAP = 3;
const MIN_TRACK_HEIGHT = 44;
const MIN_LABEL_WIDTH = 13;

export const MobileWeeklyGrid = memo(function MobileWeeklyGrid({
  grouped,
  onOpenDay,
  onEditSlot,
}: {
  grouped: Record<number, SlotInput[]>;
  onOpenDay?: (day: number) => void;
  onEditSlot?: (slot: { id: string; day: number; startTime: string; endTime: string }) => void;
}) {
  const range = useMemo(() => computeRange(grouped), [grouped]);
  const totalSpan = range.end - range.start;
  const hours = useMemo(
    () => Array.from({ length: totalSpan / 60 }, (_, i) => range.start / 60 + i),
    [range, totalSpan]
  );

  const todayIndex = useMemo(() => (new Date().getDay() + 6) % 7, []);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const days = useMemo(
    () =>
      DAY_NAMES.map((name, day) => {
        const slots = grouped[day] ?? [];
        const blocks = buildBlocks(slots, range.start, range.end);
        const totalMinutes = slots.reduce(
          (acc, s) => acc + toMinutes(s.endTime) - toMinutes(s.startTime),
          0
        );
        const state =
          totalMinutes >= FULL_DAY_MIN ? "full" : slots.length > 0 ? "partial" : "empty";
        const laneCount = blocks.reduce((acc, b) => Math.max(acc, b.lane + 1), 0);
        return { name, day, slots, blocks, totalMinutes, state, laneCount };
      }),
    [grouped, range]
  );

  const step = totalSpan >= 720 ? 180 : totalSpan >= 420 ? 120 : 60;
  const ticks: number[] = [];
  for (let m = range.start; m <= range.end; m += step) ticks.push(m);

  const gridTemplate = `repeat(${hours.length}, minmax(0, 1fr))`;

  return (
    <div className="flex flex-col gap-3">
      {days.map((d) => {
        const isToday = d.day === todayIndex;
        const trackHeight =
          d.laneCount > 0
            ? d.laneCount * LANE_HEIGHT + (d.laneCount - 1) * LANE_GAP + 10
            : MIN_TRACK_HEIGHT;
        const showNow = isToday && nowMin >= range.start && nowMin <= range.end;
        const canAdd = onOpenDay != null;

        return (
          <div
            key={d.day}
            className={cn(
              "overflow-hidden rounded-xl border transition-colors",
              isToday ? "border-primary/40 bg-primary/[0.04]" : "border-border/60"
            )}
          >
            {/* Day header */}
            <button
              type="button"
              onClick={() => onOpenDay?.(d.day)}
              aria-label={canAdd ? `Ajouter une disponibilité le ${d.name}` : d.name}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("text-sm font-semibold", isToday && "text-primary")}>
                  {d.name}
                </span>
                {isToday && (
                  <span className="rounded-full bg-primary px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                    Aujourd&apos;hui
                  </span>
                )}
                <span className="truncate text-[11px] font-medium text-muted-foreground">
                  {d.state === "empty" ? "Non configuré" : fmtHours(d.totalMinutes)}
                </span>
              </span>
              {canAdd && (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground">
                  <PlusIcon className="size-3.5" />
                </span>
              )}
            </button>

            {/* Track */}
            <div className="px-3 pb-2.5">
              <div className="relative mb-1 h-4">
                {ticks.map((m, i) => {
                  const pct = ((m - range.start) / totalSpan) * 100;
                  const x = i === 0 ? 0 : i === ticks.length - 1 ? -100 : -50;
                  return (
                    <span
                      key={m}
                      className="absolute top-0 text-[10px] font-medium tabular-nums text-muted-foreground"
                      style={{ left: `${pct}%`, transform: `translateX(${x}%)` }}
                    >
                      {Math.floor(m / 60)}h
                    </span>
                  );
                })}
              </div>

              <div
                role={canAdd ? "button" : undefined}
                tabIndex={canAdd ? 0 : undefined}
                aria-label={canAdd ? `Ajouter une disponibilité le ${d.name}` : undefined}
                onClick={canAdd ? () => onOpenDay(d.day) : undefined}
                onKeyDown={(e) => {
                  if (canAdd && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onOpenDay(d.day);
                  }
                }}
                className={cn("relative", canAdd && "cursor-pointer")}
                style={{ height: trackHeight }}
              >
                {/* Hour gridlines */}
                <div
                  className="absolute inset-0 grid overflow-hidden rounded-lg"
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className={cn("border-l border-border/50", i === 0 && "border-l-0")}
                    />
                  ))}
                </div>

                {/* Now line */}
                {showNow && (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-10"
                    style={{ left: `${((nowMin - range.start) / totalSpan) * 100}%` }}
                    title="Maintenant"
                  >
                    <div className="h-full w-px bg-primary/70" />
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
                            const editable = onEditSlot != null && b.id != null;
                            return (
                              <div
                                key={b.key}
                                role={editable ? "button" : undefined}
                                aria-label={editable ? `Modifier ${b.title}` : b.title}
                                onClick={(e) => {
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
                                }}
                                title={editable ? `Modifier : ${b.title}` : b.title}
                                style={{ left: `${b.left}%`, width: `${b.width}%` }}
                                className={cn(
                                  "absolute top-0 flex h-full items-center overflow-hidden rounded-md border px-1",
                                  (editable || canAdd) && "cursor-pointer",
                                  d.state === "full"
                                    ? "border-primary/50 bg-primary/20"
                                    : "border-warning/40 bg-warning/20"
                                )}
                              >
                                {b.width >= MIN_LABEL_WIDTH && (
                                  <span
                                    className={cn(
                                      "truncate text-[10px] font-medium leading-none tabular-nums",
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
                  <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground/25">
                    —
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
