import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { currentWeekStart, isCurrentWeek } from "@/lib/timezone";
import { computeScheduling, SlotAvail } from "@/lib/scheduling";
import { convertToReference } from "@/lib/timezone";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const weeks = Math.max(1, Math.min(12, Number(req.nextUrl.searchParams.get("weeks") ?? 4)));
  const groupId = req.nextUrl.searchParams.get("groupId") || null;
  const now = new Date();
  const refTz = "Africa/Porto-Novo";

  const history: { weekStart: string; coveragePercent: number; totalMembers: number; totalAvailabilities: number }[] = [];

  let checked = 0;
  let offset = 1;
  while (history.length < weeks && checked < weeks * 2 && offset < 20) {
    const d = new Date(now);
    d.setDate(d.getDate() - offset * 7);
    const weekStart = currentWeekStart(d, refTz);

    if (isCurrentWeek(weekStart, now, refTz)) {
      offset++;
      checked++;
      continue;
    }

    const snapshots = await prisma.weekSnapshot.findMany({
      where: {
        weekStart,
        ...(groupId ? { user: { groupMemberships: { some: { groupId } } } } : {}),
      },
      include: {
        user: {
          include: {
            attendances: { select: { status: true } },
          },
        },
        slots: true,
      },
    });

    if (snapshots.length === 0) {
      offset++;
      checked++;
      continue;
    }

    const users = snapshots.map((s) => ({
      id: s.user.id,
      timezone: s.user.timezone,
      attendance: {
        present: s.user.attendances.filter((a) => a.status === "present").length,
        absent: s.user.attendances.filter((a) => a.status === "absent").length,
      },
      availabilities: s.slots.map((sl) => ({
        day: sl.day,
        startTime: sl.startTime,
        endTime: sl.endTime,
        groupId: null,
        activityId: null,
      })),
    }));

    const rows = convertToReference(
      users.map((u) => ({
        day: u.availabilities[0]?.day ?? 0,
        startTime: u.availabilities[0]?.startTime ?? "08:00",
        endTime: u.availabilities[0]?.endTime ?? "20:00",
        userTz: u.timezone,
        weight: 1,
      }))
    );

    const availabilities = users.flatMap((u) =>
      u.availabilities.map((a) => ({
        day: a.day,
        startTime: a.startTime,
        endTime: a.endTime,
        userTz: u.timezone,
        weight: 1,
      }))
    );

    const refSlots = convertToReference(availabilities);
    const scheduling = computeScheduling(
      refSlots.map((a): SlotAvail => ({ day: a.day, startMin: a.startMin, endMin: a.endMin, weight: a.weight })),
      Math.max(users.length, 1),
      2,
      { smooth: true, smoothSigma: 1.2 }
    );

    const totalAvailabilities = users.reduce((sum, u) => sum + u.availabilities.length, 0);
    const coveragePercent = users.length > 0 ? Math.round((totalAvailabilities / (users.length * 40)) * 100) : 0;

    history.push({
      weekStart: weekStart.toISOString(),
      coveragePercent,
      totalMembers: users.length,
      totalAvailabilities,
    });

    offset++;
    checked++;
  }

  history.sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());

  return NextResponse.json({ weeks: history });
}
