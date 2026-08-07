"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarRangeIcon } from "lucide-react";
import { formatWeekRange } from "@/components/availability/date";

export function PageHeader({
  weekStart,
  locked,
  onValidate,
  onUnvalidate,
  validating,
  canValidate,
}: {
  weekStart: string | null;
  locked: boolean;
  onValidate: () => void;
  onUnvalidate: () => void;
  validating: boolean;
  canValidate: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold">Disponibilités</h1>
          <Badge variant={locked ? "secondary" : "outline"}>
            {locked ? "Semaine validée" : "Brouillon"}
          </Badge>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarRangeIcon className="size-4 text-accent" />
          {weekStart
            ? `Semaine ${formatWeekRange(weekStart)}`
            : "Vos créneaux hebdomadaires"}
        </p>
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
}