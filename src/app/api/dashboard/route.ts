import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeMassHours } from "@/lib/masse-horaire";
import { currentWeekStart } from "@/lib/timezone";
import { withCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const role = session.user.role;
  const isLeader = role === "admin" || role === "mentor";
  const now = Date.now();

  const [
    availabilities,
    validation,
    workshops,
    groupsResult,
    notifications,
    scheduling,
  ] = await Promise.all([
    prisma.availability.findMany({
      where: { userId: session.user.id },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
      include: {
        group: { select: { id: true, name: true } },
        activity: { select: { id: true, name: true } },
      },
    }),
    prisma.weeklyValidation.findUnique({
      where: { userId_weekStart: { userId: session.user.id, weekStart: currentWeekStart() } },
    }),
    prisma.workshop.findMany({
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        capacity: true,
        location: true,
        meetingUrl: true,
        createdBy: true,
        seriesId: true,
        createdAt: true,
        updatedAt: true,
        creator: { select: { id: true, name: true, email: true } },
        series: { select: { id: true, name: true } },
        participants: {
          select: {
            id: true,
            userId: true,
            status: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
    prisma.group.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { members: true } },
        members: {
          where: { userId: session.user.id },
          select: { role: true, hoursPerWeek: true, joinedAt: true },
        },
        joinRequests: {
          where: { userId: session.user.id },
          select: { status: true, createdAt: true },
        },
      },
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    isLeader
      ? prisma.$queryRaw`
          SELECT
            EXTRACT(DOW FROM a."startTime"::time)::int AS day,
            EXTRACT(HOUR FROM a."startTime"::time)::int AS hour,
            COUNT(*) AS count
          FROM "Availability" a
          WHERE a."userId" != ${session.user.id}
          GROUP BY day, hour
          ORDER BY day, hour
        `
      : Promise.resolve([]),
  ]);

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  const upcoming = workshops
    .filter((w) => new Date(w.endAt).getTime() >= now)
    .map((w) => ({
      id: w.id,
      title: w.title,
      startAt: w.startAt,
      endAt: w.endAt,
      series: w.series ?? null,
      participantCount: Array.isArray(w.participants) ? w.participants.length : 0,
    }));

  const memberGroups = groupsResult.filter((g) => g._count.members > 0).length;

  const cohort = isLeader
    ? {
        has: true,
        heatmap: (scheduling as any) ?? [],
        totalMembers: new Set(
          groupsResult.flatMap((g) => g.members.map((m) => m.userId))
        ).size,
      }
    : null;

  return withCache(
    {
      availCount: availabilities.length,
      massHours: computeMassHours(
        availabilities.map((a) => ({
          day: a.day,
          startTime: a.startTime,
          endTime: a.endTime,
        }))
      ),
      weekValidated: Boolean(validation),
      upcoming,
      hasWorkshops: workshops.length > 0,
      groupCount: memberGroups,
      activities: notifications.filter((n) => !n.read).slice(0, 6),
      cohort,
      notifications,
      unread: unreadCount,
    },
    20
  );
}
