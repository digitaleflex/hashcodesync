import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/workshops/[id]/feedback
// Corps : { rating: number, comment?: string }
// Permet à un participant de laisser un feedback après un atelier.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const workshop = await prisma.workshop.findUnique({ where: { id } });
  if (!workshop) {
    return NextResponse.json({ error: "Atelier introuvable" }, { status: 404 });
  }

  const isParticipant = await prisma.participant.findUnique({
    where: { workshopId_userId: { workshopId: id, userId: session.user.id } },
  });
  if (!isParticipant) {
    return NextResponse.json({ error: "Vous devez être participant pour laisser un feedback" }, { status: 403 });
  }

  let body: { rating?: unknown; comment?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "La note doit être comprise entre 1 et 5" }, { status: 400 });
  }

  const comment = typeof body.comment === "string" ? body.comment.trim() : null;

  const feedback = await prisma.workshopFeedback.upsert({
    where: { workshopId_userId: { workshopId: id, userId: session.user.id } },
    create: { workshopId: id, userId: session.user.id, rating, comment },
    update: { rating, comment },
  });

  return NextResponse.json(feedback, { status: 201 });
}

// GET /api/workshops/[id]/feedback
// Retourne les feedbacks de l'atelier (pour le créateur/admin).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const workshop = await prisma.workshop.findUnique({ where: { id } });
  if (!workshop) {
    return NextResponse.json({ error: "Atelier introuvable" }, { status: 404 });
  }
  if (workshop.createdBy !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const feedbacks = await prisma.workshopFeedback.findMany({
    where: { workshopId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(feedbacks);
}
