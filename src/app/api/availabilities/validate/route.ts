import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { currentWeekStart, isCurrentWeek } from "@/lib/timezone";

// GET /api/availabilities/validate -> statut de verrouillage de la semaine courante.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const weekStart = currentWeekStart();
  const lock = await prisma.weeklyValidation.findUnique({
    where: { userId_weekStart: { userId: session.user.id, weekStart } },
  });

  return NextResponse.json({
    weekStart: weekStart.toISOString(),
    validated: Boolean(lock),
    validatedAt: lock?.validatedAt.toISOString() ?? null,
  });
}

// POST /api/availabilities/validate  { validated: boolean }
//   validated=true  -> engage la semaine courante (bloque les ajouts/suppressions)
//   validated=false -> « dévalide » (retour en arrière dans la semaine).
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { validated?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const validated = Boolean(body.validated);
  const weekStart = currentWeekStart();

  if (!validated) {
    await prisma.weeklyValidation.deleteMany({
      where: { userId: session.user.id, weekStart },
    });
    return NextResponse.json({ weekStart: weekStart.toISOString(), validated: false });
  }

  // En cas de ré-validation, on garantit une seule ligne (upsert).
  await prisma.weeklyValidation.upsert({
    where: { userId_weekStart: { userId: session.user.id, weekStart } },
    update: { validatedAt: new Date() },
    create: { userId: session.user.id, weekStart },
  });

  return NextResponse.json({ weekStart: weekStart.toISOString(), validated: true });
}