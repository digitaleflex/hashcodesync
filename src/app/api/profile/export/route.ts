import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/profile/export -> export JSON complet des données personnelles.
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = session.user.id;
  const [user, prefs, unavailabilities, availabilities, recurring, memberships] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          firstname: true,
          lastname: true,
          role: true,
          timezone: true,
          createdAt: true,
        },
      }),
      prisma.planningPreferences.findUnique({ where: { userId } }),
      prisma.unavailability.findMany({ where: { userId } }),
      prisma.availability.findMany({ where: { userId } }),
      prisma.recurringAvailability.findMany({ where: { userId } }),
      prisma.groupMember.findMany({
        where: { userId },
        include: { group: { select: { id: true, name: true } } },
      }),
    ]);

  const iso = (d: Date) => d.toISOString();
  const data = {
    exportedAt: new Date().toISOString(),
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          firstname: user.firstname,
          lastname: user.lastname,
          role: user.role,
          timezone: user.timezone,
          createdAt: iso(user.createdAt),
        }
      : null,
    planningPreferences: prefs ?? null,
    unavailabilities: unavailabilities.map((u) => ({
      id: u.id,
      startDate: iso(u.startDate),
      endDate: iso(u.endDate),
      reason: u.reason,
    })),
    availabilities: availabilities.map((a) => ({
      id: a.id,
      day: a.day,
      startTime: a.startTime,
      endTime: a.endTime,
      groupId: a.groupId,
      activityId: a.activityId,
      recurring: a.recurring,
    })),
    recurringAvailabilities: recurring.map((r) => ({
      id: r.id,
      dayMask: r.dayMask,
      startTime: r.startTime,
      endTime: r.endTime,
      groupId: r.groupId,
      activityId: r.activityId,
    })),
    groups: memberships.map((m) => ({
      groupId: m.group.id,
      groupName: m.group.name,
      role: m.role,
    })),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="hashcode-sync-donnees.json"`,
    },
  });
}