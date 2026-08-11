import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyMany } from "@/lib/notifications";
import { sendEmailForNotification } from "@/lib/email-notification-templates";

type Ctx = { params: Promise<{ id: string; userId: string }> };

// POST /api/admin/workshops/:id/waitlist/:userId/promote
// Promote un utilisateur de la waitlist vers participant.
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "mentor") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id, userId } = await params;

  const result = await prisma.$transaction(
    async (tx) => {
      const workshop = await tx.workshop.findUnique({ where: { id } });
      if (!workshop) {
        return { type: "not_found" as const };
      }

      const existing = await tx.participant.findUnique({
        where: { workshopId_userId: { workshopId: id, userId } },
      });
      if (existing) {
        return { type: "already" as const };
      }

      if (workshop.capacity) {
        const acceptedCount = await tx.participant.count({
          where: { workshopId: id, status: "accepted" },
        });
        if (acceptedCount >= workshop.capacity) {
          return { type: "full" as const };
        }
      }

      await tx.participant.create({
        data: { workshopId: id, userId, status: "accepted" },
      });

      await tx.waitlist.deleteMany({
        where: { workshopId: id, userId },
      });

      return { type: "ok" as const, title: workshop.title };
    },
    { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 }
  );

  if (result.type === "not_found") {
    return NextResponse.json({ error: "Atelier introuvable" }, { status: 404 });
  }
  if (result.type === "already") {
    return NextResponse.json({ error: "Cet utilisateur est déjà participant" }, { status: 409 });
  }
  if (result.type === "full") {
    return NextResponse.json({ error: "Capacité maximale atteinte" }, { status: 409 });
  }

  await notifyMany([userId], {
    type: "group_join_accepted",
    title: "Place confirmée",
    message: `Votre place a été confirmée pour l'atelier "${result.title}".`,
  });

  await sendEmailForNotification([userId], "group_join_accepted", {
    groupName: result.title,
    actionUrl: `${req.nextUrl.origin}/ateliers/${id}`,
  });

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/workshops/:id/waitlist/:userId
// Retire un utilisateur de la waitlist.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "mentor") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id, userId } = await params;
  await prisma.waitlist.deleteMany({
    where: { workshopId: id, userId },
  });

  return NextResponse.json({ success: true });
}
