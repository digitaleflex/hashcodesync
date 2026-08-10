import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (!["admin", "mentor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { id: { not: session.user.id } },
      select: { id: true, firstname: true, lastname: true, email: true, role: true },
      orderBy: { firstname: "asc" },
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error("GET /api/membres erreur", e);
    return NextResponse.json({ error: "Impossible de charger les membres" }, { status: 500 });
  }
}
