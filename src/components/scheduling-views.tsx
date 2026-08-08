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
import { MiniProgress } from "@/components/admin/cockpit";

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
  onCellSelect,
}: {
  heatmap: HeatCell[];
  minHour: number;
  maxHour: number;
  totalMembers: number;
  refLabel?: string;
  highlightCell?: { day: number; hour: number } | null;
  title?: string;
  description?: string;
  onCellSelect?: (day: number, hour: number) => void;
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
                    const label = cell
                      ? `${DAY_NAMES_FULL[day]} ${hour}:00 → ${hour + 1}:00 · ${cell.count} membre${cell.count > 1 ? "s" : ""} · ${Math.round(ratio * 100)}% de la cohorte`
                      : `${DAY_NAMES_FULL[day]} ${hour}:00 → ${hour + 1}:00`;
                    const interactive = !!onCellSelect;
                    const content = (
                      <span className="hidden md:inline">
                        {ratio > 0 ? Math.round(ratio * 100) : ""}
                      </span>
                    );
                    return (
                      <td
                        key={hour}
                        className={`h-8 min-w-8 rounded-md text-center text-[11px] font-semibold ${
                          hl ? "shadow-[inset_0_0_0_2px_#e94560]" : ""
                        }`}
                        style={style}
                      >
                        {interactive ? (
                          <button
                            type="button"
                            aria-label={label}
                            title={label}
                            onClick={() => onCellSelect(day, hour)}
                            className="flex h-full min-h-8 w-full min-w-8 cursor-pointer items-center justify-center rounded-md text-[11px] font-semibold transition-transform hover:scale-[1.03]"
                          >
                            {content}
                          </button>
                        ) : (
                          <span title={label} aria-label={label}>
                            {content}
                          </span>
                        )}
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
  // Score de confiance déduit côté client (aucune modif API) : la disponibilité
  // pondérée rapportée à la cohorte, bornée 0-100.
  const scoreOf = (r: Rec): number =>
    Math.max(0, Math.min(100, Math.round(r.percent)));
  const durationOf = (r: Rec): number => {
    const [sh, sm] = r.startTime.split(":").map(Number);
    const [eh, em] = r.endTime.split(":").map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  };
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
          <ol className="space-y-3">
            {recommendation.map((r, i) => (
              <li
                key={`${r.day}-${r.startTime}`}
                className={`space-y-2 rounded-lg p-2.5 ${
                  i === 0 ? "bg-accent/10 ring-1 ring-accent/30" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant={i === 0 ? "default" : "secondary"}>
                      #{i + 1}
                    </Badge>
                    <span className="font-medium">
                      {DAY_NAMES_FULL[r.day]} · {r.startTime}–{r.endTime}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {durationOf(r)} h
                    </span>
                  </div>
                  <span className="font-medium">
                    {Math.round(r.percent)}%
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      · ≈ {Math.round(r.available)} dispo
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MiniProgress value={scoreOf(r)} tone="accent" className="h-2" />
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {scoreOf(r)}/100
                  </span>
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
          </ol>
        )}
      </CardContent>
    </Card>
  );
}