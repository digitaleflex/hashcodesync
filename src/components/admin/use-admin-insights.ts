"use client";

import type { Insight } from "@/components/admin/cockpit";

// Données /api/admin/groups (lecture seule).
export type AdminGroupMember = {
  id: string;
  hoursPerWeek: number;
  reliability: number;
  weekValidated: boolean;
  user: { id: string; firstname: string; lastname: string; email: string };
};
export type AdminGroup = {
  id: string;
  name: string;
  totalHours: number;
  members: AdminGroupMember[];
};

const cap = (t: string, n = 22): string =>
  t.length > n ? `${t.slice(0, n)}…` : t;

// Seuil d'affichage de l'insight « couverture » : en dessous, la couverture est
// trop faible pour être présentée comme un succès (seuil de décision, distinct
// du calcul de couverture lui-même).
const COVERAGE_INSIGHT_THRESHOLD = 40;

// Génère les insights décisionnels depuis les données déjà chargées
// (aucune API supplémentaire). Compatible <InsightsList/>.
export function useAdminInsights({
  totalMembers,
  totalAvailabilities,
  coveragePercent,
  groups,
}: {
  totalMembers: number;
  totalAvailabilities: number;
  coveragePercent: number;
  groups: AdminGroup[];
}): Insight[] {
  const insights: Insight[] = [];

  const noSlots = groups
    .flatMap((g) =>
      g.members
        .filter((m) => m.hoursPerWeek === 0)
        .map((m) => ({ ...m, groupName: g.name }))
    )
    .slice(0, 5);
  if (noSlots.length > 0) {
    insights.push({
      id: "no-slots",
      tone: "warning",
      icon: "alert",
      message: `${noSlots.length} membre${noSlots.length > 1 ? "s" : ""} n'ont pas renseigné leurs disponibilités (${noSlots
        .slice(0, 2)
        .map((m) => `${m.user.firstname} · ${cap(m.groupName)}`)
        .join(", ")}${noSlots.length > 2 ? "…" : ""}).`,
      action: { label: "Relancer", href: "/admin/groupes" },
    });
  }

  const lowGroups = groups
    .map((g) => {
      const filled = g.members.filter((m) => m.hoursPerWeek > 0).length;
      const ratio =
        g.members.length > 0 ? (filled / g.members.length) * 100 : 100;
      return { name: g.name, ratio, total: g.members.length };
    })
    .filter((g) => g.total > 0 && g.ratio < 50)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 3);
  if (lowGroups.length > 0) {
    insights.push({
      id: "low-groups",
      tone: "warning",
      icon: "alert",
      message: `Couvrance faible : ${lowGroups
        .map((g) => `${cap(g.name)} (${Math.round(g.ratio)}%)`)
        .join(", ")} renseignées.`,
      action: { label: "Voir les groupes", href: "/admin/groupes" },
    });
  }

  if (totalMembers > 0 && (coveragePercent > COVERAGE_INSIGHT_THRESHOLD || totalAvailabilities > 0)) {
    insights.push({
      id: "coverage",
      tone: "success",
      icon: "trend",
      message: `${Math.round(coveragePercent)}% de la cohorte a renseigné ses disponibilités (${totalAvailabilities} créneaux au total).`,
    });
  }

  return insights;
}