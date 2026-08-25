import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { expandPatterns } from "@/lib/scheduling";
import { computeMassHours } from "@/lib/masse-horaire";
import { presenceProbability } from "@/lib/probability";
import { REFERENCE_TIMEZONE, currentWeekStart } from "@/lib/timezone";

// GET /api/admin/members
// Vue admin « Disponibilités des membres » : pour chaque membre, les créneaux
// de la semaine courante, les motifs récurrents, la masse horaire, la fiabilité
// estimée et le statut de validation. L'historique détaillé (snapshots) est
// servi par /api/admin/members/[id]/history à la demande.
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const weekStart = currentWeekStart();
    const now = new Date();

    const [users, validations, snapshotCounts] = await Promise.all([
      prisma.user.findMany({
        orderBy: [{ firstname: "asc" }, { lastname: "asc" }],
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          role: true,
          timezone: true,
          attendances: { select: { status: true } },
          availabilities: {
            orderBy: [{ day: "asc" }, { startTime: "asc" }],
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
          // Absences planifiées à venir (contrainte dure pour la planification).
          unavailabilities: {
            where: { endDate: { gte: now } },
            orderBy: { startDate: "asc" },
            select: { startDate: true, endDate: true, reason: true },
          },
        },
      }),
      prisma.weeklyValidation.findMany({
        where: { weekStart },
        select: { userId: true },
      }),
      prisma.weekSnapshot.groupBy({
        by: ["userId"],
        _count: { _all: true },
        _max: { validatedAt: true },
      }),
    ]);

    const validatedSet = new Set(validations.map((v) => v.userId));
    const countByUser = new Map(snapshotCounts.map((s) => [s.userId, s._count._all]));
    const lastByUser = new Map(
      snapshotCounts
        .filter((s) => s._max.validatedAt)
        .map((s) => [s.userId, s._max.validatedAt!.toISOString()])
    );

    const members = users.map((u) => {
      const declared = [
        ...u.availabilities.map((a) => ({ day: a.day, startTime: a.startTime, endTime: a.endTime })),
        ...expandPatterns(u.recurringAvailabilities).map((p) => ({
          day: p.day,
          startTime: p.startTime,
          endTime: p.endTime,
        })),
      ];
      const mass = computeMassHours(declared);
      const present = u.attendances.filter((a) => a.status === "present").length;
      const absent = u.attendances.filter((a) => a.status === "absent").length;
      return {
        id: u.id,
        firstname: u.firstname,
        lastname: u.lastname,
        email: u.email,
        role: u.role,
        timezone: u.timezone,
        slots: u.availabilities,
        recurring: u.recurringAvailabilities,
        unavailabilities: u.unavailabilities.map((a) => ({
          startDate: a.startDate.toISOString(),
          endDate: a.endDate.toISOString(),
          reason: a.reason,
        })),
        massHours: mass,
        reliability: Math.round(presenceProbability({ present, absent }, mass) * 100),
        attendance: { present, absent },
        weekValidated: validatedSet.has(u.id),
        historyCount: countByUser.get(u.id) ?? 0,
        lastValidatedAt: lastByUser.get(u.id) ?? null,
      };
    });

    return NextResponse.json({
      members,
      referenceTimezone: REFERENCE_TIMEZONE,
      weekStart: weekStart.toISOString(),
    });
  } catch (e) {
    console.error("GET /api/admin/members erreur", e);
    return NextResponse.json({ error: "Impossible de charger les membres" }, { status: 500 });
  }
}
