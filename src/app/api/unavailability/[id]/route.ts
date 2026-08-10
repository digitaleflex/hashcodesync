import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { findOwnedUnavailability } from "@/lib/unavailability-guard";

// DELETE /api/unavailability/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await findOwnedUnavailability(prisma, id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Période introuvable" }, { status: 404 });
  }

  await prisma.unavailability.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

// PATCH /api/unavailability/[id] -> modifier une période d'indisponibilité.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await findOwnedUnavailability(prisma, id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Période introuvable" }, { status: 404 });
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

  const updated = await prisma.unavailability.update({
    where: { id },
    data: { startDate, endDate, reason },
  });

  return NextResponse.json({
    ...updated,
    startDate: updated.startDate.toISOString().slice(0, 10),
    endDate: updated.endDate.toISOString().slice(0, 10),
  });
}
