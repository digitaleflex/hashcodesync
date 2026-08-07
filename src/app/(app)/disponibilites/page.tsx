import { AvailabilityManager } from "@/components/availability-manager";
import { PageTitle } from "@/components/ui/page-title";

export default function DisponibilitesPage() {
  return (
    <main>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <PageTitle title="Disponibilités" subtitle="Gérez vos créneaux hebdomadaires." />
        <AvailabilityManager />
      </div>
    </main>
  );
}