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
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const { id } = await params;
    const workshop = await prisma.workshop.findUnique({ where: { id } });
    if (!workshop) {
      return NextResponse.json({ error: "Atelier introuvable" }, { status: 404 });
    }

    const existing = await prisma.participant.findUnique({
      where: { workshopId_userId: { workshopId: id, userId: session.user.id } },
    });

    if (existing && existing.status === "accepted") {
      return NextResponse.json({ error: "Vous êtes déjà inscrit à cet atelier." }, { status: 409 });
    }

    if (workshop.capacity && !existing) {
      const acceptedCount = await prisma.participant.count({
        where: { workshopId: id, status: "accepted" },
      });
      if (acceptedCount >= workshop.capacity) {
        const onWaitlist = await prisma.waitlist.findUnique({
          where: { workshopId_userId: { workshopId: id, userId: session.user.id } },
        });
        if (!onWaitlist) {
          await prisma.waitlist.create({
            data: { workshopId: id, userId: session.user.id },
          });
        }
        return NextResponse.json(
          { error: "Atelier complet. Vous avez été ajouté à la liste d'attente." },
          { status: 409 }
        );
      }
    }

    let status = "accepted";
    try {
      const body = await req.json();
      if (typeof body.status === "string") status = body.status;
    } catch {
      // pas de corps JSON : on garde le statut par défaut "accepted"
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
  } catch (e) {
    console.error("POST /api/workshops/[id]/participants error", e);
    return NextResponse.json({ error: "Impossible de rejoindre l'atelier" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const { id } = await params;
    await prisma.participant.deleteMany({
      where: { workshopId: id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/workshops/[id]/participants error", e);
    return NextResponse.json({ error: "Impossible de quitter l'atelier" }, { status: 500 });
  }
}