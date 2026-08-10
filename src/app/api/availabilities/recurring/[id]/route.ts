import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateDayMask(value: unknown): number | null {
  const mask = Number(value);
  if (!Number.isInteger(mask) || mask < 1 || mask > 127) return null;
  return mask;
}

const patternInclude = {
  group: { select: { id: true, name: true } },
  activity: { select: { id: true, name: true } },
} as const;

async function findOwned(userId: string, id: string) {
  return prisma.recurringAvailability.findFirst({
    where: { id, userId },
    include: patternInclude,
  });
}

// DELETE /api/availabilities/recurring/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.recurringAvailability.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Motif introuvable" }, { status: 404 });
  }

  await prisma.recurringAvailability.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/availabilities/recurring/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.recurringAvailability.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Motif introuvable" }, { status: 404 });
  }

  let body: {
    dayMask?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    groupId?: unknown;
    activityId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const dayMask = body.dayMask !== undefined ? validateDayMask(body.dayMask) : existing.dayMask;
  const startTime = body.startTime !== undefined ? String(body.startTime) : existing.startTime;
  const endTime = body.endTime !== undefined ? String(body.endTime) : existing.endTime;
  const groupId = body.groupId !== undefined ? (body.groupId ? String(body.groupId) : null) : existing.groupId;
  const activityId = body.activityId !== undefined ? (body.activityId ? String(body.activityId) : null) : existing.activityId;

  if (dayMask == null) {
    return NextResponse.json(
      { error: "dayMask invalide (entier entre 1 et 127)" },
      { status: 400 }
    );
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

  const updated = await prisma.recurringAvailability.update({
    where: { id },
    data: { dayMask, startTime, endTime, groupId, activityId },
    include: patternInclude,
  });

  return NextResponse.json(updated);
}

// GET /api/availabilities/recurring/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const pattern = await findOwned(session.user.id, id);
  if (!pattern) {
    return NextResponse.json({ error: "Motif introuvable" }, { status: 404 });
  }
  return NextResponse.json(pattern);
}
