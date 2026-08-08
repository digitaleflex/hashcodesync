import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { PlusIcon } from "lucide-react";
import { WorkshopsManager } from "@/components/workshops-manager";

export const dynamic = "force-dynamic";

export default async function AteliersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const raw = await prisma.workshop.findMany({
    orderBy: { startAt: "asc" },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      series: { select: { id: true, name: true } },
      participants: {
        select: {
          id: true,
          userId: true,
          status: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  const workshops = raw.map((w) => ({
    ...w,
    startAt: w.startAt.toISOString(),
    endAt: w.endAt.toISOString(),
  }));

  return (
    <main>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <PageTitle
          title="Ateliers"
          subtitle="Planifiez, rejoignez et suivez les sessions de la cohorte."
          actions={
            session?.user && session.user.role === "admin" ? (
              <Button nativeButton={false} render={<Link href="/ateliers/nouveau" />}>
                <PlusIcon /> Nouvel atelier
              </Button>
            ) : undefined
          }
        />
        <WorkshopsManager initial={workshops} />
      </div>
    </main>
  );
}