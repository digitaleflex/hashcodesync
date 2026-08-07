import { AvailabilityManager } from "@/components/availability-manager";

export default function DisponibilitesPage() {
  return (
    <main>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold">Disponibilités</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos créneaux hebdomadaires.
          </p>
        </div>
        <AvailabilityManager />
      </div>
    </main>
  );
}