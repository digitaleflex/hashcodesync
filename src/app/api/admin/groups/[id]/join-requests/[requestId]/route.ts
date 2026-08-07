import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "../../../_shared";

type Ctx = { params: Promise<{ id: string; requestId: string }> };

// Accepter / rejeter une demande d'adhésion.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, requestId } = await params;
  const managerId = await requireManager(id);
  if (!managerId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: { status?: unknown; hoursPerWeek?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const status = String(body.status ?? "");
  if (!["accepted", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const reqRow = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
  if (!reqRow || reqRow.groupId !== id) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  try {
    if (status === "accepted") {
      const hoursPerWeek = Number(body.hoursPerWeek ?? 0);
      const existing = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: reqRow.userId } },
      });
      await prisma.$transaction([
        existing
          ? prisma.groupMember.update({
              where: { id: existing.id },
              data: {
                hoursPerWeek: Number.isFinite(hoursPerWeek) ? hoursPerWeek : existing.hoursPerWeek,
              },
            })
          : prisma.groupMember.create({
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
  } catch (err) {
    const code = (err as unknown as { code?: unknown }).code;
    return NextResponse.json(
      { error: `Impossible de traiter la demande${typeof code === "string" ? ` (${code})` : ""}` },
      { status: 409 }
    );
  }
  return NextResponse.json({ success: true });
}