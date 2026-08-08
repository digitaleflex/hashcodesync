import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/admin/workshops/:id/attendance/bulk
// Corps : { entries: [{ userId, status: "present" | "absent" }] }
// Permet de marquer la présence de plusieurs membres en une seule requête.
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

  let body: { entries?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (entries.length === 0) {
    return NextResponse.json({ error: "Aucune entrée fournie" }, { status: 400 });
  }
  if (entries.length > 100) {
    return NextResponse.json({ error: "Maximum 100 entrées par requête" }, { status: 400 });
  }

  const participants = await prisma.participant.findMany({
    where: { workshopId: id },
    select: { userId: true },
  });
  const allowedUserIds = new Set(participants.map((p) => p.userId));

  const ops = entries
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const userId = String((entry as Record<string, unknown>).userId ?? "");
      const status = String((entry as Record<string, unknown>).status ?? "");
      if (!userId || !["present", "absent"].includes(status)) return null;
      if (!allowedUserIds.has(userId)) return null;
      return {
        where: { workshopId_userId: { workshopId: id, userId } },
        create: { workshopId: id, userId, status },
        update: { workshopId: id, userId, status },
      };
    })
    .filter((op): op is NonNullable<typeof op> => op !== null);

  if (ops.length === 0) {
    return NextResponse.json({ error: "Aucune entrée valide" }, { status: 400 });
  }

  await prisma.$transaction(
    ops.map((op) => prisma.attendance.upsert(op))
  );

  return NextResponse.json({ success: true, updated: ops.length });
}
