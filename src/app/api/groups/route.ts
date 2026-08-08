import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { computeMassHours } from "@/lib/masse-horaire";
import { sendEmailForNotification } from "@/lib/email-notification-templates";

// Côté membre : lister les groupes disponibles + demander l'accès.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = session.user.id;
  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true } },
      members: {
        where: { userId },
        select: { role: true, hoursPerWeek: true, joinedAt: true },
      },
      joinRequests: {
        where: { userId },
        select: { status: true, createdAt: true },
      },
    },
  });

  const myMemberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          activities: { orderBy: { createdAt: "asc" } },
          _count: { select: { members: true } },
          availabilities: {
            where: { userId },
            select: { day: true, startTime: true, endTime: true },
          },
        },
      },
    },
  });

  const memberships = myMemberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    description: m.group.description,
    coverImage: m.group.coverImage,
    role: m.role,
    hoursPerWeek: computeMassHours(m.group.availabilities),
    memberCount: m.group._count.members,
    activities: m.group.activities,
  }));

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      coverImage: g.coverImage,
      memberCount: g._count.members,
      role: g.members[0]?.role ?? null,
      hoursPerWeek: g.members[0]?.hoursPerWeek ?? 0,
      joinStatus: g.joinRequests[0]?.status ?? null,
    })),
    myMemberships: memberships,
  });
}

// Demander l'accès à un groupe.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: { groupId?: unknown; message?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const groupId = String(body.groupId ?? "");
  const message = String(body.message ?? "").trim() || null;
  if (!groupId) {
    return NextResponse.json({ error: "Groupe manquant" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
  }

  const already = await prisma.groupJoinRequest.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (already) {
    return NextResponse.json(
      { error: "Vous avez déjà fait une demande pour ce groupe" },
      { status: 409 }
    );
  }

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (member) {
    return NextResponse.json(
      { error: "Vous êtes déjà membre de ce groupe" },
      { status: 409 }
    );
  }

  const request = await prisma.groupJoinRequest.create({
    data: { groupId, userId: session.user.id, message },
  });

  await prisma.notification.create({
    data: {
      userId: group.createdBy,
      type: "group_join_request",
      title: "Nouvelle demande d'accès",
      message: `Un utilisateur demande à rejoindre le groupe « ${group.name} ».`,
    },
  });

  await sendEmailForNotification([group.createdBy], "group_join_request", {
    actorName: session.user.name,
    groupName: group.name,
    actionUrl: `${req.nextUrl.origin}/admin/groupes`,
  });

  return NextResponse.json(request, { status: 201 });
}