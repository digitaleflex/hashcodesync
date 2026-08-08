import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/workshops/[id]/ical
// Exporte un atelier au format iCalendar (.ics).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const workshop = await prisma.workshop.findUnique({
    where: { id },
    include: { series: true },
  });
  if (!workshop) {
    return NextResponse.json({ error: "Atelier introuvable" }, { status: 404 });
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDate = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

  const dtstamp = formatDate(new Date());
  const dtstart = formatDate(workshop.startAt);
  const dtend = formatDate(workshop.endAt);
  const uid = `${workshop.id}@hashcodesync`;
  const summary = workshop.title;
  const description = workshop.description ?? "";
  const location = workshop.location ?? "";
  const url = `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000"}/ateliers/${workshop.id}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HashCode Sync//FR",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    `LOCATION:${location}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar;charset=utf-8",
      "Content-Disposition": `attachment; filename="${workshop.title.replace(/[^a-z0-9]/gi, "_")}.ics"`,
    },
  });
}
