import { memo } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { ClockIcon, CalendarDaysIcon, ListChecksIcon, SparklesIcon } from "lucide-react";
import type { AvailabilityStats } from "@/components/availability/shared";

export const KpiGrid = memo(function KpiGrid({ stats }: { stats: AvailabilityStats }) {
  const hoursLabel = stats.hours ? stats.hours.toFixed(1).replace(".0", "") : "0";
  const workshops = Math.floor(stats.minutes / 90);
  const cards = [
    {
      icon: <ClockIcon className="size-4 text-accent" />,
      label: "Disponibilité",
      value: `${hoursLabel} h`,
      footnote: "par semaine",
    },
    {
      icon: <ListChecksIcon className="size-4 text-accent" />,
      label: "Créneaux",
      value: stats.slots,
      footnote:
        stats.slots > 1
          ? "créneaux définis"
          : stats.slots === 1
            ? "créneau défini"
            : "aucun créneau",
    },
    {
      icon: <CalendarDaysIcon className="size-4 text-accent" />,
      label: "Jours couverts",
      value: stats.daysCount,
      footnote: "sur 7 jours",
    },
    {
      icon: <SparklesIcon className="size-4 text-accent" />,
      label: "Ateliers",
      value: `≈ ${workshops}`,
      footnote: "de 1 h 30 chacun",
    },
  ];

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="w-[184px] shrink-0 snap-start sm:w-auto sm:shrink">
          <StatCard icon={c.icon} label={c.label} value={c.value} footnote={c.footnote} />
        </div>
      ))}
    </div>
  );
});