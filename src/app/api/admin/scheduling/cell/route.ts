import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { convertToReference, REFERENCE_TIMEZONE } from "@/lib/timezone";
import { computeMassHours } from "@/lib/masse-horaire";
import { presenceProbability } from "@/lib/probability";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const day = Number(req.nextUrl.searchParams.get("day"));
    const hour = Number(req.nextUrl.searchParams.get("hour"));
    const groupId = req.nextUrl.searchParams.get("groupId") || null;

    if (Number.isNaN(day) || Number.isNaN(hour) || day < 0 || day > 6 || hour < 0 || hour > 23) {
      return NextResponse.json({ error: "Paramètres day/hour invalides" }, { status: 400 });
    }

    let users: { id: string; firstname: string; lastname: string; email: string; timezone: string; attendances: { status: string }[]; availabilities: { day: number; startTime: string; endTime: string; groupId: string | null; activityId: string | null }[] }[] = [];

    if (groupId) {
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
      users = members.map((m) => m.user);
    } else {
      users = await prisma.user.findMany({
        where: { availabilities: { some: {} } },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
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
    }

    const startMin = hour * 60;
    const endMin = startMin + 60;

    const members: { id: string; name: string; email: string; weight: number }[] = [];

    for (const u of users) {
      const slots = u.availabilities.filter(
        (a) =>
          a.day === day &&
          a.startTime <= `${String(hour).padStart(2, "0")}:00` &&
          a.endTime >= `${String(hour + 1).padStart(2, "0")}:00` &&
          (groupId ? a.groupId === groupId || a.groupId === null : true)
      );
      if (slots.length === 0) continue;

      const mass = computeMassHours(slots.map((s) => ({ day: s.day, startTime: s.startTime, endTime: s.endTime })));
      const weight = presenceProbability(
        { present: u.attendances.filter((a) => a.status === "present").length, absent: u.attendances.filter((a) => a.status === "absent").length },
        mass
      );

      members.push({
        id: u.id,
        name: `${u.firstname} ${u.lastname}`,
        email: u.email,
        weight: Math.round(weight * 100) / 100,
      });
    }

    members.sort((a, b) => b.weight - a.weight);

    return NextResponse.json({
      day,
      hour,
      total: members.length,
      members,
      referenceTimezone: REFERENCE_TIMEZONE,
    });
  } catch (e) {
    console.error("GET /api/admin/scheduling/cell erreur", e);
    return NextResponse.json({ error: "Impossible de charger les détails du créneau" }, { status: 500 });
  }
}
