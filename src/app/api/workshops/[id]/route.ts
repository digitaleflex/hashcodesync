import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyMany } from "@/lib/notifications";

const include = {
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
  attendance: {
    select: { id: true, userId: true, status: true },
  },
};

type Body = { title?: unknown; description?: unknown; startAt?: unknown; endAt?: unknown };

function parseBody(body: Body) {
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const startAt = new Date(String(body.startAt ?? ""));
  const endAt = new Date(String(body.endAt ?? ""));
  return { title, description, startAt, endAt };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const workshop = await prisma.workshop.findUnique({ where: { id }, include });
  if (!workshop) {
    return NextResponse.json({ error: "Atelier introuvable" }, { status: 404 });
  }
  return NextResponse.json(workshop);
}

export async function PATCH(
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
  if (workshop.createdBy !== session.user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const { title, description, startAt, endAt } = parseBody(body);

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

  const updated = await prisma.workshop.update({
    where: { id },
    data: { title, description, startAt, endAt },
    include,
  });

  const participants = await prisma.participant.findMany({
    where: { workshopId: id, userId: { not: session.user.id } },
    select: { userId: true },
  });
  await notifyMany(participants.map((p) => p.userId), {
    type: "workshop_update",
    title: "Atelier modifié",
    message: `${updated.title}`,
  });

  return NextResponse.json(updated);
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
  const workshop = await prisma.workshop.findUnique({ where: { id } });
  if (!workshop) {
    return NextResponse.json({ error: "Atelier introuvable" }, { status: 404 });
  }
  if (workshop.createdBy !== session.user.id) {
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

  return NextResponse.json({ success: true });
}