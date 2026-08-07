import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

async function requireManager(groupId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;
  if (session.user.role === "admin") return session.user.id;
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (member?.role === "manager") return session.user.id;
  return null;
}

// Ajouter une activité au groupe.
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const managerId = await requireManager(id);
  if (!managerId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: { name?: unknown; type?: unknown; description?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const type = String(body.type ?? "atelier");
  const description = String(body.description ?? "").trim() || null;
  const validTypes = ["atelier", "conference", "lab", "autre"];
  if (!name) {
    return NextResponse.json({ error: "Le nom de l'activité est requis" }, { status: 400 });
  }
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Type d'activité invalide" }, { status: 400 });
  }

  const activity = await prisma.groupActivity.create({
    data: { groupId: id, name, type, description },
  });
  return NextResponse.json(activity, { status: 201 });
}

// Accepter / rejeter une demande d'adhésion.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const managerId = await requireManager(id);
  if (!managerId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const path = url.pathname;
  const requestId = path.split("/").pop();

  let body: { status?: unknown; hoursPerWeek?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const status = String(body.status ?? "");

  if (requestId && path.includes("join-requests")) {
    if (!["accepted", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    const reqRow = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
    if (!reqRow || reqRow.groupId !== id) {
      return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    }
    if (status === "accepted") {
      const hoursPerWeek = Number(body.hoursPerWeek ?? 0);
      await prisma.$transaction([
        prisma.groupMember.create({
          data: {
            groupId: id,
            userId: reqRow.userId,
            hoursPerWeek: Number.isFinite(hoursPerWeek) ? hoursPerWeek : 0,
          },
        }),
        prisma.groupJoinRequest.update({ where: { id: requestId }, data: { status: "accepted" } }),
      ]);
      await prisma.notification.create({
        data: {
          userId: reqRow.userId,
          type: "group_join_accepted",
          title: "Demande acceptée",
          message: `Votre demande d'accès au groupe a été acceptée.`,
        },
      });
    } else {
      await prisma.groupJoinRequest.update({ where: { id: requestId }, data: { status: "rejected" } });
      await prisma.notification.create({
        data: {
          userId: reqRow.userId,
          type: "group_join_rejected",
          title: "Demande refusée",
          message: `Votre demande d'accès au groupe a été refusée.`,
        },
      });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Opération inconnue" }, { status: 400 });
}

// Retirer un membre / supprimer une activité.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const managerId = await requireManager(id);
  if (!managerId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const path = url.pathname;
  const last = path.split("/").pop()!;

  if (path.includes("members")) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: last } },
    });
    if (!member) return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
    await prisma.groupMember.delete({ where: { id: member.id } });
    return NextResponse.json({ success: true });
  }

  if (path.includes("activities")) {
    const activity = await prisma.groupActivity.findFirst({
      where: { id: last, groupId: id },
    });
    if (!activity) return NextResponse.json({ error: "Activité introuvable" }, { status: 404 });
    await prisma.groupActivity.delete({ where: { id: activity.id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Opération inconnue" }, { status: 400 });
}