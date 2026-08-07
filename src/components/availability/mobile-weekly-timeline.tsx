import type { Availability } from "@/components/availability/shared";
import { DAY_NAMES } from "@/components/availability/constants";
import { CircleIcon } from "lucide-react";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function durationLabel(start: string, end: string): string {
  const min = toMinutes(end) - toMinutes(start);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function MobileWeeklyTimeline({
  grouped,
}: {
  grouped: Record<number, Availability[]>;
}) {
  return (
    <ul className="divide-y divide-border">
      {DAY_NAMES.map((name, day) => {
        const slots = grouped[day] ?? [];
        const has = slots.length > 0;
        return (
          <li key={day} className="flex items-start gap-3 py-3">
            <div className="flex w-14 shrink-0 items-center gap-1.5 pt-0.5">
              <CircleIcon
                className={`size-2 shrink-0 ${has ? "fill-accent text-accent" : "text-muted-foreground/40"}`}
              />
              <span className={`text-sm font-medium ${has ? "text-foreground" : "text-muted-foreground/60"}`}>
                {name.slice(0, 3)}
              </span>
            </div>
            {has ? (
              <div className="flex flex-wrap gap-1.5">
                {slots.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent/15 px-2 py-1 text-xs font-medium text-accent"
                  >
                    {s.startTime}–{s.endTime}
                    <span className="font-normal text-accent/70">
                      · {durationLabel(s.startTime, s.endTime)}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="pt-0.5 text-sm text-muted-foreground/40">—</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}