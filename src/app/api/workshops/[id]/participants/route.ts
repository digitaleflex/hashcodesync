import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyMany } from "@/lib/notifications";
import { sendEmailForNotification } from "@/lib/email-notification-templates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const workshop = await prisma.workshop.findUnique({ where: { id } });
  if (!workshop) {
    return NextResponse.json({ error: "Atelier introuvable" }, { status: 404 });
  }

  let status = "accepted";
  if (req.body) {
    const body = await req.json().catch(() => null);
    if (body && typeof body.status === "string") status = body.status;
  }

  const participant = await prisma.participant.upsert({
    where: { workshopId_userId: { workshopId: id, userId: session.user.id } },
    create: { workshopId: id, userId: session.user.id, status },
    update: { status },
  });

  if (workshop.createdBy !== session.user.id) {
    await notifyMany([workshop.createdBy], {
      type: "participant_joined",
      title: "Nouveau participant",
      message: `${session.user.name ?? "Un membre"} a rejoint "${workshop.title}".`,
    });

    await sendEmailForNotification([workshop.createdBy], "participant_joined", {
      actorName: session.user.name,
      workshopTitle: workshop.title,
    });
  }

  return NextResponse.json(participant, { status: 201 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.participant.deleteMany({
    where: { workshopId: id, userId: session.user.id },
  });
  return NextResponse.json({ success: true });
}