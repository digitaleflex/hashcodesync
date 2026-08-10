"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
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

export const DAY_HUES = [345, 285, 220, 175, 130, 50, 25];

const dayColor = (day: number) => `hsl(${DAY_HUES[day] ?? 0}, 65%, 50%)`;

const cellStyle = (day: number, ratio: number, isGap = false) => {
  const hue = DAY_HUES[day] ?? 0;
  if (isGap) {
    return { backgroundColor: `hsl(0, 0%, 92%)`, color: "var(--muted-foreground)" };
  }
  if (ratio <= 0) {
    return { backgroundColor: `hsl(${hue}, 30%, 97%)`, color: "var(--muted-foreground)" };
  }
  const saturation = 55 + ratio * 25;
  const lightness = 96 - ratio * 52;
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
  heatmapSmoothed,
  showSmoothed,
  gaps,
  showGaps,
}: {
  heatmap: HeatCell[];
  minHour: number;
  maxHour: number;
  totalMembers: number;
  refLabel?: string;
  highlightCell?: { day: number; hour: number } | null;
  title?: React.ReactNode;
  description?: string;
  onCellSelect?: (day: number, hour: number) => void;
  heatmapSmoothed?: HeatCell[];
  showSmoothed?: boolean;
  gaps?: { day: number; gaps: { startHour: number; endHour: number }[] }[];
  showGaps?: boolean;
}) {
  const index = useMemo(() => {
    const map = new Map<string, HeatCell>();
    for (const c of heatmap) map.set(`${c.day}:${c.hour}`, c);
    return map;
  }, [heatmap]);

  const smoothedIndex = useMemo(() => {
    if (!heatmapSmoothed) return null;
    const map = new Map<string, HeatCell>();
    for (const c of heatmapSmoothed) map.set(`${c.day}:${c.hour}`, c);
    return map;
  }, [heatmapSmoothed]);

  const gapSet = useMemo(() => {
    if (!showGaps || !gaps) return null;
    const set = new Set<string>();
    for (const g of gaps) {
      for (const gap of g.gaps) {
        for (let h = gap.startHour; h < gap.endHour; h++) {
          set.add(`${g.day}:${h}`);
        }
      }
    }
    return set;
  }, [gaps, showGaps]);

  const hours = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i);
  const isHighlight = (day: number, hour: number) =>
    !!highlightCell && highlightCell.day === day && highlightCell.hour === hour;

  const getRatio = (day: number, hour: number) => {
    const cell = showSmoothed && smoothedIndex ? smoothedIndex.get(`${day}:${hour}`) : index.get(`${day}:${hour}`);
    return cell ? cell.count / totalMembers : 0;
  };

  const [mobileDay, setMobileDay] = useState<number>(highlightCell?.day ?? 0);
  useEffect(() => {
    if (highlightCell) setMobileDay(highlightCell.day);
  }, [highlightCell]);

  const dayLabel = (day: number, hour: number) => {
    const ratio = getRatio(day, hour);
    const cell = index.get(`${day}:${hour}`);
    const isGap = gapSet?.has(`${day}:${hour}`);
    return cell
      ? `${DAY_NAMES_FULL[day]} ${hour}:00 → ${hour + 1}:00 · ${cell.count} membre${cell.count > 1 ? "s" : ""} · ${Math.round(ratio * 100)}% de la cohorte${isGap ? " · zone creuse" : ""}`
      : `${DAY_NAMES_FULL[day]} ${hour}:00 → ${hour + 1}:00`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FlameIcon className="size-5 text-accent" />
              {title ?? "Heatmap des disponibilités"}
            </CardTitle>
            <CardDescription>
              {description ??
                "Une couleur par jour, l'intensité = part de la cohorte disponible à cette heure. "}
              {refLabel ? `Fuseau de référence : ${refLabel}.` : ""}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {heatmapSmoothed && (
              <Button
                variant={showSmoothed ? "default" : "outline"}
                size="sm"
                onClick={() => {/* toggle handled by parent */}}
              >
                Lissage
              </Button>
            )}
            {gaps && gaps.length > 0 && (
              <Button
                variant={showGaps ? "default" : "outline"}
                size="sm"
                onClick={() => {/* toggle handled by parent */}}
              >
                Zones creuses
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="sm:hidden">
          <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Jour sélectionné">
            {DAY_NAMES.map((name, day) => {
              const active = mobileDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMobileDay(day)}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
                    active
                      ? "border-transparent text-white"
                      : "border-border bg-background text-muted-foreground"
                  )}
                  style={active ? { backgroundColor: dayColor(day) } : undefined}
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: active ? "currentColor" : dayColor(day) }} />
                  {name}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-1.5" role="list" aria-label={`Disponibilités du ${DAY_NAMES_FULL[mobileDay]}`}>
            {hours.map((hour) => {
              const ratio = getRatio(mobileDay, hour);
              const isGap = gapSet?.has(`${mobileDay}:${hour}`);
              const hl = isHighlight(mobileDay, hour);
              const cell = index.get(`${mobileDay}:${hour}`);
              const label = dayLabel(mobileDay, hour);
              const row = (
                <>
                  <span className="w-12 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {hour}:00
                  </span>
                  <span className="relative h-3.5 flex-1 overflow-hidden rounded-full bg-muted/70" aria-hidden="true">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.max(ratio * 100, ratio > 0 ? 6 : 0)}%`,
                        backgroundColor: isGap ? "hsl(0, 0%, 72%)" : dayColor(mobileDay),
                      }}
                    />
                  </span>
                  <span className="w-16 shrink-0 text-right leading-tight">
                    <span className="block text-xs font-semibold tabular-nums">
                      {Math.round(ratio * 100)}%
                    </span>
                    {cell && (
                      <span className="block text-[10px] text-muted-foreground">
                        {cell.count} membre{cell.count > 1 ? "s" : ""}
                      </span>
                    )}
                  </span>
                </>
              );
              const rowClass = cn(
                "relative flex h-11 items-center gap-3 rounded-lg border px-3",
                isGap ? "border-dashed border-error/40" : "border-border/60",
                hl && "ring-2 ring-[#e94560]"
              );
              return onCellSelect ? (
                <button
                  key={hour}
                  type="button"
                  role="listitem"
                  aria-label={label}
                  title={label}
                  onClick={() => onCellSelect(mobileDay, hour)}
                  className={cn(rowClass, "cursor-pointer transition-transform hover:scale-[1.01]")}
                >
                  {row}
                </button>
              ) : (
                <div key={hour} role="listitem" title={label} aria-label={label} className={rowClass}>
                  {row}
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden sm:block overflow-x-auto">
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
                    const ratio = getRatio(day, hour);
                    const isGap = gapSet?.has(`${day}:${hour}`);
                    const style = cellStyle(day, ratio, !!isGap);
                    const hl = isHighlight(day, hour);
                    const cell = index.get(`${day}:${hour}`);
                    const label = cell
                      ? `${DAY_NAMES_FULL[day]} ${hour}:00 → ${hour + 1}:00 · ${cell.count} membre${cell.count > 1 ? "s" : ""} · ${Math.round(ratio * 100)}% de la cohorte${isGap ? " · zone creuse" : ""}`
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
                        } ${isGap ? "relative after:absolute after:inset-0 after:rounded-md after:border after:border-dashed after:border-error/40" : ""}`}
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
  maxItems = 5,
}: {
  recommendation: Rec[];
  totalMembers: number;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  onPlan?: (time: string, day: number) => void;
  maxItems?: number;
}) {
  const scoreOf = (r: Rec): number =>
    Math.max(0, Math.min(100, Math.round(r.percent)));
  const durationOf = (r: Rec): number => {
    const [sh, sm] = r.startTime.split(":").map(Number);
    const [eh, em] = r.endTime.split(":").map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  };
  const items = recommendation.slice(0, maxItems);
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
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Pas assez de données pour recommander un créneau.
          </p>
        ) : (
          <ol className="space-y-2.5">
            {items.map((r, i) => (
              <li
                key={`${r.day}-${r.startTime}`}
                className={`rounded-lg p-3 ${
                  i === 0 ? "bg-accent/10 ring-1 ring-accent/30" : "bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-accent">#{i + 1}</span>
                    <span className="font-medium">
                      {DAY_NAMES_FULL[r.day]} · {r.startTime}–{r.endTime}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {durationOf(r)} h
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {Math.round(r.percent)}%
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        · ≈ {Math.round(r.available)} dispo
                      </span>
                    </span>
                    {onPlan && (
                      <Button
                        size="sm"
                        variant={i === 0 ? "default" : "outline"}
                        onClick={() => onPlan(r.startTime, r.day)}
                        className="shrink-0"
                      >
                        <CalendarPlusIcon className="size-3.5" />
                        Planifier
                      </Button>
                    )}
                  </div>
                </div>
                {i === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Meilleur compromis disponibilité / assiduité.
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
