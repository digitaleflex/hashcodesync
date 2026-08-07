import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeScheduling, SlotAvail } from "@/lib/scheduling";
import { convertToReference, REFERENCE_TIMEZONE } from "@/lib/timezone";
import { computeMassHours } from "@/lib/masse-horaire";
import { presenceProbability } from "@/lib/probability";

// Cache en mémoire à courte durée (TTL) : évite de recharger/recalculer tout le
// jeu de données à chaque clic sur la heatmap.
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
  const role = session.user.role;
  if (role !== "mentor" && role !== "admin") {
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

  const upcomingWorkshops = await prisma.workshop.findMany({
    where: {
      createdBy: session.user.id,
      endAt: { gte: new Date() },
    },
    orderBy: { startAt: "asc" },
    take: 5,
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      _count: { select: { participants: true } },
    },
  });

  const key = cacheKey({ windowHours, groupId, activityId });
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) {
    return NextResponse.json({
      ...hit.payload,
      upcomingWorkshops,
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        activityCount: g._count.activities,
        memberCount: g._count.members,
      })),
    });
  }

  let availabilitiesRows: {
    day: number;
    startTime: string;
    endTime: string;
    userTz: string;
  }[] = [];
  let mentees: {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    timezone: string;
    attendance: { status: string }[];
    availabilities: {
      day: number;
      startTime: string;
      endTime: string;
    }[];
    p?: number;
    reliability?: number;
  }[] = [];
  let totalUsers = 0;
  let coverage = 0;
  let groupName: string | null = null;

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
            firstname: true,
            lastname: true,
            email: true,
            timezone: true,
            attendance: { select: { status: true } },
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

    totalUsers = members.length;
    coverage = members.length;
    mentees = members
      .slice()
      .sort((a, b) =>
        a.user.firstname.localeCompare(b.user.firstname)
      )
      .map((mem) => {
        const applicable = mem.user.availabilities.filter(
          (a) =>
            a.groupId === groupId &&
            (!activityId || a.activityId === activityId)
        );
        const mass = computeMassHours(
          applicable.map((a) => ({ day: a.day, startTime: a.startTime, endTime: a.endTime }))
        );
        const p = presenceProbability(
          { present: mem.user.attendance.filter((x) => x.status === "present").length, absent: mem.user.attendance.filter((x) => x.status === "absent").length },
          mass
        );
        return {
          id: mem.user.id,
          firstname: mem.user.firstname,
          lastname: mem.user.lastname,
          email: mem.user.email,
          timezone: mem.user.timezone,
          attendance: mem.user.attendance,
          availabilities: applicable.map((a) => ({
            day: a.day,
            startTime: a.startTime,
            endTime: a.endTime,
          })),
          p,
        };
      });
    availabilitiesRows = mentees.flatMap((m) =>
      m.availabilities.map((a) => ({
        day: a.day,
        startTime: a.startTime,
        endTime: a.endTime,
        userTz: m.timezone,
        weight: m.p,
      }))
    );
    mentees.forEach((m) => {
      m.reliability = Math.round((m.p ?? 0) * 100);
      delete m.p;
    });
  } else {
    const [allUsers, allMentees, userCount] = await Promise.all([
      prisma.user.findMany({
        where: { availabilities: { some: {} } },
        select: {
          id: true,
          timezone: true,
          attendance: { select: { status: true } },
          availabilities: {
            select: { day: true, startTime: true, endTime: true },
          },
        },
      }),
      prisma.user.findMany({
        where: { role: "member" },
        orderBy: { firstname: "asc" },
        select: {
          id: true,
          firstname: true,
          lastname: true,
email: true,
            timezone: true,
            attendance: { select: { status: true } },
            availabilities: {
            orderBy: { day: "asc" },
            select: { day: true, startTime: true, endTime: true },
          },
        },
      }),
      prisma.user.count(),
    ]);

    totalUsers = userCount;
    coverage = allUsers.length;
    mentees = allMentees.map((u) => {
      const mass = computeMassHours(
        u.availabilities.map((a) => ({ day: a.day, startTime: a.startTime, endTime: a.endTime }))
      );
      const p = presenceProbability(
        { present: u.attendance.filter((x) => x.status === "present").length, absent: u.attendance.filter((x) => x.status === "absent").length },
        mass
      );
      return {
        id: u.id,
        firstname: u.firstname,
        lastname: u.lastname,
        email: u.email,
        timezone: u.timezone,
        attendance: u.attendance,
        availabilities: u.availabilities.map((a) => ({
          day: a.day,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
p,
      };
    });
    availabilitiesRows = allUsers.flatMap((u) => {
      const mass = computeMassHours(
        u.availabilities.map((a) => ({ day: a.day, startTime: a.startTime, endTime: a.endTime }))
      );
      const w = presenceProbability(
        { present: u.attendance.filter((x) => x.status === "present").length, absent: u.attendance.filter((x) => x.status === "absent").length },
        mass
      );
      return u.availabilities.map((a) => ({
        day: a.day,
        startTime: a.startTime,
        endTime: a.endTime,
        userTz: u.timezone,
        weight: w,
      }));
    });
    mentees.forEach((m) => {
      m.reliability = Math.round((m.p ?? 0) * 100);
      delete m.p;
    });
  }

  const availabilities = convertToReference(availabilitiesRows);

  const scheduling = computeScheduling(
    availabilities.map(
      (a): SlotAvail => ({ day: a.day, startMin: a.startMin, endMin: a.endMin, weight: a.weight })
    ),
    Math.max(coverage, 1),
    windowHours,
    { smooth: true, smoothSigma: 1.2 }
  );

  const payload: Record<string, unknown> = {
    ...scheduling,
    totalUsers,
    coverage,
    referenceTimezone: REFERENCE_TIMEZONE,
    mentees,
    groupId: groupId ?? undefined,
    groupName,
  };
  cache.set(key, { payload, expires: Date.now() + CACHE_TTL_MS });

  return NextResponse.json({
    ...payload,
    upcomingWorkshops,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      activityCount: g._count.activities,
      memberCount: g._count.members,
    })),
  });
}
