import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SchedulingDashboard } from "@/components/admin-scheduling";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { UsersIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "admin") {
    redirect("/forbidden");
  }

  return (
    <main>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <PageTitle
          title="Dashboard Administrateur"
          subtitle="Vue de la cohorte, heatmap et créneaux recommandés."
          actions={
            <Button
              nativeButton={false}
              render={<Link href="/admin/groupes" />}
              variant="outline"
            >
              <UsersIcon />
              Gérer les groupes
            </Button>
          }
        />
        <SchedulingDashboard />
      </div>
    </main>
  );
}