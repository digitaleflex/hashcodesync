import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScheduling } from "../src/lib/scheduling";
import type { SlotAvail } from "../src/lib/scheduling";
import { computeStats } from "../src/components/availability/shared";

// Deux membres couvrant entièrement le créneau de 2 h testé (lundi 8h-12h).
const rows: SlotAvail[] = [
  { day: 0, startMin: 480, endMin: 720, weight: 0.8, userId: "a" },
  { day: 0, startMin: 480, endMin: 720, weight: 0.6, userId: "b" },
];

test("computeScheduling: recommendation expose memberCount et topContributors", () => {
  const s = computeScheduling(rows, 2, 2);
  assert.ok(s.recommendation.length > 0);

  const top = s.recommendation[0];
  // Toute fenêtre de 2 h dans 8-12 est couverte par les deux membres.
  assert.equal(top.memberCount, 2);
  assert.ok(Array.isArray(top.topContributors));
  assert.equal(top.topContributors.length, 2);
  // Trié par poids décroissant.
  assert.equal(top.topContributors[0].userId, "a");
  assert.equal(top.topContributors[1].userId, "b");
  // weights arrondis à 2 décimales.
  assert.equal(top.topContributors[0].weight, 0.8);
  assert.equal(top.topContributors[1].weight, 0.6);
});

test("computeScheduling: memberCount sans userId (agrégat) = nombre de créneaux couvrants", () => {
  const s = computeScheduling(
    rows.map(({ userId: _u, ...r }) => r),
    2,
    2
  );
  const top = s.recommendation[0];
  assert.equal(top.memberCount, 2);
  assert.deepEqual(
    top.topContributors.map((c) => c.userId),
    [null, null]
  );
});

test("computeStats: heures fusionnées identiques à computeMassHours", async () => {
  const { computeMassHours } = await import("../src/lib/masse-horaire");
  const slots = [
    { day: 0, startTime: "09:00", endTime: "12:00" },
    { day: 0, startTime: "11:00", endTime: "13:00" },
    { day: 1, startTime: "14:00", endTime: "16:00" },
  ];
  const stats = computeStats(slots);
  // Fusion : lundi 09-13 (4h) + mardi 2h = 6h — et non 5h (somme brute 3+2+2).
  assert.equal(stats.hours, 6);
  assert.equal(stats.hours, computeMassHours(slots));
  assert.equal(stats.bestDay, 0);
  assert.equal(stats.daysCount, 2);
  assert.equal(stats.slots, 3);
});
