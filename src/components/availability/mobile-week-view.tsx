import { memo } from "react";
import type { SlotInput } from "@/components/availability/shared";
import { DAY_NAMES } from "@/components/availability/constants";
import { ClockIcon } from "lucide-react";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function slotDuration(start: string, end: string): string {
  const min = toMinutes(end) - toMinutes(start);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export const MobileWeekView = memo(function MobileWeekView({
  grouped,
}: {
  grouped: Record<number, SlotInput[]>;
}) {
  return (
    <div className="flex flex-col gap-1">
      {DAY_NAMES.map((name, day) => {
        const slots = grouped[day] ?? [];
        const hasSlots = slots.length > 0;
        const totalMinutes = slots.reduce(
          (acc, s) => acc + toMinutes(s.endTime) - toMinutes(s.startTime),
          0
        );

        let stateLabel = "Non configuré";
        let stateClass = "text-muted-foreground/60";
        if (hasSlots) {
          if (totalMinutes >= 480) {
            stateLabel = "Disponible";
            stateClass = "text-accent";
          } else {
            stateLabel = "Partiellement disponible";
            stateClass = "text-warning";
          }
        }

        return (
          <div
            key={day}
            className="flex items-start gap-3 rounded-lg border border-border/50 px-3 py-2.5"
          >
            <div className="flex w-12 shrink-0 flex-col items-center gap-0.5 pt-0.5">
              <span className="text-sm font-medium">{name.slice(0, 3)}</span>
              <span className={`text-[11px] font-medium ${stateClass}`}>
                {stateLabel}
              </span>
            </div>
            {hasSlots ? (
              <div className="flex flex-1 flex-wrap gap-1.5">
                {slots.map((s, i) => (
                  <span
                    key={`${day}-${s.startTime}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent/15 px-2 py-1 text-xs font-medium text-accent"
                  >
                    <ClockIcon className="size-3 shrink-0 text-accent/70" />
                    {s.startTime}–{s.endTime}
                    <span className="font-normal text-accent/70">
                      · {slotDuration(s.startTime, s.endTime)}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="flex-1 pt-0.5 text-sm text-muted-foreground/40">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
});
