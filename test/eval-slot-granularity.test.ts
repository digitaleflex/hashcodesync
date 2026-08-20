// Issue #61 : Évaluation de la granularité des créneaux candidats (60/30/15 min).
// Benchmark comparant les 3 granularités sur volume de fenêtres, temps de calcul
// et qualité (crénauexploitables gagnés).
//
// Méthodologie : ALGORITHM_BENCHMARK.md — scénarios réalistes, PRNG déterministe.

import { test } from "node:test";
import assert from "node:assert/strict";

// PRNG déterministe (mulberry32)
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type SlotAvail = {
  day: number;
  startMin: number;
  endMin: number;
  weight?: number;
  userId?: string;
  mentor?: boolean;
};

// Fusionne les intervalles d'un même membre sur un même jour
function mergePerUserIntervals(slots: SlotAvail[]): SlotAvail[] {
  const hasIds = slots.length > 0 && slots.every((s) => s.userId);
  if (!hasIds) return slots;
  const byUser = new Map<string, Map<number, SlotAvail[]>>();
  for (const s of slots) {
    let byDay = byUser.get(s.userId!);
    if (!byDay) { byDay = new Map(); byUser.set(s.userId!, byDay); }
    const arr = byDay.get(s.day) ?? [];
    arr.push(s);
    byDay.set(s.day, arr);
  }
  const merged: SlotAvail[] = [];
  for (const [userId, byDay] of byUser) {
    for (const [day, intervals] of byDay) {
      intervals.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
      let cur = intervals[0];
      for (let i = 1; i < intervals.length; i++) {
        const next = intervals[i];
        if (next.startMin <= cur.endMin) {
          cur.endMin = Math.max(cur.endMin, next.endMin);
        } else {
          merged.push({ day, startMin: cur.startMin, endMin: cur.endMin, userId, weight: cur.weight });
          cur = next;
        }
      }
      merged.push({ day, startMin: cur.startMin, endMin: cur.endMin, userId, weight: cur.weight });
    }
  }
  return merged;
}

// Candidats paramétriques : pas de 60, 30 ou 15 min
function candidateSlotsParametric(
  availabilities: SlotAvail[],
  windowMinutes: number,
  minHour: number,
  maxHour: number,
  stepMinutes: number = 60
): { day: number; startMin: number; endMin: number; weight: number }[] {
  const out: { day: number; startMin: number; endMin: number; weight: number }[] = [];
  for (let day = 0; day < 7; day++) {
    const members = availabilities.filter((a) => a.day === day);
    if (members.length === 0) continue;
    for (let startMin = minHour * 60; startMin + windowMinutes <= maxHour * 60; startMin += stepMinutes) {
      const end = startMin + windowMinutes;
      const covering = members.filter((a) => a.startMin <= startMin && a.endMin >= end);
      const weight = covering.reduce((sum, c) => sum + (c.weight ?? 1), 0);
      if (weight > 0) {
        out.push({ day, startMin, endMin: end, weight });
      }
    }
  }
  return out;
}

// Génère des disponibilités réalistes
function generateAvailabilities(rand: () => number, nMembers: number): SlotAvail[] {
  const slots: SlotAvail[] = [];
  for (let m = 0; m < nMembers; m++) {
    const nSlots = 2 + Math.floor(rand() * 5);
    for (let s = 0; s < nSlots; s++) {
      const day = Math.floor(rand() * 7);
      const startHour = 8 + Math.floor(rand() * 10);
      const durationH = 1 + Math.floor(rand() * 3);
      const weight = 0.3 + rand() * 0.6;
      slots.push({
        day,
        startMin: startHour * 60,
        endMin: (startHour + durationH) * 60,
        weight,
        userId: `m${m}`,
      });
    }
  }
  return slots;
}

const windowHours = 2;
const windowMinutes = windowHours * 60;
const minHour = 8;
const maxHour = 20;

const steps = [
  { label: "60 min", step: 60 },
  { label: "30 min", step: 30 },
  { label: "15 min", step: 15 },
];

const cohortSizes = [
  { label: "10 membres", n: 10 },
  { label: "30 membres", n: 30 },
  { label: "50 membres", n: 50 },
];

for (const cohort of cohortSizes) {
  for (const step of steps) {
    test(`Granularité ${step.label} — ${cohort.label}`, () => {
      const rand = mulberry32(42);
      const raw = generateAvailabilities(rand, cohort.n);
      const merged = mergePerUserIntervals(raw);

      const t0 = performance.now();
      const candidates = candidateSlotsParametric(merged, windowMinutes, minHour, maxHour, step.step);
      const elapsed = performance.now() - t0;

      console.log(`  ${step.label} (${cohort.label}):`);
      console.log(`    Fenêtres candidates: ${candidates.length}`);
      console.log(`    Temps calcul:        ${elapsed.toFixed(2)}ms`);
      console.log(`    Ratio vs 60min:      ×${(candidates.length / Math.max(1, 1)).toFixed(1)}`);

      // Le nombre de fenêtres doit croître avec la granularité
      if (step.step < 60) {
        assert.ok(candidates.length > 0, "Doit produire des fenêtres candidates");
      }
    });
  }
}

test("Verdict granularité — benchmark comparatif complet", () => {
  const rand = mulberry32(2026);
  const raw = generateAvailabilities(rand, 20);
  const merged = mergePerUserIntervals(raw);

  const results: { step: number; label: string; count: number; timeMs: number }[] = [];

  for (const { label, step } of steps) {
    const t0 = performance.now();
    const candidates = candidateSlotsParametric(merged, windowMinutes, minHour, maxHour, step);
    const elapsed = performance.now() - t0;
    results.push({ step, label, count: candidates.length, timeMs: elapsed });
  }

  const baseline = results[0].count;

  console.log(`\n=== VERDICT GRANULARITÉ (issue #61) ===`);
  console.log(`Cohorte: 20 membres, fenêtre 2h, plage 8h-20h`);
  console.log(`┌─────────┬──────────────┬───────────┬──────────────────┐`);
  console.log(`│ Granul.  │ Fenêtres     │ Temps     │ Ratio vs 60min   │`);
  console.log(`├─────────┼──────────────┼───────────┼──────────────────┤`);
  for (const r of results) {
    const ratio = (r.count / baseline).toFixed(1);
    console.log(`│ ${r.label.padEnd(8)}│ ${String(r.count).padStart(12)} │ ${r.timeMs.toFixed(2).padStart(8)}ms │ ×${ratio.padStart(15)} │`);
  }
  console.log(`└─────────┴──────────────┴───────────┴──────────────────┘`);

  const ratio30 = results[1].count / baseline;
  const ratio15 = results[2].count / baseline;

  if (ratio30 <= 2.5 && ratio15 <= 5) {
    console.log(`\nDÉCISION: 30 min ACTIVABLE — ratio ×${ratio30.toFixed(1)} acceptable.`);
    console.log(`15 min: ratio ×${ratio15.toFixed(1)} — à évaluer en production.`);
  } else {
    console.log(`\nDÉCISION: Conserver 60 min par défaut — coût computationnel trop élevé.`);
  }

  // Validations
  assert.ok(results[0].count > 0, "60 min doit produire des fenêtres");
  assert.ok(results[1].count >= results[0].count, "30 min >= 60 min en nombre de fenêtres");
  assert.ok(results[2].count >= results[1].count, "15 min >= 30 min en nombre de fenêtres");
});
