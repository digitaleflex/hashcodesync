"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheckIcon,
  InfoIcon,
  CalendarCheck2Icon,
  CalendarX2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReliabilityData } from "@/components/profil/types";

function reliabilityLabel(probability: number): { label: string; tone: string } {
  if (probability >= 0.85)
    return { label: "Excellente précision", tone: "text-success" };
  if (probability >= 0.7)
    return { label: "Bonne précision", tone: "text-success" };
  if (probability >= 0.5)
    return { label: "Précision moyenne", tone: "text-warning" };
  return { label: "Précision à renforcer", tone: "text-warning" };
}

export function ReliabilityCard({
  reliability,
}: {
  reliability: ReliabilityData;
}) {
  const { probability, observations, present, absent } = reliability;
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheckIcon className="size-4 text-accent" />
          Fiabilité des disponibilités
        </CardTitle>
        <CardDescription>
          Estimation bayésienne à partir de votre historique de présence aux
          ateliers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {probability === null ? (
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-xl font-semibold">
                Données insuffisantes
              </p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Participez à quelques ateliers pour que Sync puisse estimer la
                fiabilité de vos disponibilités.
              </p>
            </div>
            <Button
              nativeButton={false}
              render={<Link href="/ateliers" />}
              variant="outline"
              className="shrink-0"
            >
              Voir les ateliers
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="flex shrink-0 items-end gap-3">
              <p className="font-heading text-5xl font-semibold tracking-tight">
                {Math.round(probability * 100)}%
              </p>
              <span
                className={cn(
                  "pb-1.5 text-sm font-medium",
                  reliabilityLabel(probability).tone
                )}
              >
                {reliabilityLabel(probability).label}
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={Math.round(probability * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Fiabilité : ${Math.round(probability * 100)} %`}
              >
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${Math.round(probability * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Estimé sur {observations} atelier
                {observations > 1 ? "s" : ""} suivi
                {observations > 1 ? "s" : ""}. Ce score aide Sync à pondérer
                vos créneaux et n'est jamais affiché publiquement.
              </p>
            </div>

            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => setOpen(true)}
            >
              <InfoIcon className="size-4" />
              Voir les détails
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fiabilité de vos disponibilités</DialogTitle>
            <DialogDescription>
              Le score reflète la cohérence entre vos disponibilités déclarées
              et votre présence aux ateliers planifiés.
            </DialogDescription>
          </DialogHeader>

          {probability !== null && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 rounded-lg border p-3">
                  <CalendarCheck2Icon className="size-4 shrink-0 text-success" />
                  <div>
                    <p className="font-heading text-xl font-semibold">
                      {present}
                    </p>
                    <p className="text-xs text-muted-foreground">présences</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border p-3">
                  <CalendarX2Icon className="size-4 shrink-0 text-warning" />
                  <div>
                    <p className="font-heading text-xl font-semibold">{absent}</p>
                    <p className="text-xs text-muted-foreground">absences</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Estimation bayésienne : la probabilité de présence est actualisée
                après chaque atelier et pondère la recommandation de vos créneaux.
                Plus votre historique est riche, plus Sync affine ses suggestions.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}