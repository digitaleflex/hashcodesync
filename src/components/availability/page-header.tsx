"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarRangeIcon } from "lucide-react";
import { WeekSelector } from "@/components/availability/week-selector";

export const PageHeader = memo(function PageHeader({
  weekStart,
  locked,
  onValidate,
  onUnvalidate,
  validating,
  canValidate,
  onPrevWeek,
  onNextWeek,
}: {
  weekStart: string | null;
  locked: boolean;
  onValidate: () => void;
  onUnvalidate: () => void;
  validating: boolean;
  canValidate: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold">Disponibilités</h1>
            <Badge variant={locked ? "secondary" : "outline"}>
              {locked ? "Semaine validée" : "Brouillon"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Configurez vos créneaux disponibles pour permettre une planification optimale de vos ateliers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <WeekSelector
            weekStart={weekStart}
            onPrev={onPrevWeek}
            onNext={onNextWeek}
            locked={locked}
          />
        </div>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        {locked ? (
          <Button variant="outline" size="sm" onClick={onUnvalidate} disabled={validating} className="border-warning/50 text-warning hover:text-warning">
            Dévalider la semaine
          </Button>
        ) : (
          <Button size="sm" onClick={onValidate} disabled={validating || !canValidate}>
            Valider la semaine
          </Button>
        )}
      </div>
    </div>
  );
});
