import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const FREQUENCIES = ["weekly", "biweekly", "flexible"];

const DEFAULT_PREFS = {
  preferredDays: 0,
  morning: true,
  afternoon: true,
  evening: true,
  preferredDurationHours: null as number | null,
  wantsWorkshops: true,
  wantsMentoring: true,
  frequency: "weekly",
  maxHoursPerWeek: null as number | null,
  maxWorkshopsPerWeek: null as number | null,
  maxMentorshipPerWeek: null as number | null,
};

function toNullableInt(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

// GET /api/preferences -> préférences de planification de l'utilisateur.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const prefs = await prisma.planningPreferences.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(prefs ?? DEFAULT_PREFS);
}

// PUT /api/preferences -> créer ou mettre à jour les préférences (upsert).
export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const preferredDays = toNullableInt(body.preferredDays ?? 0, 0, 127) ?? 0;
  const frequency = FREQUENCIES.includes(String(body.frequency))
    ? String(body.frequency)
    : "weekly";
  const preferredDurationHours = toNullableInt(body.preferredDurationHours, 1, 12);
  const maxHoursPerWeek = toNullableInt(body.maxHoursPerWeek, 1, 168);
  const maxWorkshopsPerWeek = toNullableInt(body.maxWorkshopsPerWeek, 1, 30);
  const maxMentorshipPerWeek = toNullableInt(body.maxMentorshipPerWeek, 1, 30);

  const data = {
    preferredDays,
    morning: Boolean(body.morning),
    afternoon: Boolean(body.afternoon),
    evening: Boolean(body.evening),
    preferredDurationHours,
    wantsWorkshops: Boolean(body.wantsWorkshops),
    wantsMentoring: Boolean(body.wantsMentoring),
    frequency,
    maxHoursPerWeek,
    maxWorkshopsPerWeek,
    maxMentorshipPerWeek,
  };

  const prefs = await prisma.planningPreferences.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  return NextResponse.json(prefs);
}
