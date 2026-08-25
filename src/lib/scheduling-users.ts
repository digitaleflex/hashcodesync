// Chargement partagé des utilisateurs pour le cockpit de planification
// (route admin/scheduling) et le planificateur de séries (#79).

import { prisma } from "@/lib/prisma";
import { computeMassHours } from "@/lib/masse-horaire";
import { presenceProbability } from "@/lib/probability";
import { expandPatterns } from "@/lib/scheduling";

export type UserSlots = {
  id: string;
  role: string;
  timezone: string;
  attendance: { present: number; absent: number };
  availabilities: { day: number; startTime: string; endTime: string; groupId: string | null; activityId: string | null }[];
  recurring: { dayMask: number; startTime: string; endTime: string; groupId: string | null; activityId: string | null }[];
};

export function countAttendance(rows: { status: string }[]) {
  return {
    present: rows.filter((r) => r.status === "present").length,
    absent: rows.filter((r) => r.status === "absent").length,
  };
}

export function weightedRows(
  u: UserSlots,
  groupScope: string | null,
  activityId: string | null,
  massScope: boolean,
) {
  const declared = [...u.availabilities, ...expandPatterns(u.recurring)];
  const slots = massScope
    ? declared
    : declared.filter(
        (a) =>
          (a.groupId === groupScope || a.groupId === null) &&
          (!activityId || a.activityId === activityId || a.activityId === null)
      );
  if (slots.length === 0) return [];
  const mass = computeMassHours(slots.map((s) => ({ day: s.day, startTime: s.startTime, endTime: s.endTime })));
  const weight = presenceProbability({ present: u.attendance.present, absent: u.attendance.absent }, mass);
  return slots.map((a) => ({
    day: a.day,
    startTime: a.startTime,
    endTime: a.endTime,
    userTz: u.timezone,
    userId: u.id,
    weight,
    mentor: u.role === "mentor",
  }));
}

/** Utilisateurs du périmètre : membres d'un groupe, ou cohorte entière. */
export async function loadSchedulingUsers(groupId: string | null): Promise<{
  totalMembers: number;
  users: UserSlots[];
}> {
  if (groupId) {
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            timezone: true,
            attendances: { select: { status: true } },
            availabilities: {
              select: { day: true, startTime: true, endTime: true, groupId: true, activityId: true },
            },
            recurringAvailabilities: {
              select: { dayMask: true, startTime: true, endTime: true, groupId: true, activityId: true },
            },
          },
        },
      },
    });
    return {
      totalMembers: members.length,
      users: members.map((m) => ({
        id: m.user.id,
        role: m.user.role,
        timezone: m.user.timezone,
        attendance: countAttendance(m.user.attendances),
        availabilities: m.user.availabilities,
        recurring: m.user.recurringAvailabilities,
      })),
    };
  }

  const all = await prisma.user.findMany({
    where: { availabilities: { some: {} } },
    select: {
      id: true,
      role: true,
      timezone: true,
      attendances: { select: { status: true } },
      availabilities: {
        select: { day: true, startTime: true, endTime: true, groupId: true, activityId: true },
      },
      recurringAvailabilities: {
        select: { dayMask: true, startTime: true, endTime: true, groupId: true, activityId: true },
      },
    },
  });
  return {
    totalMembers: all.length,
    users: all.map((u) => ({
      id: u.id,
      role: u.role,
      timezone: u.timezone,
      attendance: countAttendance(u.attendances),
      availabilities: u.availabilities,
      recurring: u.recurringAvailabilities,
    })),
  };
}
