import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "../../../_shared";

type Ctx = { params: Promise<{ id: string; userId: string }> };

// Retirer un membre du groupe.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, userId } = await params;
  const managerId = await requireManager(id);
  if (!managerId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId } },
  });
  if (!member) {
    return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
  }
  await prisma.groupMember.delete({ where: { id: member.id } });
  return NextResponse.json({ success: true });
}

// Mettre à jour le rôle et/ou les heures d'un membre.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, userId } = await params;
  const managerId = await requireManager(id);
  if (!managerId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId } },
  });
  if (!member) {
    return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
  }

  let body: { role?: unknown; hoursPerWeek?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.role === "string") {
    const role = body.role.trim();
    if (role !== "member" && role !== "manager") {
      return NextResponse.json({ error: "Rôle invalide (member ou manager)" }, { status: 400 });
    }
    updates.role = role;
  }
  if (typeof body.hoursPerWeek === "number") {
    const hoursPerWeek = Math.max(0, Math.min(168, Math.floor(body.hoursPerWeek)));
    updates.hoursPerWeek = hoursPerWeek;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune modification fournie" }, { status: 400 });
  }

  const updated = await prisma.groupMember.update({
    where: { id: member.id },
    data: updates,
    select: { id: true, role: true, hoursPerWeek: true },
  });
  return NextResponse.json(updated);
}