import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScheduling, computeCoveragePercent, selectNonOverlappingHours } from "../src/lib/scheduling";
import type { SlotAvail } from "../src/lib/scheduling";
import { computeSlotScore, DEFAULT_SCORE_CONFIG } from "../src/lib/scoring";
import { computeStats } from "../src/components/availability/shared";
import { detectGaps } from "../src/app/api/admin/scheduling/gaps/route";

// PRNG déterministe (mulberry32) pour des tests de parité reproductibles.
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

// Forme minimale d'un créneau candidat (struct précisé dans scheduling.ts).
type CandSlotLike = {
  day: number;
  startMin: number;
  endMin: number;
  startHour: number;
  endHour: number;
  weight: number;
  score: number;
  breakdown: { coverage: number; mentorFit: number; capacityFit: number; preference: number; fairness: number; conflict: number };
  covering: SlotAvail[];
};

// Deux membres couvrant entièrement le créneau de 2 h testé (lundi 8h-12h).
const rows: SlotAvail[] = [
  { day: 0, startMin: 480, endMin: 720, weight: 0.8, userId: "a" },
  { day: 0, startMin: 480, endMin: 720, weight: 0.6, userId: "b" },
];

test("computeScheduling: expectedAttendance, coveragePercent et factors (V1.1-03/04)", () => {
  const s = computeScheduling(rows, 4, 2);
  const top = s.recommendation[0];
  // available (somme des poids) conservé pour compat, attendu = même valeur.
  assert.equal(top.expectedAttendance, top.available);
  assert.equal(top.available, 1.4);
  // 2 membres distincts / cohorte de 4 → couverture 50 %.
  assert.equal(top.memberCount, 2);
  assert.equal(top.coveragePercent, 50);
  // percent reste la part pondérée de la cohorte (rétrocompat).
  assert.equal(top.percent, Math.round((1.4 / 4) * 100));
  // Facteurs explicatifs présents, y compris le top contributeur.
  const kinds = top.factors.map((f) => f.kind);
  assert.ok(kinds.includes("coverage"));
  assert.ok(kinds.includes("expected-attendance"));
  assert.ok(kinds.includes("top-contributors"));
  assert.ok(top.factors.every((f) => f.label && f.detail));
});

test("computeScheduling: heatmap expose memberCount par cellule", () => {
  const s = computeScheduling(rows, 4, 2);
  const cell = s.heatmap.find((c) => c.day === 0 && c.hour === 8);
  assert.ok(cell);
  // 2 membres distincts couvrent 8h-9h.
  assert.equal(cell.memberCount, 2);
  assert.equal(cell.count, 1.4);
});

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

test("computeCoveragePercent: référence dynamique, borné à 100, pas de constante magique", () => {
  // 10 membres, chacun 5 créneaux max → 50 créneaux max. 25 déclarés = 50 %.
  assert.equal(computeCoveragePercent(25, 10, 5), 50);
  // Au-dessus du max (ex. dérive de données) → borné à 100.
  assert.equal(computeCoveragePercent(60, 10, 5), 100);
  // Aucun membre ou aucun créneau max → 0 (pas de division par zéro).
  assert.equal(computeCoveragePercent(0, 0, 0), 0);
  assert.equal(computeCoveragePercent(3, 0, 5), 0);
  assert.equal(computeCoveragePercent(3, 5, 0), 0);
});

// Référence O(n²) : même règle WIS que la version dichotomique, avec la
// recherche de prédécesseur par scan linéaire arrière (ancienne implémentation).
function wisReference(slots: { endMin: number; startMin: number; score: number }[]) {
  const sorted = [...slots].sort(
    (a, b) => a.endMin - b.endMin || a.startMin - b.startMin
  );
  const n = sorted.length;
  const p = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    for (let j = i - 1; j >= 0; j--) {
      if (sorted[j].endMin <= sorted[i].startMin) {
        p[i] = j;
        break;
      }
    }
  }
  const dp = new Array(n).fill(0);
  const take = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    const incl = sorted[i].score + (p[i] >= 0 ? dp[p[i]] : 0);
    const excl = i > 0 ? dp[i - 1] : 0;
    if (incl >= excl) {
      dp[i] = incl;
      take[i] = true;
    } else {
      dp[i] = excl;
      take[i] = false;
    }
  }
  const selected: number[] = [];
  let i = n - 1;
  while (i >= 0) {
    if (take[i]) {
      selected.push(i);
      i = p[i];
    } else {
      i--;
    }
  }
  selected.reverse();
  return selected.map((idx) => ({ index: idx, startMin: sorted[idx].startMin, endMin: sorted[idx].endMin }));
}

test("selectNonOverlappingHours: parité dichotomie vs O(n²) sur 1000 cas aléatoires", () => {
  const rand = mulberry32(20260814);
  for (let t = 0; t < 1000; t++) {
    const n = 1 + Math.floor(rand() * 14);
    const day = Math.floor(rand() * 7);
    const slots: CandSlotLike[] = [];
    for (let k = 0; k < n; k++) {
      const startMin = 360 + Math.floor(rand() * 600);
      const len = 30 + Math.floor(rand() * 3) * 30;
      const weight = Math.round(rand() * 200) / 100;
      slots.push({
        day,
        startMin,
        endMin: startMin + len,
        startHour: startMin / 60,
        endHour: (startMin + len) / 60,
        weight,
        score: weight,
        breakdown: { coverage: weight, mentorFit: 0, capacityFit: 0, preference: 0, fairness: 0, conflict: 0 },
        covering: [],
      });
    }
    const got = selectNonOverlappingHours(slots).map((s) => `${s.startMin}-${s.endMin}`).sort();
    const ref = wisReference(slots).map((s) => `${s.startMin}-${s.endMin}`).sort();
    assert.deepEqual(got, ref, `cas ${t} (n=${n}) : dichotomie != O(n²)`);
  }
});

test("computeSlotScore: parité — config par défaut = Σ pᵢ (V2-01)", () => {
  const weights = [0.8, 0.6];
  const r = computeSlotScore(weights, {}, DEFAULT_SCORE_CONFIG);
  assert.equal(r.score, 1.4);
  // Termes inactifs = 0 sans la donnée.
  assert.deepEqual(r.breakdown, { coverage: 1.4, mentorFit: 0, capacityFit: 0, preference: 0, fairness: 0, conflict: 0 });
});

test("computeSlotScore: mentor/capacité/préférences/équité/conflit activés", () => {
  const cfg = {
    weights: {
      coverage: 1,
      mentorFit: 0.4,
      capacityFit: 0.3,
      preference: 0.15,
      fairness: 0.1,
      conflictPenalty: 0.5,
    },
  };
  const r = computeSlotScore(
    [0.8, 0.6],
    {
      mentorAvailable: true,
      capacity: 4,
      preferences: [{ matched: true }, { matched: false }],
      fairness: 0.2,
      conflict: 0,
    },
    cfg
  );
  // f_men=1 (w .4), f_cap=min(1, 1.4/4)=0.35 (w .3), f_pref=0.5 (w .15),
  // f_fair=0.2 (w .1) → score = 1.4 + .4 + .105 + .075 + .02 = 2.0
  assert.equal(Math.round(r.score * 1000), 2000);
  assert.equal(r.breakdown.mentorFit, 1);
  assert.equal(Math.round(r.breakdown.capacityFit * 100), 35);
  assert.equal(r.breakdown.preference, 0.5);
  assert.equal(r.breakdown.fairness, 0.2);
  assert.equal(r.breakdown.conflict, 0);
});

test("computeScheduling: score composé exposé, config par défaut = rétrocompat", () => {
  const s = computeScheduling(rows, 4, 2);
  const top = s.recommendation[0];
  // score == available (Σ pᵢ) par défaut.
  assert.equal(top.score, top.available);
  assert.equal(top.score, 1.4);
  // Décomposition présente et cohérente.
  assert.equal(top.scoreBreakdown.coverage, 1.4);
  assert.equal(top.scoreBreakdown.mentorFit, 0);
  // Factors enrichis du score composé.
  assert.ok(top.factors.some((f) => f.kind === "score"));
});

test("detectGaps: seuil relatif au max du jour (ALG-009)", () => {
  // Lundi (day 0) : 8h couvert par 20 membres, 9h par 1 membre (5% du max),
  // 10h-11h vides. Mardi (day 1) : entièrement vide.
  const heatmap = [
    { day: 0, hour: 8, count: 20 },
    { day: 0, hour: 9, count: 1 },
    { day: 0, hour: 10, count: 0 },
    { day: 0, hour: 11, count: 0 },
  ];
  const gaps = detectGaps(heatmap, 8, 12, 0.15);

  const lundi = gaps.find((g) => g.day === 0)!;
  // 1 membre < 15% de 20 (soit 3) : 9h, 10h et 11h sont des gaps consécutifs.
  assert.equal(lundi.gaps.length, 1);
  assert.deepEqual(lundi.gaps[0], { startHour: 9, endHour: 12, duration: 3 });

  // Jour entièrement vide : toute la plage est un gap.
  const mardi = gaps.find((g) => g.day === 1)!;
  assert.deepEqual(mardi.gaps, [{ startHour: 8, endHour: 12, duration: 4 }]);
});

test("detectGaps: seuil 0 ne signale que les plages strictement vides", () => {
  const heatmap = [
    { day: 0, hour: 8, count: 20 },
    { day: 0, hour: 9, count: 1 },
    { day: 0, hour: 10, count: 0 },
  ];
  const gaps = detectGaps(heatmap, 8, 11, 0);
  const lundi = gaps.find((g) => g.day === 0)!;
  // threshold=0 → gapLevel=0 : seul 10h (count=0) est un gap.
  assert.deepEqual(lundi.gaps, [{ startHour: 10, endHour: 11, duration: 1 }]);
});
