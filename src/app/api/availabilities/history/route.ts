import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

// GET /api/availabilities/history?limit=&cursor=
// Historique des semaines validées (snapshots), ordonné par weekStart décroissant.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const url = new URL(req.url);
  const rawLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
  const cursor = url.searchParams.get("cursor"); // weekStart ISO

  const snaps = await prisma.weekSnapshot.findMany({
    where:
      cursor != null && cursor !== ""
        ? { userId: session.user.id, weekStart: { lt: new Date(cursor) } }
        : { userId: session.user.id },
    orderBy: { weekStart: "desc" },
    take: limit + 1,
    include: { slots: { select: { day: true, startTime: true, endTime: true } } },
  });

  // Ne garder que les semaines qui ont encore une validation active.
  const weekStarts = snaps.map((s) => s.weekStart);
  const activeValidations = await prisma.weeklyValidation.findMany({
    where: { userId: session.user.id, weekStart: { in: weekStarts } },
    select: { weekStart: true },
  });
  const activeSet = new Set(activeValidations.map((v) => v.weekStart.toISOString()));
  const items = snaps.filter((s) => activeSet.has(s.weekStart.toISOString()));

  const payload = items.map((s) => ({
    id: s.id,
    weekStart: s.weekStart.toISOString(),
    validatedAt: s.validatedAt.toISOString(),
    slots: s.slots,
  }));

  const hasMore = items.length > limit;

  return NextResponse.json({
    items: hasMore ? payload.slice(0, limit) : payload,
    hasMore,
    nextCursor: hasMore ? items[limit - 1].weekStart.toISOString() : null,
  });
}