import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/admin/workshops/:id/attendance
// Corps : { userId, status: "present" | "absent" } → upsert présence d'un membre
// à un atelier. Réservé aux admins et au créateur de l'atelier (feedback bayésien).
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const workshop = await prisma.workshop.findUnique({ where: { id } });
  if (!workshop) {
    return NextResponse.json({ error: "Atelier introuvable" }, { status: 404 });
  }
  if (session.user.role !== "admin" && session.user.id !== workshop.createdBy) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: { userId?: unknown; status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const userId = String(body.userId ?? "");
  const status = String(body.status ?? "");
  if (!["present", "absent"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide (present|absent)" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  await prisma.attendance.upsert({
    where: { workshopId_userId: { workshopId: id, userId } },
    create: { workshopId: id, userId, status },
    update: { status },
  });

  const counts = await prisma.attendance.aggregate({
    where: { userId },
    _count: { status: true },
  });

  return NextResponse.json({ success: true, attendance: counts._count });
}