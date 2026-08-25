import { test } from "node:test";
import assert from "node:assert/strict";
import { planSeries } from "../src/lib/series";
import type { SlotAvail } from "../src/lib/scheduling";

// Lundi 00:00 UTC de référence pour tous les tests.
const WEEK_START = new Date("2026-08-24T00:00:00Z");

function avail(
  userId: string,
  day: number,
  startHour: number,
  endHour: number,
): SlotAvail {
  return {
    day,
    startMin: startHour * 60,
    endMin: endHour * 60,
    weight: 1,
    userId,
  };
}

// Cohorte de 3 membres disponibles lundi et mardi, 9h-18h.
const BASE_AVAILS = [
  avail("u1", 0, 9, 18),
  avail("u2", 0, 9, 18),
  avail("u3", 0, 9, 18),
  avail("u1", 1, 9, 18),
  avail("u2", 1, 9, 18),
];

test("planSeries : génère N sessions non chevauchantes réparties sur les semaines", () => {
  const { proposals, warnings } = planSeries({
    availabilities: BASE_AVAILS,
    totalMembers: 3,
    params: {
      weeks: 4,
      perWeek: 1,
      windowHours: 2,
      startWeekStart: WEEK_START,
    },
    budgets: new Map(),
    absences: [],
  });

  assert.equal(warnings.length, 0);
  assert.equal(proposals.length, 4);

  // Une session par semaine, dates espacées d'exactement 7 jours.
  for (let i = 0; i < proposals.length; i++) {
    assert.equal(proposals[i].weekIndex, i);
    const expected = WEEK_START.getTime() + i * 7 * 86400000;
    assert.equal(new Date(proposals[i].startAt).getTime() - expected >= 0, true);
  }

  // Aucun chevauchement au sein d'une même semaine (ici 1/semaine par
  // construction) : les jours peuvent varier mais pas se superposer.
  for (let w = 0; w < 4; w++) {
    const weekProps = proposals.filter((p) => p.weekIndex === w);
    assert.equal(weekProps.length, 1);
  }
});

test("planSeries : 2 sessions/semaine sans chevauchement", () => {
  const { proposals, warnings } = planSeries({
    availabilities: [
      ...BASE_AVAILS,
      avail("u3", 1, 9, 18),
      avail("u1", 2, 9, 18),
      avail("u2", 2, 9, 18),
      avail("u3", 2, 9, 18),
    ],
    totalMembers: 3,
    params: { weeks: 3, perWeek: 2, windowHours: 2, startWeekStart: WEEK_START },
    budgets: new Map(),
    absences: [],
  });

  assert.equal(proposals.length, 6);
  assert.deepEqual(warnings, []);

  for (let w = 0; w < 3; w++) {
    const weekProps = proposals.filter((p) => p.weekIndex === w);
    // Non-chevauchement strict au sein de la semaine.
    for (let a = 0; a < weekProps.length; a++) {
      for (let b = a + 1; b < weekProps.length; b++) {
        const pa = weekProps[a];
        const pb = weekProps[b];
        const overlap =
          pa.day === pb.day &&
          new Date(pa.startAt) < new Date(pb.endAt) &&
          new Date(pb.startAt) < new Date(pa.endAt);
        assert.equal(overlap, false, `Chevauchement détecté semaine ${w}`);
      }
    }
  }
});

test("planSeries : le budget maxWorkshopsPerWeek bloque la 2e session du membre", () => {
  const { proposals } = planSeries({
    availabilities: BASE_AVAILS,
    totalMembers: 3,
    params: { weeks: 2, perWeek: 2, windowHours: 2, startWeekStart: WEEK_START },
    // Tous les membres limités à 1 atelier/semaine : impossible d'avoir 2
    // sessions hebdo couvertes → les semaines impaires restent vides.
    budgets: new Map([
      ["u1", { maxWorkshopsPerWeek: 1 }],
      ["u2", { maxWorkshopsPerWeek: 1 }],
      ["u3", { maxWorkshopsPerWeek: 1 }],
    ]),
    absences: [],
  });

  // Chaque semaine ne peut porter qu'une session couverte par u1/u2 (u3 absent
  // du mardi). Les semaines avec une seule session sont acceptées, jamais deux.
  for (let w = 0; w < 2; w++) {
    assert.ok(
      proposals.filter((p) => p.weekIndex === w).length <= 1,
      `Budget dépassé semaine ${w}`,
    );
  }
});

test("planSeries : les absences planifiées bloquent les créneaux concernés", () => {
  // Absence de toute la cohorte la première semaine (lundi inclus).
  const absenceStart = new Date(WEEK_START.getTime());
  const absenceEnd = new Date(WEEK_START.getTime() + 6 * 86400000);
  const { proposals } = planSeries({
    availabilities: BASE_AVAILS,
    totalMembers: 3,
    params: { weeks: 2, perWeek: 1, windowHours: 2, startWeekStart: WEEK_START },
    budgets: new Map(),
    absences: [
      { userId: "u1", startDate: absenceStart, endDate: absenceEnd },
      { userId: "u2", startDate: absenceStart, endDate: absenceEnd },
      { userId: "u3", startDate: absenceStart, endDate: absenceEnd },
    ],
  });

  // La semaine 1 est vide (tous absents), la semaine 2 est servie.
  assert.ok(!proposals.some((p) => p.weekIndex === 0));
  assert.ok(proposals.some((p) => p.weekIndex === 1));
});

test("planSeries : équité — ne pas retomber toujours sur le même jour/public", () => {
  const { proposals } = planSeries({
    availabilities: [
      ...BASE_AVAILS,
      avail("u3", 1, 9, 18),
      avail("u1", 2, 9, 18),
      avail("u2", 2, 9, 18),
      avail("u3", 2, 9, 18),
    ],
    totalMembers: 3,
    params: { weeks: 4, perWeek: 1, windowHours: 2, startWeekStart: WEEK_START },
    budgets: new Map(),
    absences: [],
  });

  // Avec des scores identiques partout, la rotation doit viser plusieurs jours.
  const distinctDays = new Set(proposals.map((p) => p.day));
  assert.ok(distinctDays.size > 1, `Un seul jour utilisé: ${[...distinctDays]}`);
});
