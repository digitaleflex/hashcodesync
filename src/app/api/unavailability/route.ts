import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

// GET /api/unavailability -> périodes d'indisponibilité de l'utilisateur.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const periods = await prisma.unavailability.findMany({
    where: { userId: session.user.id },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(
    periods.map((p) => ({
      ...p,
      startDate: p.startDate.toISOString().slice(0, 10),
      endDate: p.endDate.toISOString().slice(0, 10),
    }))
  );
}

// POST /api/unavailability -> ajouter une période d'indisponibilité.
// Body: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD", reason? }
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { startDate?: unknown; endDate?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const startDate = parseDate(body.startDate);
  const endDate = parseDate(body.endDate);
  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Dates invalides (format YYYY-MM-DD attendu)" },
      { status: 400 }
    );
  }
  if (endDate < startDate) {
    return NextResponse.json(
      { error: "La date de fin doit être après la date de début" },
      { status: 400 }
    );
  }

  const reason = body.reason ? String(body.reason).slice(0, 200) : null;

  const created = await prisma.unavailability.create({
    data: { userId: session.user.id, startDate, endDate, reason },
  });

  return NextResponse.json(
    {
      ...created,
      startDate: created.startDate.toISOString().slice(0, 10),
      endDate: created.endDate.toISOString().slice(0, 10),
    },
    { status: 201 }
  );
}
