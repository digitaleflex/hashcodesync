import { GroupsManager } from "@/components/groups-manager";

export default function GroupesPage() {
  return (
    <main>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold">Groupes</h1>
          <p className="text-sm text-muted-foreground">
            Rejoignez des équipes, donnez vos disponibilités par groupe et
            activité.
          </p>
        </div>
        <GroupsManager />
      </div>
    </main>
  );
}