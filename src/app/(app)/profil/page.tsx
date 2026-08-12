import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeMassHours } from "@/lib/masse-horaire";
import { presenceProbability } from "@/lib/probability";
import { ProfilView } from "@/components/profil/profil-view";
import { PageTitle } from "@/components/ui/page-title";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const roleLabels: Record<string, string> = {
  member: "Membre",
  mentor: "Mentor",
  admin: "Administrateur",
};

// Seuil sous lequel on considère l'historique insuffisant pour afficher un
// score de fiabilité (on affiche alors « Pas encore suffisamment de données »).
const MIN_OBSERVATIONS = 3;

export default async function ProfilPage() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) redirect("/login");

    const userId = session.user.id;

    const [user, groups, prefs, unavailabilities, availabilities, attendance] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            firstname: true,
            lastname: true,
            role: true,
            timezone: true,
            createdAt: true,
            emailVerified: true,
          },
        }),
        prisma.groupMember.findMany({
          where: { userId },
          select: {
            role: true,
            joinedAt: true,
            group: { select: { id: true, name: true } },
          },
          orderBy: { joinedAt: "asc" },
        }),
        prisma.planningPreferences.findUnique({ where: { userId } }),
        prisma.unavailability.findMany({
          where: { userId },
          orderBy: { startDate: "desc" },
        }),
        prisma.availability.findMany({
          where: { userId },
          select: { day: true, startTime: true, endTime: true },
        }),
        prisma.attendance.findMany({
          where: { userId },
          select: { status: true },
        }),
      ]);

    if (!user) redirect("/login");

    const hours = computeMassHours(availabilities);
    const present = attendance.filter((a) => a.status === "present").length;
    const absent = attendance.filter((a) => a.status === "absent").length;
    const observations = present + absent;
    const probability =
      observations >= MIN_OBSERVATIONS
        ? presenceProbability({ present, absent }, hours)
        : null;

    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <PageTitle
          title="Mon profil"
          subtitle="Votre centre de contrôle personnel : identité, planification, sécurité."
          badge={
            <span className="inline-flex h-6 items-center rounded-full bg-accent/15 px-3 text-xs font-medium text-accent">
              {roleLabels[user.role] ?? "Membre"}
            </span>
          }
        />
        <ProfilView
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            firstname: user.firstname,
            lastname: user.lastname,
            role: user.role,
            timezone: user.timezone,
            createdAt: user.createdAt.toISOString(),
            emailVerified: user.emailVerified,
          }}
          groups={groups.map((g) => ({
            id: g.group.id,
            name: g.group.name,
            role: g.role,
          }))}
          planningPreferences={prefs}
          unavailabilities={unavailabilities.map((u) => ({
            id: u.id,
            startDate: u.startDate.toISOString().slice(0, 10),
            endDate: u.endDate.toISOString().slice(0, 10),
            reason: u.reason,
          }))}
          availability={{
            slots: availabilities.length,
            hours,
            hasData: availabilities.length > 0,
          }}
          reliability={{
            present,
            absent,
            observations,
            probability,
          }}
        />
      </div>
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.digest &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("Erreur chargement profil:", error);
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <PageTitle
          title="Mon profil"
          subtitle="Votre centre de contrôle personnel : identité, planification, sécurité."
        />
        <Card>
          <CardHeader>
            <CardTitle>Erreur</CardTitle>
            <CardDescription>
              Impossible de charger le profil. Veuillez réessayer plus tard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
}