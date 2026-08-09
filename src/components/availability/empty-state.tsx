import { CalendarPlusIcon, ArrowDownIcon } from "lucide-react";

export function EmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent/10">
        <CalendarPlusIcon className="size-6 text-accent" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Votre semaine est encore vide</p>
        <p className="text-sm text-muted-foreground">
          Ajoutez vos premiers créneaux pour permettre la planification de vos ateliers.
        </p>
      </div>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/80"
        >
          <ArrowDownIcon className="size-3.5" />
          Ajouter une disponibilité
        </button>
      )}
    </div>
  );
}
