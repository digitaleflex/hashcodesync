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

  const hasMore = snaps.length > limit;
  const items = hasMore ? snaps.slice(0, limit) : snaps;

  const payload = items.map((s) => ({
    id: s.id,
    weekStart: s.weekStart.toISOString(),
    validatedAt: s.validatedAt.toISOString(),
    slots: s.slots,
  }));

  return NextResponse.json({
    items: payload,
    hasMore,
    nextCursor: hasMore ? items[items.length - 1].weekStart.toISOString() : null,
  });
}