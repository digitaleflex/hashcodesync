import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { currentWeekStart, isCurrentWeek } from "@/lib/timezone";
import { sendEmailForNotification } from "@/lib/email-notification-templates";

const MAX_VALIDATIONS_PER_WEEK = 3;

// GET /api/availabilities/validate -> statut de verrouillage de la semaine courante.
export async function GET() {
  try {
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
  } catch (e) {
    console.error("GET /api/disponibilites/validate erreur", e);
    return NextResponse.json({ error: "Impossible de vérifier le statut de validation" }, { status: 500 });
  }
}

// POST /api/availabilities/validate  { validated: boolean }
//   validated=true  -> engage la semaine courante (bloque les ajouts/suppressions)
//   validated=false -> « dévalide » (retour en arrière dans la semaine).
// Règle : maximum 3 modifications (validate/unvalidate) par semaine.
export async function POST(req: NextRequest) {
  try {
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

    // Garde : on ne peut valider/dévalider que la semaine en cours.
    const isCurrent = isCurrentWeek(weekStart);
    if (!isCurrent) {
      return NextResponse.json(
        {
          error: "Vous ne pouvez valider/dévalider que la semaine en cours.",
          reason: "not_current_week",
          currentWeekStart: currentWeekStart().toISOString(),
        },
        { status: 403 }
      );
    }

    // Compter les modifications précédentes cette semaine.
    const modificationCount = await prisma.weekValidationLog.count({
      where: { userId: session.user.id, weekStart },
    });

    if (modificationCount >= MAX_VALIDATIONS_PER_WEEK) {
      return NextResponse.json(
        {
          error: `Limite de ${MAX_VALIDATIONS_PER_WEEK} modifications par semaine atteinte. Vous avez déjà effectué ${modificationCount} modification(s) cette semaine. Vous pourrez de nouveau valider la semaine prochaine (lundi).`,
          reason: "modification_limit_reached",
          modificationsUsed: modificationCount,
          modificationsLimit: MAX_VALIDATIONS_PER_WEEK,
          nextAvailableWeek: new Date(weekStart.getTime() + 7 * 24 * 3600 * 1000).toISOString(),
        },
        { status: 429 }
      );
    }

    // Vérifier que l'utilisateur a au moins un créneau (avant de créer le log).
    if (validated) {
      const availCount = await prisma.availability.count({
        where: { userId: session.user.id },
      });
      if (availCount === 0) {
        return NextResponse.json(
          {
            error: "Aucun créneau disponible. Vous devez d'abord renseignez vos disponibilités avant de valider la semaine.",
            reason: "no_availabilities",
          },
          { status: 400 }
        );
      }

      // Vérifier les chevauchements côté serveur (garde-fous supplémentaire).
      const allAvails = await prisma.availability.findMany({
        where: { userId: session.user.id },
        orderBy: [{ day: "asc" }, { startTime: "asc" }],
      });
      const byDay = new Map<number, { start: string; end: string }[]>();
      for (const a of allAvails) {
        const arr = byDay.get(a.day) ?? [];
        arr.push({ start: a.startTime, end: a.endTime });
        byDay.set(a.day, arr);
      }
      for (const arr of byDay.values()) {
        arr.sort((a, b) => a.start.localeCompare(b.start));
        for (let i = 1; i < arr.length; i++) {
          if (arr[i].start < arr[i - 1].end) {
            return NextResponse.json(
              {
                error: "Chevauchement détecté : deux créneaux se superposent le même jour. Corrigez-les avant de valider.",
                reason: "overlapping_slots",
                day: arr[i].start,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // Journaliser l'action (avant l'exécution pour pouvoir compter même en cas d'erreur).
    await prisma.weekValidationLog.create({
      data: { userId: session.user.id, weekStart, action: validated ? "validate" : "unvalidate" },
    });

    if (!validated) {
      // Dévalidation : supprimer le verrou ET l'historique (snapshot).
      await prisma.$transaction([
        prisma.weeklyValidation.deleteMany({
          where: { userId: session.user.id, weekStart },
        }),
        prisma.weekSnapshot.deleteMany({
          where: { userId: session.user.id, weekStart },
        }),
      ]);
      return NextResponse.json({ weekStart: weekStart.toISOString(), validated: false });
    }

    await sendEmailForNotification([session.user.id], "availability_validation").catch(
      () => {}
    );

    // En cas de ré-validation, on garantit une seule ligne (upsert).
    await prisma.weeklyValidation.upsert({
      where: { userId_weekStart: { userId: session.user.id, weekStart } },
      update: { validatedAt: new Date() },
      create: { userId: session.user.id, weekStart },
    });

    // Historique : figer une copie des créneaux actuels au moment de l'engagement.
    // Révalider remplace la copie de la semaine (cohérent avec le verrou).
    const availabilities = await prisma.availability.findMany({
      where: { userId: session.user.id },
      select: { day: true, startTime: true, endTime: true },
    });

    const snapshot = await prisma.weekSnapshot.upsert({
      where: { userId_weekStart: { userId: session.user.id, weekStart } },
      update: { validatedAt: new Date() },
      create: { userId: session.user.id, weekStart },
    });

    await prisma.$transaction([
      prisma.slotSnapshot.deleteMany({ where: { snapshotId: snapshot.id } }),
      ...availabilities.map((a) =>
        prisma.slotSnapshot.create({
          data: { snapshotId: snapshot.id, day: a.day, startTime: a.startTime, endTime: a.endTime },
        })
      ),
    ]);

    return NextResponse.json({ weekStart: weekStart.toISOString(), validated: true });
  } catch (e) {
    console.error("POST /api/disponibilites/validate erreur", e);
    return NextResponse.json({ error: "Impossible de valider la semaine" }, { status: 500 });
  }
}