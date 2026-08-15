import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyMany } from "@/lib/notifications";
import { sendEmailForNotification } from "@/lib/email-notification-templates";

const include = {
  creator: { select: { id: true, name: true, email: true } },
  series: { select: { id: true, name: true } },
  mentee: { select: { id: true, name: true, email: true } },
  activity: { select: { id: true, name: true, type: true } },
  participants: {
    select: {
      id: true,
      userId: true,
      status: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  attendance: {
    select: { id: true, userId: true, status: true },
  },
};

type Body = {
  title?: unknown;
  description?: unknown;
  startAt?: unknown;
  endAt?: unknown;
  capacity?: unknown;
  location?: unknown;
  meetingUrl?: unknown;
  seriesId?: unknown;
  type?: unknown;
  menteeId?: unknown;
  activityId?: unknown;
  requiresMentor?: unknown;
};

function parseBody(body: Body) {
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const startAt = new Date(String(body.startAt ?? ""));
  const endAt = new Date(String(body.endAt ?? ""));
  const capacity =
    body.capacity !== undefined && body.capacity !== null && String(body.capacity).trim() !== ""
      ? Math.max(1, Number(body.capacity))
      : undefined;
  const location = String(body.location ?? "").trim() || null;
  const meetingUrl = String(body.meetingUrl ?? "").trim() || null;
  const seriesId = String(body.seriesId ?? "").trim() || null;
  const rawType = String(body.type ?? "atelier").trim();
  const type = rawType === "mentorship_session" ? "mentorship_session" : "atelier";
  const menteeId = String(body.menteeId ?? "").trim() || null;
  const activityId = String(body.activityId ?? "").trim() || null;
  const requiresMentor = body.requiresMentor === true || body.requiresMentor === "true";
  return { title, description, startAt, endAt, capacity, location, meetingUrl, seriesId, type, menteeId, activityId, requiresMentor };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const { id } = await params;
    const workshop = await prisma.workshop.findUnique({ where: { id }, include });
    if (!workshop) {
      return NextResponse.json({ error: "Atelier introuvable" }, { status: 404 });
    }
    if (session.user.role !== "admin" && session.user.role !== "mentor") {
      if (workshop.creator) workshop.creator = { id: workshop.creator.id, name: workshop.creator.name } as typeof workshop.creator;
      if (workshop.mentee) workshop.mentee = { id: workshop.mentee.id, name: workshop.mentee.name } as typeof workshop.mentee;
      workshop.participants.forEach((p) => {
        p.user = (p.user ? { id: p.user.id, name: p.user.name } : null) as typeof p.user;
      });
    }
    return NextResponse.json(workshop);
  } catch (e) {
    console.error("GET /api/ateliers/[id] erreur", e);
    return NextResponse.json({ error: "Impossible de charger l'atelier" }, { status: 500 });
  }
}

export async function PATCH(
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
    if (workshop.createdBy !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    let body: Body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
    }
    const {
      title,
      description,
      startAt,
      endAt,
      capacity,
      location,
      meetingUrl,
      seriesId,
      type,
      menteeId,
      activityId,
      requiresMentor,
    } = parseBody(body);

    if (!title) {
      return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });
    }
    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
    }
    if (endAt <= startAt) {
      return NextResponse.json(
        { error: "La fin doit être après le début" },
        { status: 400 }
      );
    }

    const data: {
      title: string;
      description: string | null;
      startAt: Date;
      endAt: Date;
      capacity?: number | null;
      location?: string | null;
      meetingUrl?: string | null;
      seriesId?: string | null;
      type?: string;
      menteeId?: string | null;
      activityId?: string | null;
      requiresMentor?: boolean;
    } = { title, description, startAt, endAt };
    if (capacity !== undefined) data.capacity = capacity;
    if (location !== undefined) data.location = location;
    if (meetingUrl !== undefined) data.meetingUrl = meetingUrl;
    if (seriesId !== undefined) data.seriesId = seriesId;
    if (type !== undefined) data.type = type;
    if (menteeId !== undefined) data.menteeId = type === "mentorship_session" ? menteeId : null;
    if (activityId !== undefined) data.activityId = activityId;
    if (requiresMentor !== undefined) data.requiresMentor = requiresMentor;

    const updated = await prisma.workshop.update({
      where: { id },
      data,
      include,
    });

    if (type === "mentorship_session" && menteeId) {
      await prisma.participant.upsert({
        where: { workshopId_userId: { workshopId: id, userId: menteeId } },
        create: { workshopId: id, userId: menteeId, status: "accepted" },
        update: { status: "accepted" },
      });

      await notifyMany([menteeId], {
        type: "mentorship_session",
        title: "Session de mentorat modifiée",
        message: `La session de mentorat "${updated.title}" a été modifiée par ${session.user.name ?? "le créateur"}.`,
      });

      await sendEmailForNotification([menteeId], "mentorship_session", {
        actorName: session.user.name,
        workshopTitle: updated.title,
        actionUrl: `${req.nextUrl.origin}/ateliers/${updated.id}`,
      });
    } else {
      const participants = await prisma.participant.findMany({
        where: { workshopId: id, userId: { not: session.user.id } },
        select: { userId: true },
      });
      await notifyMany(participants.map((p) => p.userId), {
        type: "workshop_update",
        title: "Atelier modifié",
        message: `${updated.title}`,
      });

      await sendEmailForNotification(participants.map((p) => p.userId), "workshop_update", {
        actorName: session.user.name,
        workshopTitle: updated.title,
        actionUrl: `${req.nextUrl.origin}/ateliers/${updated.id}`,
      });
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/ateliers/[id] erreur", e);
    return NextResponse.json({ error: "Impossible de modifier l'atelier" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
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
    if (workshop.createdBy !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const participants = await prisma.participant.findMany({
      where: { workshopId: id, userId: { not: session.user.id } },
      select: { userId: true },
    });

    await prisma.workshop.delete({ where: { id } });

    await notifyMany(participants.map((p) => p.userId), {
      type: "workshop_cancelled",
      title: "Atelier annulé",
      message: `${workshop.title} a été annulé.`,
    });

    await sendEmailForNotification(participants.map((p) => p.userId), "workshop_cancelled", {
      actorName: session.user.name,
      workshopTitle: workshop.title,
      actionUrl: `${new URL(req.url).origin}/ateliers`,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/ateliers/[id] erreur", e);
    return NextResponse.json({ error: "Impossible de supprimer l'atelier" }, { status: 500 });
  }
}