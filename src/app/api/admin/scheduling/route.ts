import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeScheduling, SlotAvail } from "@/lib/scheduling";
import { convertToReference, REFERENCE_TIMEZONE } from "@/lib/timezone";
import { computeMassHours } from "@/lib/masse-horaire";
import { presenceProbability } from "@/lib/probability";

type UserSlots = {
  id: string;
  timezone: string;
  attendance: { present: number; absent: number };
  availabilities: { day: number; startTime: string; endTime: string; groupId: string | null; activityId: string | null }[];
};

// Convertit les dispo d'un membre (avec sa probabilité pᵢ) en lignes pondérées.
function weightedRows(u: UserSlots, groupScope: string | null, activityId: string | null, massScope: boolean) {
  const slots = massScope
    ? u.availabilities
    : u.availabilities.filter(
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
    weight,
  }));
}

// Cache en mémoire à courte durée (TTL) : évite de recharger/recalculer tout le
// jeu de données à chaque clic sur la heatmap. TTL court => données quasi à jour.
const CACHE_TTL_MS = 4000;
const cache = new Map<
  string,
  { payload: Record<string, unknown>; expires: number }
>();

function cacheKey(args: { windowHours: number; groupId: string | null; activityId: string | null }) {
  return `${args.windowHours}|${args.groupId ?? ""}|${args.activityId ?? ""}`;
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const windowHours = Math.max(
    1,
    Math.min(4, Number(req.nextUrl.searchParams.get("window") ?? 2))
  );
  const groupId = req.nextUrl.searchParams.get("groupId") || null;
  const activityId = req.nextUrl.searchParams.get("activityId") || null;

  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { activities: true, members: true } },
    },
  });

  const key = cacheKey({ windowHours, groupId, activityId });
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) {
    return NextResponse.json({
      ...hit.payload,
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        activityCount: g._count.activities,
        memberCount: g._count.members,
      })),
    });
  }

  let totalMembers: number;
  let groupName: string | null = null;
  let users: UserSlots[];

  if (groupId) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true },
    });
    groupName = group?.name ?? null;

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
          },
        },
      },
    });
    totalMembers = members.length;
    users = members.map((m) => ({
      id: m.user.id,
      timezone: m.user.timezone,
      attendance: countAttendance(m.user.attendances),
      availabilities: m.user.availabilities,
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
      },
    });
    totalMembers = all.length;
    users = all.map((u) => ({
      id: u.id,
      timezone: u.timezone,
      attendance: countAttendance(u.attendances),
      availabilities: u.availabilities,
    }));
  }

  const rows = users.flatMap((u) => weightedRows(u, groupId, activityId, !groupId));

  const availabilities = convertToReference(rows);

  const scheduling = computeScheduling(
    availabilities.map(
      (a): SlotAvail => ({ day: a.day, startMin: a.startMin, endMin: a.endMin, weight: a.weight })
    ),
    Math.max(totalMembers, 1),
    windowHours,
    { smooth: true, smoothSigma: 1.2 }
  );

  const payload: Record<string, unknown> = {
    ...scheduling,
    referenceTimezone: REFERENCE_TIMEZONE,
    groupId: groupId ?? undefined,
    groupName,
  };
  cache.set(key, { payload, expires: Date.now() + CACHE_TTL_MS });

  return NextResponse.json({
    ...payload,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      activityCount: g._count.activities,
      memberCount: g._count.members,
    })),
  });
}

function countAttendance(rows: { status: string }[]) {
  return {
    present: rows.filter((r) => r.status === "present").length,
    absent: rows.filter((r) => r.status === "absent").length,
  };
}