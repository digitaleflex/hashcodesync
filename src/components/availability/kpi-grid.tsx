import { StatCard } from "@/components/ui/stat-card";
import { ClockIcon, CalendarDaysIcon, ListChecksIcon, SparklesIcon } from "lucide-react";
import type { AvailabilityStats } from "@/components/availability/shared";

export function KpiGrid({ stats }: { stats: AvailabilityStats }) {
  const hoursLabel = stats.hours ? stats.hours.toFixed(1).replace(".0", "") : "0";
  const workshops = Math.floor(stats.minutes / 90);
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard
        icon={<ClockIcon className="size-4 text-accent" />}
        label="Disponibilité"
        value={`${hoursLabel} h`}
        footnote="par semaine"
      />
      <StatCard
        icon={<ListChecksIcon className="size-4 text-accent" />}
        label="Créneaux"
        value={stats.slots}
        footnote={stats.slots > 1 ? "créneaux définis" : stats.slots === 1 ? "créneau défini" : "aucun créneau"}
      />
      <StatCard
        icon={<CalendarDaysIcon className="size-4 text-accent" />}
        label="Jours couverts"
        value={stats.daysCount}
        footnote="sur 7 jours"
      />
      <StatCard
        icon={<SparklesIcon className="size-4 text-accent" />}
        label="Ateliers"
        value={`≈ ${workshops}`}
        footnote="de 1 h 30 chacun"
      />
    </div>
  );
}