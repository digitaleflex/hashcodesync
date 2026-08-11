import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeMassHours } from "@/lib/masse-horaire";
import { presenceProbability } from "@/lib/probability";
import { computeScheduling, expandPatterns, mergePerUserIntervals, SlotAvail } from "@/lib/scheduling";
import { convertToReference, REFERENCE_TIMEZONE, currentWeekStart } from "@/lib/timezone";
import { withCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  try {
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
      cohortUsers,
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
            select: { userId: true, role: true, hoursPerWeek: true, joinedAt: true },
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
        ? prisma.user.findMany({
            where: { id: { not: session.user.id }, availabilities: { some: {} } },
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
          })
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

    const memberGroups = groupsResult.filter((g) => g.members.length > 0).length;

    let cohort: {
      has: boolean;
      heatmap: { day: number; hour: number; count: number }[];
      heatmapSmoothed?: { day: number; hour: number; count: number }[];
      recommendation: { day: number; startHour: number; startTime: string; endTime: string; available: number; percent: number }[];
      minHour: number;
      maxHour: number;
      totalMembers: number;
      referenceTimezone: string;
    } | null = null;

    if (isLeader && cohortUsers.length > 0) {
      const rows = cohortUsers.flatMap((u) => {
        const declared = [...u.availabilities, ...expandPatterns(u.recurringAvailabilities)];
        const mass = computeMassHours(declared);
        const weight = presenceProbability(
          {
            present: u.attendances.filter((a) => a.status === "present").length,
            absent: u.attendances.filter((a) => a.status === "absent").length,
          },
          mass
        );
        return declared.map((a) => ({
          day: a.day,
          startTime: a.startTime,
          endTime: a.endTime,
          userTz: u.timezone,
          userId: u.id,
          weight,
        }));
      });

      const merged = mergePerUserIntervals(
        convertToReference(rows).map(
          (a): SlotAvail => ({ day: a.day, startMin: a.startMin, endMin: a.endMin, weight: a.weight, userId: a.userId })
        )
      );

      const scheduling = computeScheduling(merged, cohortUsers.length, 2, {
        smooth: true,
        smoothSigma: 1.2,
      });

      cohort = {
        has: true,
        heatmap: scheduling.heatmap,
        heatmapSmoothed: scheduling.heatmapSmoothed,
        recommendation: scheduling.recommendation,
        minHour: scheduling.minHour,
        maxHour: scheduling.maxHour,
        totalMembers: scheduling.totalMembers,
        referenceTimezone: REFERENCE_TIMEZONE,
      };
    }

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
  } catch (e) {
    console.error("GET /api/tableau-de-bord erreur", e);
    return NextResponse.json({ error: "Impossible de charger le tableau de bord" }, { status: 500 });
  }
}
