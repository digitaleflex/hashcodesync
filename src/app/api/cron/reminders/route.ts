import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyMany } from "@/lib/notifications";
import { sendEmailForNotification } from "@/lib/email-notification-templates";

// POST /api/cron/reminders
// Endpoint sans auth, protégé par une clé secrète dans l'en-tête X-Cron-Secret.
// À appeler par un cron externe (Vercel Cron, GitHub Actions, etc.) toutes les heures.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const workshops = await prisma.workshop.findMany({
    where: {
      startAt: { gte: now, lte: in24h },
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      type: true,
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

    const isMentorship = workshop.type === "mentorship_session";
    const notifTitle = isMentorship ? "Rappel : session de mentorat" : "Rappel d'atelier";
    const notifMessage = isMentorship
      ? `Vous avez une session de mentorat à venir : "${workshop.title}" (${workshop.startAt.toLocaleString("fr-FR")}).`
      : `L'atelier "${workshop.title}" commence bientôt (${workshop.startAt.toLocaleString("fr-FR")}).`;

    await notifyMany(userIds, {
      type: "reminder",
      title: notifTitle,
      message: notifMessage,
    });

    const emailType = isMentorship ? "mentorship_reminder" : "workshop_reminder";
    await sendEmailForNotification(userIds, emailType, {
      workshopTitle: workshop.title,
      actionUrl: `${req.nextUrl.origin}/ateliers/${workshop.id}`,
    });

    totalNotified += userIds.length;
  }

  return NextResponse.json({ notified: totalNotified, workshops: workshops.length });
}
