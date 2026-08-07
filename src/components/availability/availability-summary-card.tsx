import { SunIcon, TrendingUpIcon, TimerIcon } from "lucide-react";
import type { AvailabilityStats } from "@/components/availability/shared";
import { DAY_NAMES } from "@/components/availability/constants";

export function AvailabilitySummaryCard({ stats }: { stats: AvailabilityStats }) {
  const items = [
    {
      icon: <TimerIcon className="size-4 text-accent" />,
      label: "Durée moyenne par créneau",
      value: stats.avgSlotMinutes ? `${Math.round(stats.avgSlotMinutes)} min` : "—",
    },
    {
      icon: <TrendingUpIcon className="size-4 text-accent" />,
      label: "Jour le plus disponible",
      value: stats.bestDay !== null ? DAY_NAMES[stats.bestDay] : "—",
    },
    {
      icon: <SunIcon className="size-4 text-accent" />,
      label: "Charge hebdomadaire",
      value: stats.hours ? `${stats.hours.toFixed(1).replace(".0", "")} h / semaine` : "—",
    },
  ];
  return (
    <ul className="divide-y divide-border">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-3 py-2.5">
          {it.icon}
          <span className="text-sm text-muted-foreground">{it.label}</span>
          <span className="ml-auto text-sm font-semibold">{it.value}</span>
        </li>
      ))}
    </ul>
  );
}