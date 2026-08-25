import { NextRequest, NextResponse } from "next/server";
import { runValidationReminders } from "@/lib/validation-reminders";

// POST /api/cron/validation-reminders
// Relance hebdomadaire des membres n'ayant pas validé leur semaine.
// Protégé par l'en-tête X-Cron-Secret ; à appeler 1×/jour par un cron externe
// (l'anti-spam interne garantit max 1 e-mail / semaine / membre).
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const summary = await runValidationReminders(req.nextUrl.origin);
  // Log exploitable par le service de cron (traçabilité des envois).
  console.log(
    `[cron] validation-reminders semaine ${summary.weekStart} : ` +
      `${summary.reminded} relancé(s), ${summary.alreadyReminded} déjà notifié(s), ` +
      `${summary.dormantSkipped} en veille`
  );
  return NextResponse.json(summary);
}
