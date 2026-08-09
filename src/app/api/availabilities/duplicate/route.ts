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

// POST /api/availabilities/duplicate
// Duplique un créneau existant vers d'autres jours.
// Body: { sourceId: string, targetDays: number[], recurring?: boolean }
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { sourceId?: unknown; targetDays?: unknown; recurring?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const blocked = await ensureEditable(session.user.id);
  if (blocked) return blocked;

  const sourceId = String(body.sourceId ?? "");
  const targetDays = Array.isArray(body.targetDays) ? body.targetDays.map(Number) : [];
  const recurring = Boolean(body.recurring);

  if (!sourceId) {
    return NextResponse.json({ error: "sourceId manquant" }, { status: 400 });
  }
  if (targetDays.length === 0) {
    return NextResponse.json({ error: "Aucun jour cible fourni" }, { status: 400 });
  }
  if (targetDays.some((d) => !DAYS.includes(d))) {
    return NextResponse.json({ error: "Jour cible invalide" }, { status: 400 });
  }

  const source = await prisma.availability.findFirst({
    where: { id: sourceId, userId: session.user.id },
    include: {
      group: { select: { id: true, name: true } },
      activity: { select: { id: true, name: true } },
    },
  });
  if (!source) {
    return NextResponse.json({ error: "Créneau introuvable" }, { status: 404 });
  }

  // Vérifier les chevauchements pour chaque jour cible.
  for (const day of targetDays) {
    const overlapWhere: Record<string, unknown> = {
      userId: session.user.id,
      day,
    };
    if (source.groupId) {
      overlapWhere.groupId = source.groupId;
      overlapWhere.activityId = source.activityId ?? undefined;
    } else {
      overlapWhere.groupId = null;
      overlapWhere.activityId = null;
    }

    const existing = await prisma.availability.findMany({
      where: overlapWhere,
    });
    const overlaps = existing.some(
      (a) => source.startTime < a.endTime && source.endTime > a.startTime
    );
    if (overlaps) {
      return NextResponse.json(
        { error: `Chevauchement détecté le jour ${DAYS[day]} avec un créneau existant` },
        { status: 409 }
      );
    }
  }

  const created = await prisma.$transaction(
    targetDays.map((day) =>
      prisma.availability.create({
        data: {
          userId: session.user.id,
          day,
          startTime: source.startTime,
          endTime: source.endTime,
          groupId: source.groupId,
          activityId: source.activityId,
          recurring: source.recurring || recurring,
        },
        include: {
          group: { select: { id: true, name: true } },
          activity: { select: { id: true, name: true } },
        },
      })
    )
  );

  return NextResponse.json(created, { status: 201 });
}
