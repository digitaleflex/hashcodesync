"use client";

import { useState } from "react";
import { ChevronDownIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SlotInput } from "@/components/availability/shared";
import { computeStats, groupSlots } from "@/components/availability/shared";
import { formatDateFr, formatWeekRange } from "@/components/availability/date";
import { MobileWeekView } from "@/components/availability/mobile-week-view";
import { WeeklyCalendar } from "@/components/availability/weekly-calendar";

export function HistoryWeek({
  id,
  weekStart,
  validatedAt,
  slots,
  onCopy,
}: {
  id: string;
  weekStart: string;
  validatedAt: string;
  slots: SlotInput[];
  onCopy?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const stats = computeStats(slots);
  const grouped = groupSlots(slots);
  const hoursLabel = stats.hours ? stats.hours.toFixed(1).replace(".0", "") : "0";

  return (
    <li className="rounded-xl bg-muted/40 ring-1 ring-foreground/10 transition-colors focus-within:ring-2 focus-within:ring-ring">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`history-${id}`}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none"
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            Semaine {formatWeekRange(weekStart)}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>
              {stats.slots} créneau{stats.slots > 1 ? "x" : ""}
            </span>
            <span aria-hidden>·</span>
            <span>{hoursLabel} h</span>
            <span aria-hidden>·</span>
            <span>{stats.daysCount} jour{stats.daysCount > 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Validée le {formatDateFr(validatedAt)}
          </Badge>
          {onCopy && (
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onCopy();
                }
              }}
              aria-label="Copier cette semaine"
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <CopyIcon className="size-3.5" />
            </div>
          )}
          <ChevronDownIcon
            className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </div>
      </button>

      {open && (
        <div
          id={`history-${id}`}
          role="region"
          aria-label="Détail de la semaine"
          className="border-t border-border px-4 py-3"
        >
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Semaine validée sans créneau.</p>
          ) : (
            <>
              <div className="sm:hidden">
                <MobileWeekView grouped={grouped} />
              </div>
              <div className="hidden sm:block">
                <WeeklyCalendar grouped={grouped} />
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}
