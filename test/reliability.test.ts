import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMassHours } from "../src/lib/masse-horaire";
import { presenceProbability } from "../src/lib/probability";

test("computeMassHours: fusionne les créneaux qui se chevauchent", () => {
  const slots = [
    { day: 0, startTime: "09:00", endTime: "12:00" },
    { day: 0, startTime: "11:00", endTime: "13:00" }, // chevauche 09-12
    { day: 1, startTime: "14:00", endTime: "16:00" },
  ];
  // jour 0 -> 09-13 (4h), jour 1 -> 2h => 6h
  assert.equal(computeMassHours(slots), 6);
});

test("computeMassHours: ignore les créneaux invalides", () => {
  const slots = [
    { day: 0, startTime: "09:00", endTime: "09:00" }, // durée nulle
    { day: 0, startTime: "10:00", endTime: "11:30" },
    { day: 0, startTime: "bogus", endTime: "12:00" }, // non parsable
  ];
  assert.equal(computeMassHours(slots), 1.5);
});

test("computeMassHours: retourne zéro sans données", () => {
  assert.equal(computeMassHours([]), 0);
});

test("presenceProbability: sans historique, prior borné par la masse horaire", () => {
  // Masse horaire faible -> prior proche de baseMin.
  const low = presenceProbability({ present: 0, absent: 0 }, 2);
  assert.ok(low >= 0.25 && low <= 0.45);
  // Masse horaire élevée -> prior plus optimiste, borné à baseMax.
  const high = presenceProbability({ present: 0, absent: 0 }, 50);
  assert.ok(high >= 0.8 && high <= 0.85);
});

test("presenceProbability: l'historique domine le prior", () => {
  const withHistory = presenceProbability({ present: 9, absent: 1 }, 5);
  const noHistory = presenceProbability({ present: 0, absent: 0 }, 5);
  assert.ok(withHistory > noHistory);
  // 9/10 présences -> espérance Beta(1+s,1+f) = 10/12 ≈ 0.833, pondérée à 0.7
  assert.ok(Math.abs(withHistory - 0.833 * 0.7 - noHistory * 0.3) < 0.01);
});

test("presenceProbability: reste dans [0,1]", () => {
  for (let present = 0; present <= 3; present++) {
    for (let absent = 0; absent <= 3; absent++) {
      const p = presenceProbability({ present, absent }, 20);
      assert.ok(p >= 0 && p <= 1);
    }
  }
});

test("presenceProbability: peu d'observations = conservateur", () => {
  const oneOk = presenceProbability({ present: 1, absent: 0 }, 10);
  const manyOk = presenceProbability({ present: 10, absent: 0 }, 10);
  // Avec 1 seule présence on ne "monte" pas autant qu'avec 10.
  assert.ok(manyOk > oneOk);
});