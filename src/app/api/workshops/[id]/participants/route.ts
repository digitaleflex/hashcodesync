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

    let status = "accepted";
    try {
      const body = await req.json();
      if (typeof body.status === "string") status = body.status;
    } catch {
      // pas de corps JSON : on garde le statut par défaut "accepted"
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const workshop = await tx.workshop.findUnique({ where: { id } });
        if (!workshop) {
          return { type: "not_found" as const };
        }

        const existing = await tx.participant.findUnique({
          where: { workshopId_userId: { workshopId: id, userId: session.user.id } },
        });

        if (existing && existing.status === "accepted") {
          return { type: "already" as const };
        }

        if (workshop.capacity && !existing) {
          const acceptedCount = await tx.participant.count({
            where: { workshopId: id, status: "accepted" },
          });
          if (acceptedCount >= workshop.capacity) {
            const onWaitlist = await tx.waitlist.findUnique({
              where: { workshopId_userId: { workshopId: id, userId: session.user.id } },
            });
            if (!onWaitlist) {
              await tx.waitlist.create({
                data: { workshopId: id, userId: session.user.id },
              });
            }
            return { type: "waitlist" as const };
          }
        }

        const participant = await tx.participant.upsert({
          where: { workshopId_userId: { workshopId: id, userId: session.user.id } },
          create: { workshopId: id, userId: session.user.id, status },
          update: { status },
        });

        return {
          type: "ok" as const,
          participant,
          createdBy: workshop.createdBy,
          title: workshop.title,
        };
      },
      { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 }
    );

    if (result.type === "not_found") {
      return NextResponse.json({ error: "Atelier introuvable" }, { status: 404 });
    }
    if (result.type === "already") {
      return NextResponse.json({ error: "Vous êtes déjà inscrit à cet atelier." }, { status: 409 });
    }
    if (result.type === "waitlist") {
      return NextResponse.json(
        { error: "Atelier complet. Vous avez été ajouté à la liste d'attente." },
        { status: 409 }
      );
    }

    if (result.createdBy !== session.user.id) {
      await notifyMany([result.createdBy], {
        type: "participant_joined",
        title: "Nouveau participant",
        message: `${session.user.name ?? "Un membre"} a rejoint "${result.title}".`,
      });

      await sendEmailForNotification([result.createdBy], "participant_joined", {
        actorName: session.user.name,
        workshopTitle: result.title,
        actionUrl: `${req.nextUrl.origin}/ateliers/${id}`,
      });
    }

    return NextResponse.json(result.participant, { status: 201 });
  } catch (e) {
    console.error("POST /api/ateliers/[id]/participants erreur", e);
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
    console.error("DELETE /api/ateliers/[id]/participants erreur", e);
    return NextResponse.json({ error: "Impossible de quitter l'atelier" }, { status: 500 });
  }
}