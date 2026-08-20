// Issue #60 : Évaluation du Local Search post-traitement (2-opt / swap).
// Prototype de Local Search en fonction pure + benchmark sur scénarios simulés.
// Verdict : implémenter si gain ≥ 5 %, sinon rejeter avec justification.
//
// Méthodologie : ALGORITHM_BENCHMARK.md — scénarios réalistes, PRNG déterministe.

import { test } from "node:test";
import assert from "node:assert/strict";
import { selectNonOverlappingHours } from "../src/lib/scheduling";
import { computeSlotScore, DEFAULT_SCORE_CONFIG } from "../src/lib/scoring";

type CandSlot = {
  day: number;
  startMin: number;
  endMin: number;
  startHour: number;
  endHour: number;
  weight: number;
  score: number;
  breakdown: { coverage: number; mentorFit: number; capacityFit: number; preference: number; fairness: number; conflict: number };
  covering: { day: number; startMin: number; endMin: number; weight?: number; userId?: string; mentor?: boolean }[];
  mentorCovered: boolean;
};

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

// Score total d'un ensemble de créneaux (somme des scores, sans chevauchement inter-jours)
function totalScore(solution: CandSlot[]): number {
  return solution.reduce((s, c) => s + c.score, 0);
}

// Vérifie qu'aucun créneau ne chevauche dans la solution (par jour)
function isValid(solution: CandSlot[]): boolean {
  const byDay = new Map<number, CandSlot[]>();
  for (const s of solution) {
    const arr = byDay.get(s.day) ?? [];
    arr.push(s);
    byDay.set(s.day, arr);
  }
  for (const [, daySlots] of byDay) {
    for (let i = 0; i < daySlots.length; i++) {
      for (let j = i + 1; j < daySlots.length; j++) {
        if (daySlots[i].startMin < daySlots[j].endMin && daySlots[j].startMin < daySlots[i].endMin) {
          return false;
        }
      }
    }
  }
  return true;
}

// Local Search 1-exchange : pour chaque créneau sélectionné, tente de le remplacer
// par un créneau candidat non sélectionné de même jour qui améliore le score total.
// Retourne la meilleure solution trouvée (ou l'originale si aucun improve).
function localSearch1Exchange(
  selected: CandSlot[],
  candidates: CandSlot[],
  maxIterations: number = 100
): CandSlot[] {
  let best = [...selected];
  let bestScore = totalScore(best);
  const selectedSet = new Set(selected.map((s) => `${s.day}-${s.startMin}-${s.endMin}`));

  for (let iter = 0; iter < maxIterations; iter++) {
    let improved = false;
    for (let i = 0; i < best.length; i++) {
      const removed = best[i];
      // Tous les candidats du même jour, pas dans la solution actuelle
      const candidatesForSwap = candidates.filter(
        (c) =>
          c.day === removed.day &&
          !selectedSet.has(`${c.day}-${c.startMin}-${c.endMin}`) &&
          c.startMin !== removed.startMin
      );

      for (const candidate of candidatesForSwap) {
        // Tenter l'échange
        const trial = [...best];
        trial[i] = candidate;

        // Vérifier validité (pas de chevauchement dans le jour)
        const daySlots = trial.filter((s) => s.day === removed.day);
        const valid = daySlots.every((s, idx) =>
          daySlots.every((t, jdx) =>
            idx === jdx || s.startMin >= t.endMin || t.startMin >= s.endMin
          )
        );

        if (valid) {
          const trialScore = totalScore(trial);
          if (trialScore > bestScore) {
            best = trial;
            bestScore = trialScore;
            selectedSet.delete(`${removed.day}-${removed.startMin}-${removed.endMin}`);
            selectedSet.add(`${candidate.day}-${candidate.startMin}-${candidate.endMin}`);
            improved = true;
            break;
          }
        }
      }
      if (improved) break;
    }
    if (!improved) break;
  }
  return best;
}

// Génère des candidats aléatoires pour N membres sur 7 jours
function generateScenario(rand: () => number, nMembers: number, nCandidates: number): CandSlot[] {
  const candidates: CandSlot[] = [];
  for (let i = 0; i < nCandidates; i++) {
    const day = Math.floor(rand() * 7);
    const startHour = 8 + Math.floor(rand() * 10); // 8h-17h
    const durationH = 1 + Math.floor(rand() * 3); // 1-3h
    const startMin = startHour * 60;
    const endMin = startMin + durationH * 60;
    const weight = Math.round((0.3 + rand() * 0.6) * 100) / 100;
    const score = weight * (1 + rand() * 0.2);
    candidates.push({
      day,
      startMin,
      endMin,
      startHour,
      endHour: endMin / 60,
      weight,
      score,
      breakdown: { coverage: weight, mentorFit: 0, capacityFit: 0, preference: 0, fairness: 0, conflict: 0 },
      covering: [{ day, startMin, endMin, weight, userId: `m${i % nMembers}` }],
      mentorCovered: false,
    });
  }
  return candidates;
}

// Benchmark : WIS seul vs WIS + Local Search sur 3 scénarios
const scenarios = [
  { name: "Petite cohorte (5 membres, 20 candidats)", nMembers: 5, nCandidates: 20 },
  { name: "Cohorte moyenne (15 membres, 50 candidats)", nMembers: 15, nCandidates: 50 },
  { name: "Grande cohorte (30 membres, 80 candidats)", nMembers: 30, nCandidates: 80 },
];

for (const scenario of scenarios) {
  test(`Local Search benchmark: ${scenario.name}`, () => {
    const rand = mulberry32(42);
    const candidates = generateScenario(rand, scenario.nMembers, scenario.nCandidates);

    // WIS seul (par jour, puis top-6)
    const wisSelected: CandSlot[] = [];
    for (let day = 0; day < 7; day++) {
      const daySlots = candidates.filter((s) => s.day === day);
      if (daySlots.length) wisSelected.push(...selectNonOverlappingHours(daySlots));
    }
    wisSelected.sort((a, b) => b.score - a.score);
    const wisTop6 = wisSelected.slice(0, 6);
    const wisScore = totalScore(wisTop6);

    // WIS + Local Search
    const lsSolution = localSearch1Exchange(wisTop6, candidates);
    const lsScore = totalScore(lsSolution);

    // Vérifications
    assert.ok(isValid(wisTop6), "Solution WIS doit être valide");
    assert.ok(isValid(lsSolution), "Solution LS doit être valide");

    const gain = wisScore > 0 ? ((lsScore - wisScore) / wisScore) * 100 : 0;

    console.log(`  ${scenario.name}:`);
    console.log(`    WIS score:      ${wisScore.toFixed(4)}`);
    console.log(`    WIS+LS score:   ${lsScore.toFixed(4)}`);
    console.log(`    Gain:           ${gain >= 0 ? "+" : ""}${gain.toFixed(2)}%`);
    console.log(`    Verdict:        ${gain >= 5 ? "IMPLÉMENTER (gain ≥ 5%)" : "REJETER (gain < 5%)"}`);

    // Le gain ne doit jamais être négatif (LS ne dégrade jamais)
    assert.ok(lsScore >= wisScore - 0.001, "LS ne doit pas dégrader la solution");
  });
}

test("Local Search: arbitrage final — verdict documenté", () => {
  // Scénario réaliste : 20 membres, 40 candidats, WIS + LS
  const rand = mulberry32(2026);
  const candidates = generateScenario(rand, 20, 40);

  const wisSelected: CandSlot[] = [];
  for (let day = 0; day < 7; day++) {
    const daySlots = candidates.filter((s) => s.day === day);
    if (daySlots.length) wisSelected.push(...selectNonOverlappingHours(daySlots));
  }
  wisSelected.sort((a, b) => b.score - a.score);
  const wisTop6 = wisSelected.slice(0, 6);
  const wisScore = totalScore(wisTop6);

  const lsSolution = localSearch1Exchange(wisTop6, candidates);
  const lsScore = totalScore(lsSolution);

  const gain = wisScore > 0 ? ((lsScore - wisScore) / wisScore) * 100 : 0;

  console.log(`\n=== VERDICT LOCAL SEARCH (issue #60) ===`);
  console.log(`Domaine : ≤ ~84 fenêtres/semaine (7 jours × 12 créneaux/h × 2h)`);
  console.log(`WIS: score=${wisScore.toFixed(4)}, WIS+LS: score=${lsScore.toFixed(4)}`);
  console.log(`Gain relatif: ${gain >= 0 ? "+" : ""}${gain.toFixed(2)}%`);
  if (gain < 5) {
    console.log(`DÉCISION: REJETÉ — Le gain (${gain.toFixed(2)}%) est inférieur au seuil de 5%.`);
    console.log(`JUSTIFICATION: Le domaine est trop petit pour qu'un Local Search apporte`);
    console.log(`une amélioration significative. Le WIS est déjà optimal pour son objectif.`);
    console.log(`La complexité ajoutée du LS n'est pas justifiée.`);
  } else {
    console.log(`DÉCISION: À IMPLÉMENTER — Le gain (${gain.toFixed(2)}%) justifie l'intégration.`);
  }

  // Le test valide que l'arbitrage est documenté (pas de gain négatif)
  assert.ok(lsScore >= wisScore - 0.001, "LS ne dégrade jamais");
});
