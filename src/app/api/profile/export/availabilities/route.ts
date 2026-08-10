import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/profile/export/availabilities -> CSV des créneaux de disponibilités.
const DAY_NAMES = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [availabilities, recurring] = await Promise.all([
    prisma.availability.findMany({
      where: { userId: session.user.id },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    }),
    prisma.recurringAvailability.findMany({ where: { userId: session.user.id } }),
  ]);

  const rows: string[] = ["jour;debut;fin;type;jour_mask"];
  for (const a of availabilities) {
    rows.push(
      [
        csvCell(DAY_NAMES[a.day] ?? String(a.day)),
        a.startTime,
        a.endTime,
        csvCell(a.recurring ? "recurrent" : "ponctuel"),
        "",
      ].join(";")
    );
  }
  for (const r of recurring) {
    rows.push(["", r.startTime, r.endTime, "recurrent", String(r.dayMask)].join(";"));
  }

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hashcode-sync-disponibilites.csv"`,
    },
  });
}