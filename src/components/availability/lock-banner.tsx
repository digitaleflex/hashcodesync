import { LockIcon } from "lucide-react";
import { formatDateFr, formatWeekRange } from "@/components/availability/date";

export function LockBanner({ weekStart }: { weekStart: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4"
    >
      <LockIcon className="mt-0.5 size-5 shrink-0 text-warning" />
      <div className="space-y-1 text-sm">
        <p className="font-medium text-foreground">Semaine validée — disponibilités figées</p>
        <p className="text-muted-foreground">
          Vous ne pouvez plus ajouter ou retirer de créneau jusqu&apos;au lundi suivant (
          {formatDateFr(weekStart)} → {formatWeekRange(weekStart)}).
        </p>
      </div>
    </div>
  );
}