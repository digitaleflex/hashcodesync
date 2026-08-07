import { GroupsManager } from "@/components/groups-manager";
import { PageTitle } from "@/components/ui/page-title";

export default function GroupesPage() {
  return (
    <main>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <PageTitle
          title="Groupes"
          subtitle="Rejoignez des équipes, donnez vos disponibilités par groupe et activité."
        />
        <GroupsManager />
      </div>
    </main>
  );
}