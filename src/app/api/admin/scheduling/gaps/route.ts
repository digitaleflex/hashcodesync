import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeScheduling, expandPatterns, mergePerUserIntervals, SlotAvail } from "@/lib/scheduling";
import { convertToReference } from "@/lib/timezone";
import { computeMassHours } from "@/lib/masse-horaire";
import { presenceProbability } from "@/lib/probability";

type UserSlots = {
  id: string;
  timezone: string;
  attendance: { present: number; absent: number };
  availabilities: { day: number; startTime: string; endTime: string; groupId: string | null; activityId: string | null }[];
  recurring: { dayMask: number; startTime: string; endTime: string; groupId: string | null; activityId: string | null }[];
};

function weightedRows(u: UserSlots, groupScope: string | null, activityId: string | null, massScope: boolean) {
  const declared = [...u.availabilities, ...expandPatterns(u.recurring)];
  const slots = massScope
    ? declared
    : declared.filter(
        (a) =>
          (a.groupId === groupScope || a.groupId === null) &&
          (!activityId || a.activityId === activityId || a.activityId === null)
      );
  if (slots.length === 0) return [];
  const mass = computeMassHours(slots.map((s) => ({ day: s.day, startTime: s.startTime, endTime: s.endTime })));
  const weight = presenceProbability({ present: u.attendance.present, absent: u.attendance.absent }, mass);
  return slots.map((a) => ({
    day: a.day,
    startTime: a.startTime,
    endTime: a.endTime,
    userTz: u.timezone,
    userId: u.id,
    weight,
  }));
}

export function detectGaps(
  heatmap: { day: number; hour: number; count: number }[],
  minHour: number,
  maxHour: number,
  threshold = 0.15
): { day: number; dayName: string; gaps: { startHour: number; endHour: number; duration: number }[] }[] {
  const DAY_NAMES_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const byDay = new Map<number, Map<number, number>>();
  for (const c of heatmap) {
    const dayMap = byDay.get(c.day) ?? new Map<number, number>();
    dayMap.set(c.hour, c.count);
    byDay.set(c.day, dayMap);
  }

  const results: { day: number; dayName: string; gaps: { startHour: number; endHour: number; duration: number }[] }[] = [];

  for (let day = 0; day < 7; day++) {
    const dayMap = byDay.get(day) ?? new Map<number, number>();
    const gaps: { startHour: number; endHour: number; duration: number }[] = [];
    let inGap = false;
    let gapStart = minHour;

    // Couverture max observée ce jour : sert de référence au seuil relatif.
    let dayMax = 0;
    for (const v of dayMap.values()) dayMax = Math.max(dayMax, v);
    const gapLevel = dayMax * threshold;

    for (let h = minHour; h < maxHour; h++) {
      const count = dayMap.get(h) ?? 0;
      // Un créneau est un gap s'il est strictement vide OU sous le seuil relatif
      // (max(1, gapLevel) garantit que count=0 reste toujours un gap).
      const gapLevel = Math.max(1, dayMax * threshold);
      const isEmpty = count < gapLevel;
      if (isEmpty && !inGap) {
        inGap = true;
        gapStart = h;
      } else if (!isEmpty && inGap) {
        inGap = false;
        gaps.push({ startHour: gapStart, endHour: h, duration: h - gapStart });
      }
    }
    if (inGap) {
      gaps.push({ startHour: gapStart, endHour: maxHour, duration: maxHour - gapStart });
    }

    results.push({
      day,
      dayName: DAY_NAMES_FULL[day],
      gaps,
    });
  }

  return results;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const windowHours = Math.max(1, Math.min(4, Number(req.nextUrl.searchParams.get("window") ?? 2)));
    const groupId = req.nextUrl.searchParams.get("groupId") || null;
    const activityId = req.nextUrl.searchParams.get("activityId") || null;
    const threshold = Math.min(1, Math.max(0, Number(req.nextUrl.searchParams.get("threshold") ?? 0.15)));

    let totalMembers = 0;
    let users: UserSlots[] = [];

    if (groupId) {
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            timezone: true,
            attendances: { select: { status: true } },
              availabilities: {
                select: {
                  day: true,
                  startTime: true,
                  endTime: true,
                  groupId: true,
                  activityId: true,
                },
              },
              recurringAvailabilities: {
                select: {
                  dayMask: true,
                  startTime: true,
                  endTime: true,
                  groupId: true,
                  activityId: true,
                },
              },
            },
          },
        },
      });
    totalMembers = members.length;
    users = members.map((m) => ({
      id: m.user.id,
      timezone: m.user.timezone,
      attendance: { present: 0, absent: 0 },
      availabilities: m.user.availabilities,
      recurring: m.user.recurringAvailabilities,
    }));
  } else {
    const all = await prisma.user.findMany({
      where: { availabilities: { some: {} } },
      select: {
        id: true,
        timezone: true,
        attendances: { select: { status: true } },
        availabilities: {
          select: {
            day: true,
            startTime: true,
            endTime: true,
            groupId: true,
            activityId: true,
          },
        },
        recurringAvailabilities: {
          select: {
            dayMask: true,
            startTime: true,
            endTime: true,
            groupId: true,
            activityId: true,
          },
        },
      },
    });
    totalMembers = all.length;
    users = all.map((u) => ({
      id: u.id,
      timezone: u.timezone,
      attendance: { present: 0, absent: 0 },
      availabilities: u.availabilities,
      recurring: u.recurringAvailabilities,
    }));
  }

  const rows = users.flatMap((u) => weightedRows(u, groupId, activityId, !groupId));
  const availabilities = convertToReference(rows);

  const merged = mergePerUserIntervals(
    availabilities.map((a): SlotAvail => ({ day: a.day, startMin: a.startMin, endMin: a.endMin, weight: a.weight, userId: a.userId }))
  );

  const scheduling = computeScheduling(
    merged,
    Math.max(totalMembers, 1),
    windowHours,
    { smooth: true, smoothSigma: 1.2 }
  );

  const gaps = detectGaps(scheduling.heatmap, scheduling.minHour, scheduling.maxHour, threshold);

  return NextResponse.json({
    gaps,
    minHour: scheduling.minHour,
    maxHour: scheduling.maxHour,
    totalMembers: scheduling.totalMembers,
    totalAvailabilities: scheduling.totalAvailabilities,
  });
  } catch (e) {
    console.error("GET /api/admin/scheduling/gaps erreur", e);
    return NextResponse.json({ error: "Impossible de charger les zones creuses" }, { status: 500 });
  }
}
