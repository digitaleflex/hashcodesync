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

// POST /api/availabilities/bulk -> créer plusieurs créneaux en une seule requête.
// Body: { slots: [{ day, startTime, endTime }], groupId?, activityId?, recurring? }
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: {
    slots?: { day?: unknown; startTime?: unknown; endTime?: unknown }[];
    groupId?: unknown;
    activityId?: unknown;
    recurring?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const blocked = await ensureEditable(session.user.id);
  if (blocked) return blocked;

  const slots = Array.isArray(body.slots) ? body.slots : [];
  if (slots.length === 0) {
    return NextResponse.json({ error: "Aucun créneau fourni" }, { status: 400 });
  }
  if (slots.length > 20) {
    return NextResponse.json({ error: "Maximum 20 créneaux par requête" }, { status: 400 });
  }

  const groupId = body.groupId ? String(body.groupId) : null;
  const activityId = body.activityId ? String(body.activityId) : null;
  const recurring = Boolean(body.recurring);

  // Vérifier groupe et activité si fournis.
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

  // Préparer et valider tous les créneaux.
  const prepared = slots.map((s) => {
    const day = Number(s.day);
    const startTime = String(s.startTime ?? "");
    const endTime = String(s.endTime ?? "");
    return { day, startTime, endTime, groupId, activityId, recurring };
  });

  for (const p of prepared) {
    if (!DAYS.includes(p.day)) {
      return NextResponse.json({ error: `Jour invalide : ${p.day}` }, { status: 400 });
    }
    if (!TIME_REGEX.test(p.startTime) || !TIME_REGEX.test(p.endTime)) {
      return NextResponse.json(
        { error: `Format d'heure invalide (HH:mm) pour le jour ${p.day}` },
        { status: 400 }
      );
    }
    if (p.startTime >= p.endTime) {
      return NextResponse.json(
        { error: `L'heure de fin doit être après l'heure de début (jour ${p.day})` },
        { status: 400 }
      );
    }
  }

  // Vérifier les chevauchements par (jour, groupe, activité).
  const overlapWhere: Record<string, unknown> = {
    userId: session.user.id,
    day: { in: prepared.map((p) => p.day) },
  };
  if (groupId) {
    overlapWhere.groupId = groupId;
    overlapWhere.activityId = activityId ?? undefined;
  } else {
    overlapWhere.groupId = null;
    overlapWhere.activityId = null;
  }

  const existing = await prisma.availability.findMany({
    where: overlapWhere,
  });

  const existingByDay = new Map<number, { start: string; end: string }[]>();
  for (const a of existing) {
    const arr = existingByDay.get(a.day) ?? [];
    arr.push({ start: a.startTime, end: a.endTime });
    existingByDay.set(a.day, arr);
  }

  for (const p of prepared) {
    const dayExisting = existingByDay.get(p.day) ?? [];
    const overlaps = dayExisting.some(
      (e) => p.startTime < e.end && p.endTime > e.start
    );
    if (overlaps) {
      return NextResponse.json(
        {
          error: `Chevauchement détecté le jour ${DAYS[p.day]} (${p.startTime}–${p.endTime})`,
        },
        { status: 409 }
      );
    }
    // Vérifier aussi entre les nouveaux créneaux.
    for (let i = 0; i < prepared.length; i++) {
      if (prepared[i].day === p.day) {
        for (let j = i + 1; j < prepared.length; j++) {
          if (prepared[j].day === p.day) {
            if (p.startTime < prepared[j].endTime && p.endTime > prepared[j].startTime) {
              return NextResponse.json(
                {
                  error: `Chevauchement entre deux nouveaux créneaux le jour ${DAYS[p.day]}`,
                },
                { status: 409 }
              );
            }
          }
        }
      }
    }
  }

  // Créer tous les créneaux.
  const created = await prisma.$transaction(
    prepared.map((p) =>
      prisma.availability.create({
        data: {
          userId: session.user.id,
          day: p.day,
          startTime: p.startTime,
          endTime: p.endTime,
          groupId: p.groupId,
          activityId: p.activityId,
          recurring: p.recurring,
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
