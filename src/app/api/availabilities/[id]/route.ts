import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { currentWeekStart } from "@/lib/timezone";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAYS = [0, 1, 2, 3, 4, 5, 6];

async function ensureEditable(userId: string): Promise<NextResponse | null> {
  const lock = await prisma.weeklyValidation.findUnique({
    where: { userId_weekStart: { userId, weekStart: currentWeekStart() } },
  });
  if (lock) {
    return NextResponse.json(
      { error: "Semaine validée : vous ne pouvez plus modifier vos disponibilités" },
      { status: 423 }
    );
  }
  return null;
}

// DELETE /api/availabilities/[id] -> supprimer un créneau.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const blocked = await ensureEditable(session.user.id);
  if (blocked) return blocked;

  const { id } = await params;

  const existing = await prisma.availability.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Créneau introuvable" }, { status: 404 });
  }

  await prisma.availability.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/availabilities/[id] -> modifier un créneau existant.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const blocked = await ensureEditable(session.user.id);
  if (blocked) return blocked;

  const { id } = await params;

  let body: {
    day?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    groupId?: unknown;
    activityId?: unknown;
    recurring?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const existing = await prisma.availability.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Créneau introuvable" }, { status: 404 });
  }

  const day = body.day !== undefined ? Number(body.day) : existing.day;
  const startTime = body.startTime !== undefined ? String(body.startTime) : existing.startTime;
  const endTime = body.endTime !== undefined ? String(body.endTime) : existing.endTime;
  const groupId = body.groupId !== undefined ? (body.groupId ? String(body.groupId) : null) : existing.groupId;
  const activityId = body.activityId !== undefined ? (body.activityId ? String(body.activityId) : null) : existing.activityId;
  const recurring = body.recurring !== undefined ? Boolean(body.recurring) : existing.recurring;

  if (!DAYS.includes(day)) {
    return NextResponse.json({ error: "Jour invalide" }, { status: 400 });
  }
  if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
    return NextResponse.json({ error: "Format d'heure invalide (HH:mm)" }, { status: 400 });
  }
  if (startTime >= endTime) {
    return NextResponse.json(
      { error: "L'heure de fin doit être après l'heure de début" },
      { status: 400 }
    );
  }

  if (groupId) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "Vous n'êtes pas membre de ce groupe" },
        { status: 403 }
      );
    }
    if (activityId) {
      const activity = await prisma.groupActivity.findFirst({
        where: { id: activityId, groupId },
      });
      if (!activity) {
        return NextResponse.json(
          { error: "Activité invalide pour ce groupe" },
          { status: 400 }
        );
      }
    }
  }

  // Vérifier les chevauchements (exclure le créneau modifié).
  const overlapWhere: Record<string, unknown> = {
    userId: session.user.id,
    day,
    NOT: { id },
    AND: [
      { startTime: { lt: endTime } },
      { endTime: { gt: startTime } },
    ],
  };
  if (groupId) {
    overlapWhere.groupId = groupId;
    overlapWhere.activityId = activityId ?? undefined;
  } else {
    overlapWhere.groupId = null;
    overlapWhere.activityId = null;
  }

  const overlapping = await prisma.availability.findFirst({
    where: overlapWhere,
  });
  if (overlapping) {
    return NextResponse.json(
      { error: "Ce créneau chevauche une disponibilité existante" },
      { status: 409 }
    );
  }

  const updated = await prisma.availability.update({
    where: { id },
    data: { day, startTime, endTime, groupId, activityId, recurring },
    include: {
      group: { select: { id: true, name: true } },
      activity: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}
