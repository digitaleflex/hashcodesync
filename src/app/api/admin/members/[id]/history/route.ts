import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 52;

type Ctx = { params: Promise<{ id: string }> };

// GET /api/admin/members/:id/history?limit=
// Historique des semaines validées d'un membre (snapshots figés), du plus
// récent au plus ancien. `active` indique si la validation est toujours en
// vigueur (non expirée / non dévalidée).
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    const { id } = await params;

    const rawLimit = Number(new URL(req.url).searchParams.get("limit"));
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, firstname: true, lastname: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
    }

    const snaps = await prisma.weekSnapshot.findMany({
      where: { userId: id },
      orderBy: { weekStart: "desc" },
      take: limit,
      include: { slots: { select: { day: true, startTime: true, endTime: true } } },
    });

    const weekStarts = snaps.map((s) => s.weekStart);
    const activeValidations = await prisma.weeklyValidation.findMany({
      where: { userId: id, weekStart: { in: weekStarts } },
      select: { weekStart: true },
    });
    const activeSet = new Set(activeValidations.map((v) => v.weekStart.toISOString()));

    return NextResponse.json({
      items: snaps.map((s) => ({
        id: s.id,
        weekStart: s.weekStart.toISOString(),
        validatedAt: s.validatedAt.toISOString(),
        active: activeSet.has(s.weekStart.toISOString()),
        slots: s.slots,
      })),
    });
  } catch (e) {
    console.error("GET /api/admin/members/[id]/history erreur", e);
    return NextResponse.json({ error: "Impossible de charger l'historique" }, { status: 500 });
  }
}
