import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminGroups } from "@/components/admin-groups";
import { PageTitle } from "@/components/ui/page-title";

export const dynamic = "force-dynamic";

export default async function AdminGroupesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.role !== "admin" && session.user.role !== "mentor") {
    redirect("/forbidden");
  }

  return (
    <main>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <PageTitle
          title="Gestion des groupes"
          subtitle="Créez des groupes, gérez les activités, les membres et les demandes d'accès."
        />
        <AdminGroups />
      </div>
    </main>
  );
}