"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheckIcon } from "lucide-react";
import type { ReliabilityData } from "@/components/profil/types";

export function ReliabilityCard({
  reliability,
}: {
  reliability: ReliabilityData;
}) {
  const { probability, observations } = reliability;

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
          <p className="text-sm text-muted-foreground">
            Pas encore suffisamment de données : nous avons besoin de plus
            d'ateliers suivis pour estimer la fiabilité de vos disponibilités.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <p className="font-heading text-4xl font-semibold">
                {Math.round(probability * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">
                sur {observations} atelier{observations > 1 ? "s" : ""} suivi
                {observations > 1 ? "s" : ""}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.round(probability * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Ce score aide le moteur de planification à pondérer vos créneaux.
              Il n'est jamais affiché publiquement.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}