import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { runValidationReminders } from "@/lib/validation-reminders";

// POST /api/admin/validation-reminders
// Déclenchement manuel (admin) de la relance des semaines non validées.
// Même logique et mêmes garde-fous que le cron : idempotent, max 1/semaine.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const summary = await runValidationReminders(req.nextUrl.origin);
  return NextResponse.json(summary);
}
