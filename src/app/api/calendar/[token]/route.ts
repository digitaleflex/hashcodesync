import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildVCalendar, tzOffsetMinutes, type IcsEvent } from "@/lib/ical";
import { REFERENCE_TIMEZONE } from "@/lib/timezone";

// GET /api/calendar/[token]?scope=workshops|availability|all
// Flux d'abonnement iCal personnel (Google Calendar / Apple / Outlook).
// URL à capacité : le token EST le secret — aucune session requise.

const WINDOW_PAST_MS = 45 * 24 * 3600 * 1000;
const WINDOW_FUTURE_MS = 400 * 24 * 3600 * 1000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const user = await prisma.user.findUnique({
    where: { calendarToken: token },
    select: { id: true, firstname: true },
  });
  if (!user) {
    return new NextResponse("Not found", { status: 404 });
  }

  const scope = req.nextUrl.searchParams.get("scope") ?? "workshops";
  const now = Date.now();
  const events: IcsEvent[] = [];
  const baseUrl =
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000";

  if (scope === "workshops" || scope === "all") {
    const workshops = await prisma.workshop.findMany({
      where: {
        startAt: {
          gte: new Date(now - WINDOW_PAST_MS),
          lte: new Date(now + WINDOW_FUTURE_MS),
        },
        OR: [
          { createdBy: user.id },
          {
            participants: {
              some: { userId: user.id, status: { not: "declined" } },
            },
          },
        ],
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        meetingUrl: true,
        startAt: true,
        endAt: true,
        type: true,
      },
    });

    for (const w of workshops) {
      const prefix = w.type === "mentorship_session" ? "[Mentorat] " : "";
      const detail = [
        w.description ?? "",
        `Lien : ${baseUrl}/ateliers/${w.id}`,
        w.meetingUrl ? `Visio : ${w.meetingUrl}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      events.push({
        uid: `${w.id}@hashcodesync`,
        start: w.startAt,
        end: w.endAt,
        summary: `${prefix}${w.title}`,
        description: detail,
        location: w.location ?? undefined,
        url: `${baseUrl}/ateliers/${w.id}`,
      });
    }
  }

  if (scope === "availability" || scope === "all") {
    // Créneaux récurrents déclarés par le membre, exprimés dans le fuseau de
    // référence de la cohorte. Événements « libres » (TRANSPARENT) pour ne pas
    // bloquer les autres activités de l'agenda.
    const availabilities = await prisma.availability.findMany({
      where: { userId: user.id, recurring: true },
      select: { id: true, day: true, startTime: true, endTime: true },
    });

    // Lundi de la semaine courante dans le fuseau de référence.
    const offsetMin = (() => {
      try {
        return tzOffsetMinutes(REFERENCE_TIMEZONE);
      } catch {
        return 60; // Porto-Novo
      }
    })();
    const local = new Date(now + offsetMin * 60000);
    const mondayUtcMs = Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate() - ((local.getUTCDay() + 6) % 7),
    );

    for (const a of availabilities) {
      const [sh, sm] = a.startTime.split(":").map(Number);
      const [eh, em] = a.endTime.split(":").map(Number);
      if ([sh, sm, eh, em].some((v) => !Number.isFinite(v))) continue;
      const dayStartUtcMs =
        mondayUtcMs + a.day * 86400000 - offsetMin * 60000;
      events.push({
        uid: `avail-${a.id}@hashcodesync`,
        start: new Date(dayStartUtcMs + sh * 3600000 + sm * 60000),
        end: new Date(dayStartUtcMs + eh * 3600000 + em * 60000),
        summary: "Disponibilité HashCode",
        transparent: true,
        weeklyByDay: a.day,
      });
    }
  }

  const ics = buildVCalendar({
    name: `HashCode Sync — ${user.firstname}`,
    events,
    timezone: scope === "availability" || scope === "all" ? REFERENCE_TIMEZONE : undefined,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar;charset=utf-8",
      "Content-Disposition": 'inline; filename="hashcode-sync.ics"',
      // Les clients d'agenda re-consultent toutes les ~1-24 h ; un cache court
      // évite de régénérer à chaque sonde sans masquer les changements longtemps.
      "Cache-Control": "public, max-age=1800",
    },
  });
}
