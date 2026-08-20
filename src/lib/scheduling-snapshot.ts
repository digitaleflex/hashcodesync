// Génération et service du snapshot pré-calculé du scheduling (issue #67).
// Le snapshot est créé post-validation ou via job de rattrapage, et servi
// par la route scheduling en priorité (évite le recalcul à chaud).

import { prisma } from "@/lib/prisma";
import { computeScheduling } from "@/lib/scheduling";
import { convertToReference, REFERENCE_TIMEZONE, currentWeekStart } from "@/lib/timezone";
import { mergePerUserIntervals, expandPatterns, type SlotAvail } from "@/lib/scheduling";
import { computeMassHours } from "@/lib/masse-horaire";
import { presenceProbability } from "@/lib/probability";
import type { ScoreConfig } from "@/lib/scoring";

type UserSlots = {
  id: string;
  role: string;
  timezone: string;
  attendance: { present: number; absent: number };
  availabilities: { day: number; startTime: string; endTime: string; groupId: string | null; activityId: string | null }[];
  recurring: { dayMask: number; startTime: string; endTime: string; groupId: string | null; activityId: string | null }[];
  planningPreferences: { preferredDays: number; morning: boolean; afternoon: boolean; evening: boolean } | null;
};

function weightedRows(u: UserSlots, groupScope: string | null, activityId: string | null, massScope: boolean) {
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

function countAttendance(rows: { status: string }[]) {
  return {
    present: rows.filter((r) => r.status === "present").length,
    absent: rows.filter((r) => r.status === "absent").length,
  };
}

export type SnapshotParams = {
  windowHours: number;
  groupId: string | null;
  activityId: string | null;
  smooth: boolean;
  requiresMentor: boolean;
  capacity: number | null;
  maxPerDay?: number;
  maxWorkshopsPerWeek?: number;
};

// Génère le snapshot de scheduling pour la semaine courante + paramètres donnés.
// Stocke en DB et retourne le payload généré.
export async function generateSchedulingSnapshot(params: SnapshotParams) {
  const weekStart = currentWeekStart();

  // Récupérer les membres et leurs disponibilités
  let users: UserSlots[];
  let totalMembers: number;

  if (params.groupId) {
    const members = await prisma.groupMember.findMany({
      where: { groupId: params.groupId },
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
            planningPreferences: {
              select: { preferredDays: true, morning: true, afternoon: true, evening: true },
            },
          },
        },
      },
    });
    totalMembers = members.length;
    users = members.map((m) => ({
      id: m.user.id,
      role: m.user.role,
      timezone: m.user.timezone,
      attendance: countAttendance(m.user.attendances),
      availabilities: m.user.availabilities,
      recurring: m.user.recurringAvailabilities,
      planningPreferences: m.user.planningPreferences,
    }));
  } else {
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
        planningPreferences: {
          select: { preferredDays: true, morning: true, afternoon: true, evening: true },
        },
      },
    });
    totalMembers = all.length;
    users = all.map((u) => ({
      id: u.id,
      role: u.role,
      timezone: u.timezone,
      attendance: countAttendance(u.attendances),
      availabilities: u.availabilities,
      recurring: u.recurringAvailabilities,
      planningPreferences: u.planningPreferences,
    }));
  }

  const rows = users.flatMap((u) => weightedRows(u, params.groupId, params.activityId, !params.groupId));
  const availabilities = convertToReference(rows);
  const merged = mergePerUserIntervals(
    availabilities.map(
      (a): SlotAvail => ({ day: a.day, startMin: a.startMin, endMin: a.endMin, weight: a.weight, userId: a.userId, mentor: a.mentor })
    )
  );

  // Preference lookup
  const preferenceMap = new Map<string, { preferredDays: number; morning: boolean; afternoon: boolean; evening: boolean }>();
  for (const u of users) {
    if (u.planningPreferences) preferenceMap.set(u.id, u.planningPreferences);
  }
  const preferenceLookup = preferenceMap.size > 0
    ? (userId: string) => preferenceMap.get(userId) ?? null
    : undefined;

  // Fairness map
  const perUserCount = new Map<string, number>();
  for (const r of rows) perUserCount.set(r.userId!, (perUserCount.get(r.userId!) ?? 0) + 1);
  const fairnessMap = new Map<string, number>();
  if (perUserCount.size > 0) {
    const maxCount = Math.max(1, ...perUserCount.values());
    for (const [userId, count] of perUserCount) {
      fairnessMap.set(userId, 1 - count / maxCount);
    }
  }

  const scheduling = computeScheduling(merged, Math.max(totalMembers, 1), params.windowHours, {
    smooth: params.smooth,
    smoothSigma: 1.2,
    requiresMentor: params.requiresMentor,
    capacity: params.capacity,
    maxPerDay: params.maxPerDay,
    maxWorkshopsPerWeek: params.maxWorkshopsPerWeek,
    preferenceLookup,
    fairnessMap: fairnessMap.size > 0 ? fairnessMap : undefined,
  });

  // Stocker en DB
  const payload = {
    ...scheduling,
    referenceTimezone: REFERENCE_TIMEZONE,
    groupId: params.groupId ?? undefined,
    maxPerDay: params.maxPerDay,
  };

  await prisma.schedulingSnapshot.upsert({
    where: {
      weekStart_windowHours_groupId_activityId: {
        weekStart,
        windowHours: params.windowHours,
        groupId: params.groupId ?? "",
        activityId: params.activityId ?? "",
      },
    },
    update: { payload, generatedAt: new Date() },
    create: {
      weekStart,
      windowHours: params.windowHours,
      groupId: params.groupId,
      activityId: params.activityId,
      smooth: params.smooth,
      requiresMentor: params.requiresMentor,
      capacity: params.capacity,
      maxPerDay: params.maxPerDay ?? null,
      payload,
    },
  });

  return payload;
}

// Récupère le snapshot pré-calculé pour la semaine courante + paramètres.
// Retourne null si le snapshot n'existe pas (fallback à chaud).
export async function getSchedulingSnapshot(params: SnapshotParams) {
  const weekStart = currentWeekStart();
  const snapshot = await prisma.schedulingSnapshot.findUnique({
    where: {
      weekStart_windowHours_groupId_activityId: {
        weekStart,
        windowHours: params.windowHours,
        groupId: params.groupId ?? "",
        activityId: params.activityId ?? "",
      },
    },
  });
  if (!snapshot) return null;
  return snapshot.payload as Record<string, unknown>;
}
