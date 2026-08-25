// Relances automatiques des semaines non validées (#78).
//
// Cœur de fraîcheur des données : la heatmap et les recommandations ne valent
// que si les membres valident leur semaine. Cette fonction cible les membres
// actifs (au moins une dispo déclarée) n'ayant PAS validé la semaine courante,
// avec deux garde-fous anti-spam :
//  - max 1 rappel / semaine / membre (marqueur : Notification type
//    « validation_reminder » créée dans la semaine courante — filtre DB,
//    donc idempotent : double appel du cron = zéro double envoi) ;
//  - mise en veille des membres sans validation récente (dormant), sauf les
//    nouveaux comptes encore en période de grâce.
//
// Paramétrage :
//  VALIDATION_REMINDER_DORMANT_WEEKS (défaut 6)
//  VALIDATION_REMINDER_GRACE_WEEKS   (défaut 3)

import { prisma } from "@/lib/prisma";
import { notifyMany } from "@/lib/notifications";
import { sendEmailForNotification } from "@/lib/email-notification-templates";
import { currentWeekStart, REFERENCE_TIMEZONE } from "@/lib/timezone";

const WEEK_MS = 7 * 24 * 3600 * 1000;

function envWeeks(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export type ValidationReminderSummary = {
  weekStart: string;
  referenceTimezone: string;
  reminded: number;
  alreadyReminded: number;
  dormantSkipped: number;
};

export async function runValidationReminders(
  origin: string
): Promise<ValidationReminderSummary> {
  const weekStart = currentWeekStart();
  const dormantWeeks = envWeeks("VALIDATION_REMINDER_DORMANT_WEEKS", 6);
  const graceWeeks = envWeeks("VALIDATION_REMINDER_GRACE_WEEKS", 3);
  const dormantThreshold = new Date(weekStart.getTime() - dormantWeeks * WEEK_MS);
  const graceThreshold = new Date(weekStart.getTime() - graceWeeks * WEEK_MS);

  // Membres actifs sans validation de la semaine courante ET pas encore
  // relancés cette semaine. Le filtre `notifications.none` porte l'anti-spam :
  // il rend l'opération idempotente quel que soit le nombre d'appels.
  const candidates = await prisma.user.findMany({
    where: {
      availabilities: { some: {} },
      weeklyValidations: { none: { weekStart } },
      notifications: { none: { type: "validation_reminder", createdAt: { gte: weekStart } } },
    },
    select: {
      id: true,
      createdAt: true,
      weeklyValidations: {
        orderBy: { validatedAt: "desc" as const },
        take: 1,
        select: { validatedAt: true },
      },
    },
  });

  let dormantSkipped = 0;
  const toRemind: string[] = [];
  for (const u of candidates) {
    const last = u.weeklyValidations[0]?.validatedAt;
    if (last && last >= dormantThreshold) {
      toRemind.push(u.id);
    } else if (!last && u.createdAt >= graceThreshold) {
      // Nouveau membre : jamais validé mais compte récent → on relance.
      toRemind.push(u.id);
    } else {
      dormantSkipped++;
    }
  }

  if (toRemind.length === 0) {
    return {
      weekStart: weekStart.toISOString(),
      referenceTimezone: REFERENCE_TIMEZONE,
      reminded: 0,
      alreadyReminded: candidates.length + dormantSkipped,
      dormantSkipped,
    };
  }

  // Marqueur + notification in-app en premier : si l'envoi d'e-mails échoue
  // ensuite, on ne renverra pas non plus avant la semaine prochaine (fail-safe
  // anti-spam préféré au risque de doublons).
  await notifyMany(toRemind, {
    type: "validation_reminder",
    title: "Disponibilités de la semaine",
    message:
      "Vous n'avez pas encore validé vos disponibilités cette semaine. Quelques clics pour garder la cohorte bien planifiée !",
  });

  await sendEmailForNotification(toRemind, "availability_reminder", {
    actionUrl: `${origin}/disponibilites`,
  });

  return {
    weekStart: weekStart.toISOString(),
    referenceTimezone: REFERENCE_TIMEZONE,
    reminded: toRemind.length,
    alreadyReminded: candidates.length - toRemind.length,
    dormantSkipped,
  };
}
