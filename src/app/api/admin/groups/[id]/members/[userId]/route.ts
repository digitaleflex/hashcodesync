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