import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { mergePerUserIntervals, SlotAvail } from "@/lib/scheduling";
import { convertToReference, REFERENCE_TIMEZONE } from "@/lib/timezone";
import { loadSchedulingUsers, weightedRows } from "@/lib/scheduling-users";
import { planSeries, type MemberAbsence, type MemberBudget } from "@/lib/series";

// POST /api/admin/scheduling/series
// Planification en série (#79) : prévisualisation puis création en masse d'une
// saison d'ateliers récurrents, équilibrée et contrainte par les budgets et
// absences des membres.
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    // Le flux « organiser la saison » concerne les mentors comme les admins.
    if (!["admin", "mentor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }

    const weeks = Math.max(2, Math.min(16, Number(body.weeks ?? 4)));
    const perWeek = Math.max(1, Math.min(2, Number(body.perWeek ?? 1)));
    const windowHours = Math.max(1, Math.min(4, Number(body.windowHours ?? 2)));
    const groupId = typeof body.groupId === "string" && body.groupId ? body.groupId : null;
    const activityId =
      typeof body.activityId === "string" && body.activityId ? body.activityId : null;
    const requiresMentor = body.requiresMentor === true;
    const capacityRaw = Number(body.capacity);
    const capacity = Number.isFinite(capacityRaw) && capacityRaw > 0 ? capacityRaw : null;
    const mode = body.mode === "create" ? "create" : "preview";

    const { totalMembers, users } = await loadSchedulingUsers(groupId);
    const rows = users.flatMap((u) => weightedRows(u, groupId, activityId, !groupId));
    const availabilities = convertToReference(rows);
    const merged: SlotAvail[] = mergePerUserIntervals(
      availabilities.map((a) => ({
        day: a.day,
        startMin: a.startMin,
        endMin: a.endMin,
        weight: a.weight,
        userId: a.userId,
        mentor: a.mentor,
      })),
    );

    if (merged.length === 0) {
      return NextResponse.json(
        { error: "Aucune disponibilité dans ce périmètre." },
        { status: 400 },
      );
    }

    // La série démarre lundi prochain (fuseau de référence) : on ne planifie
    // jamais dans le passé de la semaine courante déjà entamée.
    const now = new Date();
    const offsetDaysToNextMonday = ((8 - now.getUTCDay()) % 7 || 7) ;
    const startWeekStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) +
        offsetDaysToNextMonday * 86400000,
    );
    const horizonEnd = new Date(startWeekStart.getTime() + weeks * 7 * 86400000);

    // Budgets hebdo déclarés (PlanningPreferences) pour tous les membres du périmètre.
    const prefs = await prisma.planningPreferences.findMany({
      where: { userId: { in: users.map((u) => u.id) } },
      select: { userId: true, maxWorkshopsPerWeek: true, maxHoursPerWeek: true },
    });
    const budgets = new Map<string, MemberBudget>(
      prefs.map((p) => [
        p.userId,
        { maxWorkshopsPerWeek: p.maxWorkshopsPerWeek, maxHoursPerWeek: p.maxHoursPerWeek },
      ]),
    );

    // Absences planifiées chevauchant l'horizon : contrainte dure.
    const absenceRows = await prisma.unavailability.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        startDate: { lte: horizonEnd },
        endDate: { gte: now },
      },
      select: { userId: true, startDate: true, endDate: true },
    });
    const absences: MemberAbsence[] = absenceRows.map((a) => ({
      userId: a.userId,
      startDate: a.startDate,
      endDate: a.endDate,
    }));

    const result = planSeries({
      availabilities: merged,
      totalMembers: Math.max(totalMembers, 1),
      params: { weeks, perWeek, windowHours, startWeekStart },
      budgets,
      absences,
      requiresMentor,
      capacity,
    });

    if (mode === "preview") {
      return NextResponse.json({
        referenceTimezone: REFERENCE_TIMEZONE,
        startWeekStart: startWeekStart.toISOString(),
        ...result,
      });
    }

    // Mode création : régénéré ci-dessus = source de vérité, insertion transactionnelle.
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
    if (!name) {
      return NextResponse.json({ error: "Le nom de la série est requis." }, { status: 400 });
    }
    if (result.proposals.length === 0) {
      return NextResponse.json(
        { error: "Aucun créneau viable trouvé pour cette série." },
        { status: 400 },
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const series = await tx.workshopSeries.create({
        data: { name, createdBy: session.user.id },
        select: { id: true },
      });
      const rowsToCreate = result.proposals.map((p, i) => ({
        title: `${name} — Séance ${i + 1}/${result.proposals.length}`,
        description: `Série « ${name} » générée automatiquement depuis les disponibilités de la cohorte.`,
        startAt: new Date(p.startAt),
        endAt: new Date(p.endAt),
        capacity,
        createdBy: session.user.id,
        seriesId: series.id,
        type: "atelier",
        requiresMentor,
      }));
      await tx.workshop.createMany({ data: rowsToCreate });
      return { seriesId: series.id, count: rowsToCreate.length };
    });

    return NextResponse.json({
      referenceTimezone: REFERENCE_TIMEZONE,
      warnings: result.warnings,
      ...created,
    });
  } catch (e) {
    console.error("POST /api/admin/scheduling/series erreur", e);
    return NextResponse.json({ error: "Planification impossible" }, { status: 500 });
  }
}
