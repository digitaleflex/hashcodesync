import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminWorkshopsManager } from "@/components/admin-workshops-manager";
import { PageTitle } from "@/components/ui/page-title";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAteliersPage() {
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
          title="Gestion des ateliers"
          subtitle="Consultez, modifiez et supprimez les ateliers de la cohorte."
          actions={
            <Button nativeButton={false} render={<Link href="/ateliers/nouveau" />}>
              <PlusIcon /> Nouvel atelier
            </Button>
          }
        />
        <AdminWorkshopsManager />
      </div>
    </main>
  );
}
