import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MentorDashboard } from "@/components/mentor-dashboard";
import { PageTitle } from "@/components/ui/page-title";

export default async function MentorPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  if (
    session.user.role !== "mentor" &&
    session.user.role !== "admin"
  ) {
    redirect("/forbidden");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <PageTitle
        title="Tableau de bord Mentor"
        subtitle="Trouvez les meilleurs créneaux pour vos ateliers et suivez les disponibilités de la cohorte."
      />
      <MentorDashboard />
    </div>
  );
}