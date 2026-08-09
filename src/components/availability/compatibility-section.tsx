"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SparklesIcon, AlertTriangleIcon, CheckCircle2Icon } from "lucide-react";

type CompatibilityData = {
  compatibleWorkshops: number;
  coveredGroups: number;
  uncoveredWorkshops: number;
  uncoveredNames?: string[];
};

export function CompatibilitySection() {
  const [data, setData] = useState<CompatibilityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pour l'instant, on ne fetch pas de données réelles car l'API de compatibilité
    // n'existe pas encore. On affiche un état neutre.
    // TODO: connecter à l'API de scheduling quand elle exposera ces métriques.
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Calcul de la compatibilité...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SparklesIcon className="size-5 text-accent" />
            Compatibilité de planification
          </CardTitle>
          <CardDescription>
            Cette fonctionnalité sera disponible lorsque le moteur de scheduling exposera
            les métriques de compatibilité.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <SparklesIcon className="size-5 text-accent" />
          Compatibilité de planification
        </CardTitle>
        <CardDescription>
          Comment vos disponibilités couvrent les ateliers planifiés.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Badge variant="secondary" className="gap-1.5">
            <CheckCircle2Icon className="size-3.5 text-success" />
            {data.compatibleWorkshops} atelier{data.compatibleWorkshops > 1 ? "s" : ""} compatible{data.compatibleWorkshops > 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <CheckCircle2Icon className="size-3.5 text-success" />
            {data.coveredGroups} groupe{data.coveredGroups > 1 ? "s" : ""} couvert{data.coveredGroups > 1 ? "s" : ""}
          </Badge>
          {data.uncoveredWorkshops > 0 && (
            <Badge variant="outline" className="gap-1.5 border-warning/40 text-warning">
              <AlertTriangleIcon className="size-3.5" />
              {data.uncoveredWorkshops} atelier{data.uncoveredWorkshops > 1 ? "s" : ""} nécessite{data.uncoveredWorkshops > 1 ? "nt" : ""} un créneau supplémentaire
            </Badge>
          )}
        </div>
        {data.uncoveredNames && data.uncoveredNames.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Ateliers non couverts :</p>
            <ul className="list-inside list-disc text-xs text-muted-foreground">
              {data.uncoveredNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
