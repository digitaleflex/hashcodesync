import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeMassHours } from "@/lib/masse-horaire";
import { presenceProbability } from "@/lib/probability";

// Gestion des groupes + activités par admin et mentors.
// POST /api/groups                -> créer un groupe
// GET  /api/groups                -> lister tous les groupes (avec membres/activités)
// POST /api/groups/:id/activities -> ajouter une activité
// POST /api/groups/:id/members    -> accepter un membre (depuis une demande approuvée) ou en ajouter un
// PATCH /api/groups/:id/members/:userId -> mettre à jour role/hoursPerWeek
// DELETE /api/groups/:id/members/:userId -> retirer un membre
// POST /api/groups/:id/join-requests/:reqId/accept -> accepter une demande
// POST /api/groups/:id/join-requests/:reqId/reject -> rejeter une demande

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!["admin", "mentor"].includes(session.user.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { id: true, firstname: true, lastname: true, email: true } },
      members: {
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
              attendances: { select: { status: true } },
              weeklyValidations: { select: { id: true, weekStart: true, validatedAt: true } },
              availabilities: {
                select: {
                  day: true,
                  startTime: true,
                  endTime: true,
                  groupId: true,
                  activityId: true,
                },
              },
            },
          },
        },
      },
      activities: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { workshops: true } } },
      },
      joinRequests: {
        where: { status: "pending" },
        include: { user: { select: { id: true, firstname: true, lastname: true, email: true } } },
      },
      _count: { select: { members: true, activities: true } },
    },
  });

  const result = groups.map((g) => {
    let totalHours = 0;
    const members = g.members.map((m) => {
      const slots = m.user.availabilities
        .filter((a) => a.groupId === g.id || a.groupId === null)
        .map((a) => ({ day: a.day, startTime: a.startTime, endTime: a.endTime }));
      const hoursPerWeek = computeMassHours(slots);
      const present = m.user.attendances.filter((x) => x.status === "present").length;
      const absent = m.user.attendances.filter((x) => x.status === "absent").length;
      const reliability = Math.round(presenceProbability({ present, absent }, hoursPerWeek) * 100);
      const weekValidation =
        [...m.user.weeklyValidations].sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())[0] ?? null;
      totalHours += hoursPerWeek;
      return {
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        hoursPerWeek,
        reliability,
        weekValidated: Boolean(weekValidation),
        weekValidatedAt: weekValidation?.validatedAt.toISOString() ?? null,
        user: { id: m.user.id, firstname: m.user.firstname, lastname: m.user.lastname, email: m.user.email },
      };
    });
    return { ...g, members, totalHours };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!["admin", "mentor"].includes(session.user.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: { name?: unknown; description?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  if (!name) {
    return NextResponse.json({ error: "Le nom du groupe est requis" }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: { name, description, createdBy: session.user.id },
    include: { creator: { select: { id: true, firstname: true, lastname: true, email: true } } },
  });

  return NextResponse.json(group, { status: 201 });
}