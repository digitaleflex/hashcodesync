import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeScheduling, mergePerUserIntervals, SlotAvail } from "@/lib/scheduling";
import { convertToReference, REFERENCE_TIMEZONE, currentWeekStart } from "@/lib/timezone";
import { schedulingCacheKey } from "@/lib/cache";
import { loadSchedulingUsers, weightedRows, type UserSlots } from "@/lib/scheduling-users";

const CACHE_TTL_MS = 4000;
const cache = new Map<
  string,
  { payload: Record<string, unknown>; expires: number }
>();

export async function GET(req: NextRequest) {
  try {
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
    const smooth = req.nextUrl.searchParams.get("smooth") !== "false";
    const requiresMentor = req.nextUrl.searchParams.get("mentor") === "true";
    const capacityRaw = Number(req.nextUrl.searchParams.get("capacity") ?? "");
    const capacity = Number.isFinite(capacityRaw) && capacityRaw > 0 ? capacityRaw : null;

    const groups = await prisma.group.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { activities: true, members: true } },
      },
    });

    const key = schedulingCacheKey({ windowHours, groupId, activityId, smooth, requiresMentor, capacity });
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

    let groupName: string | null = null;
    if (groupId) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { id: true, name: true },
      });
      groupName = group?.name ?? null;
    }

    const { totalMembers, users } = await loadSchedulingUsers(groupId);

    const rows = users.flatMap((u) => weightedRows(u, groupId, activityId, !groupId));

    // Référence dynamique de la couverture : le membre le plus rempli de la
    // cohorte (nb de créneaux déclarés) sert de dénominateur maximal — même
    // convention que /api/admin/scheduling/history (plus de constante « 40 »).
    const perUserCount = new Map<string, number>();
    for (const r of rows) perUserCount.set(r.userId!, (perUserCount.get(r.userId!) ?? 0) + 1);
    const maxSlotsPerUser = perUserCount.size > 0 ? Math.max(1, ...perUserCount.values()) : 1;

    const availabilities = convertToReference(rows);

    const merged = mergePerUserIntervals(
      availabilities.map(
        (a): SlotAvail => ({ day: a.day, startMin: a.startMin, endMin: a.endMin, weight: a.weight, userId: a.userId, mentor: a.mentor })
      )
    );

    const scheduling = computeScheduling(
      merged,
      Math.max(totalMembers, 1),
      windowHours,
      { smooth, smoothSigma: 1.2, requiresMentor, capacity }
    );

    const payload: Record<string, unknown> = {
      ...scheduling,
      referenceTimezone: REFERENCE_TIMEZONE,
      // Semaine affichée par la heatmap : lundi 00:00 du fuseau de référence.
      weekStart: currentWeekStart().toISOString(),
      groupId: groupId ?? undefined,
      groupName,
      maxSlotsPerUser,
      capacity,
      requiresMentor,
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
  } catch (e) {
    console.error("GET /api/admin/scheduling erreur", e);
    return NextResponse.json({ error: "Impossible de charger le planning" }, { status: 500 });
  }
}
