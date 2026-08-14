"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { LightbulbIcon, ChevronRightIcon } from "lucide-react";

const USE_CASES = [
  {
    title: "Recommandations personnalisées",
    text: "Créneaux, préférences et limites définissent les horaires qui vous sont suggérés.",
  },
  {
    title: "Planification de cohorte",
    text: "Vos disponibilités alimentent la heatmap et le moteur de planification (V2).",
  },
  {
    title: "Fiabilité",
    text: "La probabilité de présence issue de votre historique pondère vos créneaux.",
  },
];

export function DataUsageCard() {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LightbulbIcon className="size-4 text-accent" />
          Comment Sync utilise vos informations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Vos disponibilités, préférences, limites et historique permettent à
          Sync de rechercher des créneaux plus pertinents pour vous et votre
          cohorte.
        </p>
        <Button
          variant="ghost"
          className="mt-3 -ml-2 text-accent hover:text-accent"
          onClick={() => setOpen(true)}
        >
          En savoir plus
          <ChevronRightIcon className="size-4" />
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Comment Sync utilise vos informations</DialogTitle>
            <DialogDescription>
              Une transparence complète sur l'usage de vos informations.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-3">
            {USE_CASES.map((item) => (
              <li key={item.title} className="space-y-0.5">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.text}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Vous pouvez exporter ou supprimer vos données à tout moment dans la
            section « Données &amp; confidentialité » ci-dessous.
          </p>
        </DialogContent>
      </Dialog>
    </Card>
  );
}