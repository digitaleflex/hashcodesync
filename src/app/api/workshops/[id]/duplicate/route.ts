import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const include = {
  creator: { select: { id: true, name: true, email: true } },
  series: { select: { id: true, name: true } },
  participants: {
    select: {
      id: true,
      userId: true,
      status: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  attendance: {
    select: { id: true, userId: true, status: true },
  },
};

// POST /api/workshops/[id]/duplicate
// Duplique un atelier existant (sans les participants/attendance).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const { id } = await params;
    const original = await prisma.workshop.findUnique({
      where: { id },
      include: { series: true },
    });
    if (!original) {
      return NextResponse.json({ error: "Atelier introuvable" }, { status: 404 });
    }

    const duplicate = await prisma.workshop.create({
      data: {
        title: `${original.title} (copie)`,
        description: original.description,
        startAt: new Date(original.startAt.getTime() + 7 * 24 * 60 * 60 * 1000),
        endAt: new Date(original.endAt.getTime() + 7 * 24 * 60 * 60 * 1000),
        capacity: original.capacity,
        location: original.location,
        meetingUrl: original.meetingUrl,
        seriesId: original.seriesId,
        createdBy: session.user.id,
      },
      include,
    });

    return NextResponse.json(duplicate, { status: 201 });
  } catch (e) {
    console.error("POST /api/ateliers/[id]/duplicate erreur", e);
    return NextResponse.json({ error: "Impossible de dupliquer l'atelier" }, { status: 500 });
  }
}
