import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyMany } from "@/lib/notifications";

const include = {
  creator: { select: { id: true, name: true, email: true } },
  series: { select: { id: true, name: true } },
  participants: {
    select: {
      id: true,
      userId: true,
      status: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
};

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const workshops = await prisma.workshop.findMany({
    orderBy: { startAt: "asc" },
    include,
  });

  return NextResponse.json(workshops);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { title?: unknown; description?: unknown; startAt?: unknown; endAt?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const startAt = new Date(String(body.startAt ?? ""));
  const endAt = new Date(String(body.endAt ?? ""));

  if (!title) {
    return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });
  }
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
  }
  if (endAt <= startAt) {
    return NextResponse.json(
      { error: "La fin doit être après le début" },
      { status: 400 }
    );
  }

  const workshop = await prisma.workshop.create({
    data: { title, description, startAt, endAt, createdBy: session.user.id },
    include,
  });

  const others = await prisma.user.findMany({
    where: { id: { not: session.user.id } },
    select: { id: true },
  });
  await notifyMany(others.map((u) => u.id), {
    type: "new_workshop",
    title: "Nouvel atelier",
    message: `${workshop.title} · ${workshop.startAt.toLocaleDateString("fr-FR")}`,
  });

  return NextResponse.json(workshop, { status: 201 });
}