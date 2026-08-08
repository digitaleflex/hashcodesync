"use client";

import { GroupsManager } from "@/components/groups-manager";
import { PageTitle } from "@/components/ui/page-title";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

export default function GroupesPage() {
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "mentor";

  return (
    <main>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <PageTitle
          title="Groupes"
          subtitle="Organisez votre participation aux groupes et activités de votre cohorte."
          actions={
            isAdmin ? (
              <Button nativeButton={false} render={<Link href="/admin/groupes" />} size="sm">
                <PlusIcon className="h-4 w-4" />
                Créer un groupe
              </Button>
            ) : undefined
          }
        />
        <GroupsManager />
      </div>
    </main>
  );
}
