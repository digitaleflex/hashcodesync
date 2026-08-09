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

// POST /api/availabilities/copy
// Copie les créneaux d'un snapshot de semaine validée vers les disponibilités actuelles.
// Body: { snapshotId: string }
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { snapshotId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const blocked = await ensureEditable(session.user.id);
  if (blocked) return blocked;

  const snapshotId = String(body.snapshotId ?? "");
  if (!snapshotId) {
    return NextResponse.json({ error: "snapshotId manquant" }, { status: 400 });
  }

  const snapshot = await prisma.weekSnapshot.findFirst({
    where: { id: snapshotId, userId: session.user.id },
    include: { slots: true },
  });
  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot introuvable" }, { status: 404 });
  }

  // Récupérer les disponibilités existantes (générales uniquement) pour vérifier les chevauchements.
  const existing = await prisma.availability.findMany({
    where: { userId: session.user.id, groupId: null, activityId: null },
  });

  const existingByDay = new Map<number, { start: string; end: string }[]>();
  for (const a of existing) {
    const arr = existingByDay.get(a.day) ?? [];
    arr.push({ start: a.startTime, end: a.endTime });
    existingByDay.set(a.day, arr);
  }

  // Préparer les slots à créer (sans groupe/activité car les snapshots ne les stockent pas).
  const toCreate = snapshot.slots.map((s) => ({
    day: s.day,
    startTime: s.startTime,
    endTime: s.endTime,
  }));

  for (const slot of toCreate) {
    const dayExisting = existingByDay.get(slot.day) ?? [];
    const overlaps = dayExisting.some(
      (e) => slot.startTime < e.end && slot.endTime > e.start
    );
    if (overlaps) {
      return NextResponse.json(
        {
          error: `Chevauchement détecté le jour ${DAYS[slot.day]} (${slot.startTime}–${slot.endTime})`,
        },
        { status: 409 }
      );
    }
    // Vérifier entre les nouveaux slots.
    for (let i = 0; i < toCreate.length; i++) {
      if (toCreate[i].day === slot.day) {
        for (let j = i + 1; j < toCreate.length; j++) {
          if (toCreate[j].day === slot.day) {
            if (slot.startTime < toCreate[j].endTime && slot.endTime > toCreate[j].startTime) {
              return NextResponse.json(
                { error: `Chevauchement entre deux créneaux copiés le jour ${DAYS[slot.day]}` },
                { status: 409 }
              );
            }
          }
        }
      }
    }
  }

  const created = await prisma.$transaction(
    toCreate.map((s) =>
      prisma.availability.create({
        data: {
          userId: session.user.id,
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
          recurring: false,
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
