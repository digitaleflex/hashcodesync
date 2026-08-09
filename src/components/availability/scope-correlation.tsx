"use client";

import { memo } from "react";
import type { ScopeCorrelation as ScopeCorrelationData } from "@/components/availability/shared";
import { cn } from "@/lib/utils";
import { LayersIcon, ArrowRightIcon } from "lucide-react";

export const ScopeCorrelation = memo(function ScopeCorrelation({
  correlation,
}: {
  correlation: ScopeCorrelationData;
}) {
  const { totalHours, activityHours, marginHours, activityPercent } = correlation;
  const fmt = (h: number) => (h ? h.toFixed(1).replace(".0", "") : "0");
  const engaged = totalHours > 0 && activityHours >= totalHours;
  const empty = totalHours === 0;
  const noActivity = totalHours > 0 && activityHours === 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <LayersIcon className="size-4 text-accent" />
        <h3 className="text-sm font-semibold">Corrélation des portées</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Votre temps déclaré vs. le temps affecté à vos groupes et activités.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Masse totale
          </p>
          <p className="text-2xl font-semibold tabular-nums">{fmt(totalHours)} h</p>
        </div>
        <ArrowRightIcon className="mb-1 size-4 shrink-0 text-muted-foreground/50" />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Affectée aux activités
          </p>
          <p className="text-2xl font-semibold tabular-nums">{fmt(activityHours)} h</p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Marge libre
          </p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums",
              engaged ? "text-warning" : "text-foreground"
            )}
          >
            {fmt(marginHours)} h
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Affectation</span>
          <span className="tabular-nums">{activityPercent} %</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              engaged ? "bg-warning" : "bg-accent"
            )}
            style={{ width: `${activityPercent}%` }}
          />
        </div>
      </div>

      <p
        className={cn(
          "mt-2 text-xs",
          engaged ? "text-warning" : "text-muted-foreground"
        )}
      >
        {empty
          ? "Aucune disponibilité déclarée cette semaine."
          : noActivity
            ? "Aucune heure affectée à une activité : tout votre temps reste libre."
            : engaged
              ? "Toute votre disponibilité est affectée à des activités : aucune marge libre."
              : `${fmt(activityHours)} h sur ${fmt(totalHours)} h sont affectées à des activités — il reste ${fmt(marginHours)} h de marge.`}
      </p>
    </div>
  );
});
