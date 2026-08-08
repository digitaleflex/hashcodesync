import { CalendarPlusIcon, ArrowDownIcon } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent/10">
        <CalendarPlusIcon className="size-6 text-accent" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Votre semaine est encore vide</p>
        <p className="text-sm text-muted-foreground">
          Ajoutez votre premier créneau ci-dessous. Vous pouvez le laisser général ou le lier à un groupe/activité.
        </p>
      </div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowDownIcon className="size-3" />
        Choisissez un contexte, puis un jour et un horaire
      </p>
    </div>
  );
}