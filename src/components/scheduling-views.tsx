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

export type HeatCell = { day: number; hour: number; count: number; memberCount?: number };
export type RecFactor = { kind: string; label: string; detail: string };
export type RecBreakdown = {
  coverage: number;
  mentorFit: number;
  capacityFit: number;
  preference: number;
  fairness: number;
  conflict: number;
};
export type Rec = {
  day: number;
  startTime: string;
  endTime: string;
  available: number;
  percent: number;
  expectedAttendance?: number;
  coveragePercent?: number;
  memberCount?: number;
  capacityInsufficient?: boolean;
  score?: number;
  scoreBreakdown?: RecBreakdown;
  factors?: RecFactor[];
};

export const DAY_HUES = [345, 285, 220, 175, 130, 50, 25];

const dayColor = (day: number) => `hsl(${DAY_HUES[day] ?? 0}, 65%, 50%)`;

// --- Dates réelles de la semaine affichée -----------------------------------
// La heatmap est ancrée sur une semaine précise (lundi → dimanche, fuseau de
// référence) : sans dates affichées, impossible de savoir si les données
// concernent la semaine courante ou une autre. Sans `weekStart`, on retombe
// sur des jours génériques (comportement antérieur).
type DayDate = { key: string; short: string; num: string; long: string };

const SHORT_DATE_FMT = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
const DAY_NUM_FMT = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "numeric" });
const LONG_DATE_FMT = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

function ymdInTz(ms: number, tz?: string): { y: number; m: number; d: number } | null {
  try {
    const fmt = new Intl.DateTimeFormat(
      "en-CA",
      tz
        ? { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }
        : { year: "numeric", month: "2-digit", day: "2-digit" }
    );
    const [y, m, d] = fmt.format(new Date(ms)).split("-").map(Number);
    return { y, m, d };
  } catch {
    return null;
  }
}

// 7 dates (clé ISO, « 18/08 », « 18 », « lundi 18 août ») à partir du lundi.
export function buildDayDates(weekStart?: string | null, refTz?: string): DayDate[] | null {
  if (!weekStart) return null;
  const ms = new Date(weekStart).getTime();
  if (!Number.isFinite(ms)) return null;
  const base = ymdInTz(ms, refTz);
  if (!base) return null;
  return Array.from({ length: 7 }, (_, i) => {
    const utc = new Date(Date.UTC(base.y, base.m - 1, base.d + i));
    return {
      key: utc.toISOString().slice(0, 10),
      short: SHORT_DATE_FMT.format(utc),
      num: DAY_NUM_FMT.format(utc),
      long: LONG_DATE_FMT.format(utc),
    };
  });
}

const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
  weekStart,
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
  // Lundi 00:00 (ISO, fuseau de référence) de la semaine affichée.
  weekStart?: string | null;
  highlightCell?: { day: number; hour: number } | null;
  title?: React.ReactNode;
  description?: string;
  onCellSelect?: (day: number, hour: number) => void;
  heatmapSmoothed?: HeatCell[];
  showSmoothed?: boolean;
  gaps?: { day: number; gaps: { startHour: number; endHour: number }[] }[];
  showGaps?: boolean;
}) {
  const dayDates = useMemo(() => buildDayDates(weekStart, refLabel), [weekStart, refLabel]);

  const todayKey = useMemo(() => {
    const base = ymdInTz(Date.now(), refLabel);
    return base ? new Date(Date.UTC(base.y, base.m - 1, base.d)).toISOString().slice(0, 10) : null;
  }, [refLabel]);

  const isToday = (day: number) => dayDates?.[day].key === todayKey;

  const weekRange = useMemo(() => {
    if (!dayDates) return null;
    const year = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", year: "numeric" }).format(
      new Date(`${dayDates[6].key}T00:00:00Z`)
    );
    return `Semaine du ${dayDates[0].long} au ${dayDates[6].long} ${year}`;
  }, [dayDates]);

  // Nom du jour avec date réelle (« Lundi 18 août ») pour les libellés riches.
  const dayTitleName = (day: number) =>
    dayDates ? capFirst(dayDates[day].long) : DAY_NAMES_FULL[day];
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

  const cellLabel = (day: number, hour: number) => {
    const ratio = getRatio(day, hour);
    const cell = index.get(`${day}:${hour}`);
    const isGap = gapSet?.has(`${day}:${hour}`);
    const when = `${dayTitleName(day)}${isToday(day) ? " (aujourd'hui)" : ""} ${hour}:00 → ${hour + 1}:00`;
    if (!cell) return when;
    const members = cell.memberCount ?? cell.count;
    return `${when} · ${members} membre${members > 1 ? "s" : ""} · ${Math.round(cell.count * 10) / 10} présence(s) attendue(s) · ${Math.round(ratio * 100)}% de la cohorte${isGap ? " · zone creuse" : ""}`;
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
              {weekRange ? `${weekRange} · ` : ""}
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
                  {dayDates && <span className="text-[11px] font-normal opacity-80">{dayDates[day].num}</span>}
                  {isToday(day) && (
                    <span className="sr-only"> (aujourd&apos;hui)</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-1.5" role="list" aria-label={`Disponibilités du ${dayTitleName(mobileDay)}`}>
            {hours.map((hour) => {
              const ratio = getRatio(mobileDay, hour);
              const isGap = gapSet?.has(`${mobileDay}:${hour}`);
              const hl = isHighlight(mobileDay, hour);
              const cell = index.get(`${mobileDay}:${hour}`);
              const label = cellLabel(mobileDay, hour);
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
                        {cell.memberCount ?? cell.count} membre{cell.memberCount ?? cell.count > 1 ? "s" : ""}
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
              Disponibilités hebdomadaires de la cohorte par jour et par heure
              {weekRange ? ` — ${weekRange}` : ""}.
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
                  <th
                    scope="row"
                    className={cn(
                      "sticky left-0 bg-card pr-2 text-xs font-medium",
                      isToday(day) ? "text-foreground" : "text-muted-foreground"
                    )}
                    title={isToday(day) ? "Aujourd'hui" : undefined}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: dayColor(day) }}
                      />
                      <span className="flex flex-col leading-tight">
                        <span>
                          {name}
                          {isToday(day) && <span className="sr-only"> (aujourd&apos;hui)</span>}
                        </span>
                        {dayDates && (
                          <span className="text-[10px] font-normal tabular-nums opacity-80">
                            {dayDates[day].short}
                          </span>
                        )}
                      </span>
                    </span>
                  </th>
                  {hours.map((hour) => {
                    const ratio = getRatio(day, hour);
                    const isGap = gapSet?.has(`${day}:${hour}`);
                    const style = cellStyle(day, ratio, !!isGap);
                    const hl = isHighlight(day, hour);
                    const label = cellLabel(day, hour);
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
              {dayDates && (
                <span className="tabular-nums" aria-hidden="true">
                  {dayDates[day].short}
                </span>
              )}
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
  weekStart,
  refTz,
}: {
  recommendation: Rec[];
  totalMembers: number;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  onPlan?: (time: string, day: number) => void;
  maxItems?: number;
  // Lundi 00:00 (ISO, fuseau de référence) : affiche la date réelle de chaque jour.
  weekStart?: string | null;
  refTz?: string;
}) {
  const dayDates = useMemo(() => buildDayDates(weekStart, refTz), [weekStart, refTz]);
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
                      {DAY_NAMES_FULL[r.day]}
                      {dayDates && (
                        <span className="ml-1 tabular-nums text-muted-foreground">
                          {dayDates[r.day].short}
                        </span>
                      )}
                      {" · "}
                      {r.startTime}–{r.endTime}
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
                  <div className="mt-2 space-y-1.5 rounded-md bg-background/60 p-2">
                    <p className="text-xs font-medium text-foreground">
                      Pourquoi ce créneau&nbsp;?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Meilleur compromis disponibilité / assiduité.
                    </p>
                    {r.memberCount !== undefined && r.expectedAttendance !== undefined && r.coveragePercent !== undefined && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">{r.memberCount}</span> membre(s) couvrant
                        </span>
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">≈ {Math.round(r.expectedAttendance * 10) / 10}</span> présence(s) attendue(s)
                        </span>
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">{r.coveragePercent}%</span> de couverture
                        </span>
                      </div>
                    )}
                    {r.capacityInsufficient !== undefined && (
                      <p className="text-xs text-destructive">
                        {r.capacityInsufficient
                          ? "Capacité insuffisante : moins de membres disponibles que la capacité visée."
                          : "Capacité atteignable : la couverture suffit pour la capacité visée."}
                      </p>
                    )}
                    {r.score !== undefined && r.scoreBreakdown && (
                      <BreakdownRows r={r} />
                    )}
                    {r.factors && r.factors.length > 0 && (
                      <ul className="flex flex-wrap gap-1.5">
                        {r.factors.map((f) => (
                          <li
                            key={f.kind}
                            className="rounded-full bg-muted/70 px-2 py-0.5 text-[11px] text-muted-foreground"
                            title={`${f.label} : ${f.detail}`}
                          >
                            {f.detail}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// Décomposition du score composé du meilleur créneau (#62) : chaque terme actif
// est affiché avec une mini-barre relative à la valeur max du créneau.
function BreakdownRows({ r }: { r: Rec }) {
  const b = r.scoreBreakdown!;
  const rows: { key: string; label: string; raw: number; display: string }[] = [
    { key: "coverage", label: "Couverture", raw: b.coverage, display: `${Math.round(b.coverage * 10) / 10} présent(s) attendu(s)` },
    ...(b.mentorFit > 0
      ? [{ key: "mentorFit", label: "Mentor", raw: b.mentorFit, display: b.mentorFit >= 1 ? "Mentor disponible" : "Aucun mentor" }]
      : []),
    ...(b.capacityFit > 0
      ? [{ key: "capacityFit", label: "Capacité", raw: b.capacityFit, display: `${Math.round(b.capacityFit * 100)}% de la capacité visée` }]
      : []),
    ...(b.preference > 0
      ? [{ key: "preference", label: "Préférences", raw: b.preference, display: `${Math.round(b.preference * 100)}% des préférences` }]
      : []),
    ...(b.fairness > 0
      ? [{ key: "fairness", label: "Équité", raw: b.fairness, display: `${Math.round(b.fairness * 100)}%` }]
      : []),
    ...(b.conflict > 0
      ? [{ key: "conflict", label: "Conflit", raw: b.conflict, display: `${Math.round(b.conflict * 100)}%` }]
      : []),
  ];
  const max = Math.max(...rows.map((x) => x.raw), 0.0001);
  return (
    <div className="space-y-1 pt-0.5">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Décomposition du score</span>
        <span className="font-medium text-foreground">Score {Math.round((r.score ?? 0) * 100) / 100}</span>
      </div>
      {rows.map((x) => (
        <div key={x.key} className="flex items-center gap-2 text-[11px]">
          <span className="w-24 shrink-0 text-muted-foreground">{x.label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(4, (x.raw / max) * 100)}%` }}
            />
          </div>
          <span className="w-40 shrink-0 text-right text-foreground">{x.display}</span>
        </div>
      ))}
    </div>
  );
}
