import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageTitle } from "@/components/ui/page-title";
import { AdminMemberAvailabilities } from "@/components/admin/member-availabilities";

export const dynamic = "force-dynamic";

export default async function AdminDisponibilitesPage() {
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
          title="Disponibilités des membres"
          subtitle="Consultez les créneaux de chaque membre et l'historique de leurs semaines validées."
        />
        <AdminMemberAvailabilities />
      </div>
    </main>
  );
}
