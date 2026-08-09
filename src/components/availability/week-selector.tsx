"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { formatWeekRange } from "@/components/availability/date";
import { Badge } from "@/components/ui/badge";

export function WeekSelector({
  weekStart,
  onPrev,
  onNext,
  locked,
}: {
  weekStart: string | null;
  onPrev: () => void;
  onNext: () => void;
  locked: boolean;
}) {
  const handleNav = useCallback(
    (direction: "prev" | "next") => {
      if (direction === "prev") onPrev();
      else onNext();
    },
    [onPrev, onNext]
  );

  const label = weekStart ? formatWeekRange(weekStart) : "Chargement...";

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => handleNav("prev")}
        disabled={locked}
        aria-label="Semaine précédente"
        className="shrink-0"
      >
        <ChevronLeftIcon className="size-4" />
      </Button>
      <div className="min-w-[180px] text-center">
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => handleNav("next")}
        disabled={locked}
        aria-label="Semaine suivante"
        className="shrink-0"
      >
        <ChevronRightIcon className="size-4" />
      </Button>
      {locked && (
        <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">
          Validée
        </Badge>
      )}
    </div>
  );
}
