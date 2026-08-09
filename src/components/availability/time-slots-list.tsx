import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2Icon, CopyIcon, PencilIcon } from "lucide-react";
import type { Availability } from "@/components/availability/shared";
import { DAY_SHORT, DAY_NAMES } from "@/components/availability/constants";

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

function groupSlots(slots: Availability[]): Record<string, Availability[]> {
  const grouped: Record<string, Availability[]> = {};
  for (const s of slots) {
    const key = String(s.day);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }
  for (const arr of Object.values(grouped)) {
    arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  return grouped;
}

export const TimeSlotsList = memo(function TimeSlotsList({
  slots,
  onDelete,
  onEdit,
  onDuplicate,
  disabled,
  groups,
}: {
  slots: Availability[];
  onDelete: (id: string) => void;
  onEdit?: (slot: Availability) => void;
  onDuplicate?: (slot: Availability) => void;
  disabled?: boolean;
  groups: { id: string; name: string; activities: { id: string; name: string }[] }[];
}) {
  const grouped = groupSlots(slots);

  if (slots.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(grouped).map(([day, daySlots]) => (
        <div key={day} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {DAY_NAMES[Number(day)]}
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border/50 overflow-hidden">
            {daySlots.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {s.startTime}–{s.endTime}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {durationLabel(s.startTime, s.endTime)}
                    </span>
                  </span>
                  {s.group && (
                    <Badge variant="outline" className="text-xs">
                      {s.group.name}
                    </Badge>
                  )}
                  {s.activity && (
                    <Badge variant="outline" className="text-xs">
                      {s.activity.name}
                    </Badge>
                  )}
                  {s.recurring && (
                    <Badge variant="secondary" className="text-xs">
                      Récurrent
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onEdit(s)}
                      disabled={disabled}
                      aria-label={`Modifier ${s.startTime}–${s.endTime} le ${DAY_SHORT[s.day]}`}
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                  )}
                  {onDuplicate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onDuplicate(s)}
                      disabled={disabled}
                      aria-label={`Dupliquer ${s.startTime}–${s.endTime} le ${DAY_SHORT[s.day]}`}
                    >
                      <CopyIcon className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onDelete(s.id)}
                    disabled={disabled}
                    aria-label={`Supprimer ${s.startTime}–${s.endTime} le ${DAY_SHORT[s.day]}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
});

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <p className="text-sm text-muted-foreground">
        Aucun créneau défini pour l&apos;instant.
      </p>
      <p className="text-xs text-muted-foreground/70">
        Utilisez le bouton &quot;Ajouter une disponibilité&quot; pour commencer.
      </p>
    </div>
  );
}
