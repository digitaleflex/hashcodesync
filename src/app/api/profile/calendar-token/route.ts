import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function calendarUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000";
  return `${base}/api/calendar/${token}`;
}

// GET : état de l'abonnement (token existant ou non).
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { calendarToken: true },
  });

  return NextResponse.json({
    active: !!user?.calendarToken,
    url: user?.calendarToken ? calendarUrl(user.calendarToken) : null,
  });
}

// POST : génère le token (ou retourne l'existant) et l'URL d'abonnement.
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { calendarToken: true },
  });

  const token =
    user?.calendarToken ?? randomBytes(24).toString("base64url");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { calendarToken: token },
  });

  return NextResponse.json({ active: true, url: calendarUrl(token) });
}

// DELETE : révoque — l'ancienne URL devient immédiatement invalide (404).
export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { calendarToken: null },
  });

  return NextResponse.json({ active: false, url: null });
}
