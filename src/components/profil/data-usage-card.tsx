import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LightbulbIcon } from "lucide-react";

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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LightbulbIcon className="size-4 text-accent" />
          Comment Sync utilise mes données
        </CardTitle>
        <CardDescription>
          Une transparence complète sur l'usage de vos informations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {USE_CASES.map((item) => (
            <li key={item.title} className="space-y-0.5">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Vous pouvez exporter ou supprimer vos données à tout moment dans la
          section « Mes données » ci-dessous.
        </p>
      </CardContent>
    </Card>
  );
}