import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyMany } from "@/lib/notifications";
import { sendEmailForNotification } from "@/lib/email-notification-templates";
import { withCache } from "@/lib/cache";

const select = {
  id: true,
  title: true,
  description: true,
  startAt: true,
  endAt: true,
  capacity: true,
  location: true,
  meetingUrl: true,
  createdBy: true,
  seriesId: true,
  createdAt: true,
  updatedAt: true,
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
};

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const workshops = await prisma.workshop.findMany({
      orderBy: { startAt: "asc" },
      select,
    });

    return withCache(workshops, 30);
  } catch (e) {
    console.error("GET /api/workshops error", e);
    return NextResponse.json({ error: "Impossible de charger les ateliers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (!["admin", "mentor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Seul un administrateur ou mentor peut créer un atelier" }, { status: 403 });
    }

    let body: {
      title?: unknown;
      description?: unknown;
      startAt?: unknown;
      endAt?: unknown;
      capacity?: unknown;
      location?: unknown;
      meetingUrl?: unknown;
      seriesId?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
    }

    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim() || null;
    const startAt = new Date(String(body.startAt ?? ""));
    const endAt = new Date(String(body.endAt ?? ""));
    const capacity =
      body.capacity !== undefined && body.capacity !== null && String(body.capacity).trim() !== ""
        ? Math.max(1, Number(body.capacity))
        : null;
    const location = String(body.location ?? "").trim() || null;
    const meetingUrl = String(body.meetingUrl ?? "").trim() || null;
    const seriesId = String(body.seriesId ?? "").trim() || null;

    if (!title) {
      return NextResponse.json({ error: "Le titre est requis" }, { status: 400 });
    }
    if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
      return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
    }
    if (endAt <= startAt) {
      return NextResponse.json(
        { error: "La fin doit être après le début" },
        { status: 400 }
      );
    }
    if (capacity !== null && !Number.isFinite(capacity)) {
      return NextResponse.json({ error: "Capacité invalide" }, { status: 400 });
    }

    const workshop = await prisma.workshop.create({
      data: {
        title,
        description,
        startAt,
        endAt,
        capacity,
        location,
        meetingUrl,
        seriesId,
        createdBy: session.user.id,
      },
      select,
    });

    const others = await prisma.user.findMany({
      where: { id: { not: session.user.id } },
      select: { id: true },
    });
    await notifyMany(others.map((u) => u.id), {
      type: "new_workshop",
      title: "Nouvel atelier",
      message: `${workshop.title} · ${workshop.startAt.toLocaleDateString("fr-FR")}`,
    });

    await sendEmailForNotification(others.map((u) => u.id), "new_workshop", {
      actorName: session.user.name,
      workshopTitle: workshop.title,
      actionUrl: `${req.nextUrl.origin}/ateliers/${workshop.id}`,
    });

    return NextResponse.json(workshop, { status: 201 });
  } catch (e) {
    console.error("POST /api/workshops error", e);
    return NextResponse.json({ error: "Impossible de créer l'atelier" }, { status: 500 });
  }
}