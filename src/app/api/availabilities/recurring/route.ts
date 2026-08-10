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

// GET /api/availabilities/recurring -> motifs récurrents de l'utilisateur.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const patterns = await prisma.recurringAvailability.findMany({
    where: { userId: session.user.id },
    orderBy: [{ startTime: "asc" }, { dayMask: "asc" }],
    include: patternInclude,
  });

  return NextResponse.json(patterns);
}

// POST /api/availabilities/recurring -> créer (ou retrouver) un motif récurrent.
// Body: { dayMask, startTime, endTime, groupId?, activityId? }
// dayMask = 127 pour « tous les jours », ou masque sans le(s) jour(s) à exclure.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
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

  const dayMask = validateDayMask(body.dayMask);
  const startTime = String(body.startTime ?? "");
  const endTime = String(body.endTime ?? "");
  const groupId = body.groupId ? String(body.groupId) : null;
  const activityId = body.activityId ? String(body.activityId) : null;

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

  // Idempotence : un motif identique ne doit pas être dupliqué.
  const existing = await prisma.recurringAvailability.findFirst({
    where: {
      userId: session.user.id,
      dayMask,
      startTime,
      endTime,
      groupId,
      activityId,
    },
  });
  if (existing) {
    return NextResponse.json(existing);
  }

  const created = await prisma.recurringAvailability.create({
    data: {
      userId: session.user.id,
      dayMask,
      startTime,
      endTime,
      groupId,
      activityId,
    },
    include: patternInclude,
  });

  return NextResponse.json(created, { status: 201 });
}
