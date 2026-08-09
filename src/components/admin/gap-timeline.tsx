"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon } from "lucide-react";
import Link from "next/link";
import { DAY_NAMES_FULL } from "@/components/scheduling-views";

type Gap = {
  day: number;
  dayName: string;
  gaps: { startHour: number; endHour: number; duration: number }[];
};

export function GapTimeline({ gaps, minHour, maxHour }: { gaps: Gap[]; minHour: number; maxHour: number }) {
  const daysWithGaps = useMemo(() => gaps.filter((g) => g.gaps.length > 0), [gaps]);
  const totalGapHours = useMemo(
    () => daysWithGaps.reduce((sum, g) => sum + g.gaps.reduce((s, gap) => s + gap.duration, 0), 0),
    [daysWithGaps]
  );

  if (daysWithGaps.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangleIcon className="size-4 text-success" />
            Zones à éviter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune zone creuse détectée. La cohorte a des disponibilités sur l'ensemble des heures analysées.
          </p>
        </CardContent>
      </Card>
    );
  }

  const mainGaps = daysWithGaps.slice(0, 3).flatMap((g) =>
    g.gaps.map((gap) => ({
      day: DAY_NAMES_FULL[g.day],
      range: `${gap.startHour}:00–${gap.endHour}:00`,
      duration: gap.duration,
    }))
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangleIcon className="size-4 text-warning" />
          Zones à éviter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {mainGaps.map((g, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{g.day}</span>
              <span className="font-medium">{g.range}</span>
              <span className="text-xs text-muted-foreground">{g.duration}h</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            {totalGapHours}h cumulées sur {daysWithGaps.length} jour{daysWithGaps.length > 1 ? "s" : ""}
          </span>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/admin" />}>
            Voir les détails
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
