import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyMany } from "@/lib/notifications";
import { sendEmailForNotification } from "@/lib/email-notification-templates";

// POST /api/reminders
// Corps optionnel : { workshopId?: string }
// - Sans workshopId : envoie un rappel pour tous les ateliers à venir dans les 24h.
// - Avec workshopId : envoie un rappel pour cet atelier uniquement.
// Protégé : réservé aux admins/mentors (ou à un worker avec une clé API en production).
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "mentor") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: { workshopId?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // corps optionnel
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {
    startAt: { gte: now, lte: in24h },
  };
  if (typeof body.workshopId === "string" && body.workshopId) {
    where.id = body.workshopId;
  }

  const workshops = await prisma.workshop.findMany({
    where,
    include: {
      participants: {
        where: { status: "accepted" },
        select: { userId: true },
      },
    },
  });

  let totalNotified = 0;
  for (const workshop of workshops) {
    const userIds = workshop.participants.map((p) => p.userId);
    if (userIds.length === 0) continue;

    await notifyMany(userIds, {
      type: "reminder",
      title: "Rappel d'atelier",
      message: `L'atelier "${workshop.title}" commence bientôt (${workshop.startAt.toLocaleString("fr-FR")}).`,
    });

    await sendEmailForNotification(userIds, "workshop_reminder", {
      workshopTitle: workshop.title,
      actionUrl: `${req.nextUrl.origin}/ateliers/${workshop.id}`,
    });

    totalNotified += userIds.length;
  }

  return NextResponse.json({ notified: totalNotified, workshops: workshops.length });
}
