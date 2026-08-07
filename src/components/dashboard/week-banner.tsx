"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LockIcon, CheckCircle2Icon } from "lucide-react";
import Link from "next/link";

export function WeekValidationBanner({
  weekValidated,
  availCount,
}: {
  weekValidated: boolean;
  availCount: number;
}) {
  return (
    <Card
      className={`border ${
        weekValidated
          ? "border-success/40 bg-success/5"
          : "border-warning/40 bg-warning/5"
      }`}
    >
      <div className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          {weekValidated ? (
            <CheckCircle2Icon className="size-5 shrink-0 text-success" />
          ) : (
            <LockIcon className="size-5 shrink-0 text-warning" />
          )}
          <div>
            <p className="text-sm font-medium">
              {weekValidated
                ? "Semaine validée"
                : "Semaine non validée"}
            </p>
            <p className="text-xs text-muted-foreground">
              {weekValidated
                ? `Vos ${availCount} disponibilité·s sont figées.`
                : "Validez votre semaine pour figer vos disponibilités et ouvrir la planification."}
            </p>
          </div>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/disponibilites" />}
          variant={weekValidated ? "outline" : "default"}
        >
          {weekValidated ? "Gérer" : "Valider ma semaine"}
        </Button>
      </div>
    </Card>
  );
}