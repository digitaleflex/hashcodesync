import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { currentWeekStart } from "@/lib/timezone";
import { withCache } from "@/lib/cache";

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

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const url = new URL(req.url);
  const rawGroupId = url.searchParams.get("groupId");
  const rawActivityId = url.searchParams.get("activityId");

  const and: Record<string, unknown>[] = [{ userId: session.user.id }];
  if (rawGroupId) and.push({ groupId: rawGroupId });
  if (rawActivityId) and.push({ activityId: rawActivityId });

  const availabilities = await prisma.availability.findMany({
    where: { AND: and },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
    include: {
      group: { select: { id: true, name: true } },
      activity: { select: { id: true, name: true } },
    },
  });

  return withCache(availabilities, 15);
}

// POST /api/availabilities -> créer une dispo (optionnellement liée groupe/activité).
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: {
    day?: unknown;
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

  const blocked = await ensureEditable(session.user.id);
  if (blocked) return blocked;

  const day = Number(body.day);
  const startTime = String(body.startTime ?? "");
  const endTime = String(body.endTime ?? "");
  const groupId = body.groupId ? String(body.groupId) : null;
  const activityId = body.activityId ? String(body.activityId) : null;

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

  // Vérifier que l'utilisateur est membre du groupe (si groupe fourni).
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
    // Une dispo liée à activité doit concerner une activité de ce groupe.
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

  const existing = await prisma.availability.findMany({
    where: {
      userId: session.user.id,
      day,
      groupId: groupId ?? undefined,
      activityId: activityId ?? undefined,
    },
  });
  const overlaps = existing.some(
    (a) => startTime < a.endTime && endTime > a.startTime
  );
  if (overlaps) {
    return NextResponse.json(
      { error: "Ce créneau chevauche une disponibilité existante" },
      { status: 409 }
    );
  }

  const created = await prisma.availability.create({
    data: {
      userId: session.user.id,
      day,
      startTime,
      endTime,
      groupId,
      activityId,
    },
    include: {
      group: { select: { id: true, name: true } },
      activity: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(created, { status: 201 });
}