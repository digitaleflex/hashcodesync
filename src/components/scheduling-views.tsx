"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FlameIcon, SparklesIcon, CalendarPlusIcon } from "lucide-react";

export const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const DAY_NAMES_FULL = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

export type HeatCell = { day: number; hour: number; count: number };
export type Rec = {
  day: number;
  startTime: string;
  endTime: string;
  available: number;
  percent: number;
};

// Code couleur : une teinte par jour (Lundi → Dimanche).
export const DAY_HUES = [345, 285, 220, 175, 130, 50, 25];

// Couleur d'un jour pour la légende.
const dayColor = (day: number) => `hsl(${DAY_HUES[day] ?? 0}, 65%, 50%)`;

// Couleur d'une cellule selon jour + intensité (ratio de membres disponibles).
const cellStyle = (day: number, ratio: number) => {
  const hue = DAY_HUES[day] ?? 0;
  if (ratio <= 0) {
    return { backgroundColor: `hsl(${hue}, 30%, 97%)`, color: "var(--muted-foreground)" };
  }
  const saturation = 55 + ratio * 25;
  const lightness = 96 - ratio * 52; // 96 (vide) → 44 (plein)
  const dark = lightness <= 52;
  return {
    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    color: dark ? "#fff" : `hsl(${hue}, 40%, 30%)`,
  };
};

export function HeatmapCard({
  heatmap,
  minHour,
  maxHour,
  totalMembers,
  refLabel,
  highlightCell,
  title,
  description,
}: {
  heatmap: HeatCell[];
  minHour: number;
  maxHour: number;
  totalMembers: number;
  refLabel?: string;
  highlightCell?: { day: number; hour: number } | null;
  title?: string;
  description?: string;
}) {
  const index = new Map<string, HeatCell>();
  for (const c of heatmap) index.set(`${c.day}:${c.hour}`, c);
  const hours = Array.from(
    { length: maxHour - minHour },
    (_, i) => minHour + i
  );
  const isHighlight = (day: number, hour: number) =>
    !!highlightCell && highlightCell.day === day && highlightCell.hour === hour;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FlameIcon className="size-5 text-accent" />
          {title ?? "Heatmap des disponibilités"}
        </CardTitle>
        <CardDescription>
          {description ??
            "Une couleur par jour, l'intensité = part de la cohorte disponible à cette heure. "}
          {refLabel ? `Fuseau de référence : ${refLabel}.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-1">
            <caption className="sr-only">
              Disponibilités hebdomadaires de la cohorte par jour et par heure.
            </caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 bg-card text-xs font-medium text-muted-foreground" />
                {hours.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="text-center text-[11px] font-medium text-muted-foreground"
                  >
                    {h}:00
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAY_NAMES.map((name, day) => (
                <tr key={day}>
                  <th scope="row" className="sticky left-0 bg-card pr-2 text-xs font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: dayColor(day) }}
                      />
                      {name}
                    </span>
                  </th>
                  {hours.map((hour) => {
                    const cell = index.get(`${day}:${hour}`);
                    const ratio = cell ? cell.count / totalMembers : 0;
                    const style = cellStyle(day, ratio);
                    const hl = isHighlight(day, hour);
                    return (
                      <td
                        key={hour}
                        title={
                          cell
                            ? `${DAY_NAMES_FULL[day]} ${hour}:00 → ${hour + 1}:00 · ${cell.count} membre${cell.count > 1 ? "s" : ""} · ${Math.round(ratio * 100)}%`
                            : `${DAY_NAMES_FULL[day]} ${hour}:00 → ${hour + 1}:00`
                        }
                        className={`h-8 min-w-8 rounded-md text-center text-[11px] font-semibold ${
                          hl ? "shadow-[inset_0_0_0_2px_#e94560]" : ""
                        }`}
                        style={style}
                      >
                        <span className="hidden md:inline">
                          {ratio > 0 ? Math.round(ratio * 100) : ""}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="font-medium">Jours :</span>
          {DAY_NAMES.map((n, day) => (
            <span key={day} className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: dayColor(day) }}
              />
              {n}
            </span>
          ))}
          <span className="ml-2 inline-flex items-center gap-1.5">
            <span className="font-medium">Intensité :</span>
            <span className="inline-flex items-center gap-2">
              <span
                className="h-2.5 w-28 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(0, 0%, 97%), hsl(0, 0%, 44%))",
                }}
              />
              0 → {totalMembers} dispo
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecommendationCard({
  recommendation,
  totalMembers,
  title,
  description,
  actions,
  onPlan,
}: {
  recommendation: Rec[];
  totalMembers: number;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  onPlan?: (time: string, day: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <SparklesIcon className="size-5 text-accent" />
              {title ?? "Créneaux recommandés"}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent>
        {recommendation.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Pas assez de données pour recommander un créneau.
          </p>
        ) : (
          <ul className="space-y-3">
            {recommendation.map((r, i) => (
              <li
                key={`${r.day}-${r.startTime}`}
                className={`space-y-1.5 rounded-lg p-2 ${
                  i === 0 ? "bg-accent/10 ring-1 ring-accent/30" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    <Badge variant={i === 0 ? "default" : "secondary"} className="mr-2">
                      {i + 1}
                    </Badge>
                    {DAY_NAMES_FULL[r.day]} · {r.startTime}–{r.endTime}
                  </span>
                  <span className="text-muted-foreground">
                    ≈ {r.available} présent·es attendus · {r.percent} %
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${r.percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  {i === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Meilleur compromis entre disponibilité et assiduité de la
                      cohorte.
                    </p>
                  ) : (
                    <span />
                  )}
                  {onPlan && (
                    <Button
                      size="sm"
                      onClick={() => onPlan(r.startTime, r.day)}
                      className="shrink-0"
                    >
                      <CalendarPlusIcon className="size-3.5" />
                      Planifier
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}