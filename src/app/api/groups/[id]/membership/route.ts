import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/groups/:id/membership  -> le membre met à jour ses heures/semaine
//                                      (temps qu'il consacre aux activités du groupe).
// DELETE /api/groups/:id/membership -> le membre quitte le groupe.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Vous n'êtes pas membre de ce groupe" }, { status: 403 });
  }

  let body: { hoursPerWeek?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const hoursPerWeek =
    Number(body.hoursPerWeek ?? membership.hoursPerWeek);
  if (!Number.isFinite(hoursPerWeek) || hoursPerWeek < 0 || hoursPerWeek > 168) {
    return NextResponse.json(
      { error: "Heures hebdomadaires invalides" },
      { status: 400 }
    );
  }

  await prisma.groupMember.update({
    where: { id: membership.id },
    data: { hoursPerWeek: Math.round(hoursPerWeek) },
  });
  return NextResponse.json({ success: true, hoursPerWeek: Math.round(hoursPerWeek) });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: session.user.id } },
  });
  if (membership) {
    await prisma.groupMember.delete({ where: { id: membership.id } });
    await prisma.availability.deleteMany({
      where: { userId: session.user.id, groupId: id },
    });
  }
  return NextResponse.json({ success: true });
}