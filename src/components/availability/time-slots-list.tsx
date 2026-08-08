import { memo } from "react";
import { Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Availability } from "@/components/availability/shared";
import { DAY_SHORT } from "@/components/availability/constants";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function durationLabel(start: string, end: string): string {
  const min = toMinutes(end) - toMinutes(start);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m.toString().padStart(2, "0")} min`;
}

export const TimeSlotsList = memo(function TimeSlotsList({
  slots,
  onDelete,
  disabled,
}: {
  slots: Availability[];
  onDelete: (id: string) => void;
  disabled?: boolean;
}) {
  if (slots.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun créneau défini pour l&apos;instant.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {slots.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="w-14 justify-center">
              {DAY_SHORT[s.day]}
            </Badge>
            <p className="text-sm font-medium">
              {s.startTime}–{s.endTime}
              <span className="ml-2 font-normal text-muted-foreground">
                {durationLabel(s.startTime, s.endTime)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDelete(s.id)}
            disabled={disabled}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Retirer ${s.startTime}–${s.endTime} le ${DAY_SHORT[s.day]}`}
          >
            <Trash2Icon className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
});