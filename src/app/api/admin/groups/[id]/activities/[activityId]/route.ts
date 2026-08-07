import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "../../../_shared";

type Ctx = { params: Promise<{ id: string; activityId: string }> };

// Supprimer une activité du groupe.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, activityId } = await params;
  const managerId = await requireManager(id);
  if (!managerId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const activity = await prisma.groupActivity.findFirst({
    where: { id: activityId, groupId: id },
  });
  if (!activity) {
    return NextResponse.json({ error: "Activité introuvable" }, { status: 404 });
  }
  await prisma.groupActivity.delete({ where: { id: activity.id } });
  return NextResponse.json({ success: true });
}