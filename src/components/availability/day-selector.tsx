import { DAY_SHORT } from "@/components/availability/constants";
import { cn } from "@/lib/utils";

export function DaySelector({
  selected,
  onSelect,
  hoursPerDay,
  disabled,
}: {
  selected: number | null;
  onSelect: (day: number) => void;
  hoursPerDay: number[];
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Jour de la semaine"
      className="grid grid-cols-4 gap-2 sm:grid-cols-7"
    >
      {DAY_SHORT.map((name, i) => {
        const active = selected === i;
        const hasHours = hoursPerDay[i] > 0;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onSelect(i)}
            className={cn(
              "flex h-14 flex-col items-center justify-center rounded-lg border text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "border-accent bg-accent text-accent-foreground shadow-sm"
                : "border-border bg-background text-muted-foreground hover:border-accent/50 hover:text-foreground"
            )}
          >
            <span className="leading-none">{name}</span>
            <span
              className={cn(
                "mt-1 text-[11px] font-normal",
                active ? "text-accent-foreground/80" : "text-muted-foreground/70"
              )}
            >
              {hasHours ? `${Math.round(hoursPerDay[i])} h` : "—"}
            </span>
          </button>
        );
      })}
    </div>
  );
}