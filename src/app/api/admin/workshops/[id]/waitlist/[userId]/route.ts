import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyMany } from "@/lib/notifications";
import { sendEmailForNotification } from "@/lib/email-notification-templates";

type Ctx = { params: Promise<{ id: string; userId: string }> };

// POST /api/admin/workshops/:id/waitlist/:userId/promote
// Promote un utilisateur de la waitlist vers participant.
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "mentor") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id, userId } = await params;
  const workshop = await prisma.workshop.findUnique({ where: { id } });
  if (!workshop) {
    return NextResponse.json({ error: "Atelier introuvable" }, { status: 404 });
  }

  const existing = await prisma.participant.findUnique({
    where: { workshopId_userId: { workshopId: id, userId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Cet utilisateur est déjà participant" }, { status: 409 });
  }

  if (workshop.capacity) {
    const acceptedCount = await prisma.participant.count({
      where: { workshopId: id, status: "accepted" },
    });
    if (acceptedCount >= workshop.capacity) {
      return NextResponse.json({ error: "Capacité maximale atteinte" }, { status: 409 });
    }
  }

  await prisma.participant.create({
    data: { workshopId: id, userId, status: "accepted" },
  });

  await prisma.waitlist.deleteMany({
    where: { workshopId: id, userId },
  });

  await notifyMany([userId], {
    type: "group_join_accepted",
    title: "Place confirmée",
    message: `Votre place a été confirmée pour l'atelier "${workshop.title}".`,
  });

  await sendEmailForNotification([userId], "group_join_accepted", {
    groupName: workshop.title,
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
