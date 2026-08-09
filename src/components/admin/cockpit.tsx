"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarPlusIcon,
  SparklesIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  InfoIcon,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";

// Barre de progression simple (valeurs 0→100).
export function MiniProgress({
  value,
  tone = "accent",
  className,
}: {
  value: number;
  tone?: "accent" | "success" | "warning" | "error";
  className?: string;
}) {
  const tones: Record<string, string> = {
    accent: "bg-accent",
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-error",
  };
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.max(0, Math.min(100, value)))}
    >
      <div
        className={cn("h-full rounded-full transition-all", tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

// Anneau de ratio (ex. % cohorte renseignée). SVG léger, sans dépendance.
export function MetricDonut({
  value,
  label,
  tone = "success",
  size = 72,
}: {
  value: number; // 0-100
  label?: string;
  tone?: "success" | "warning" | "error" | "accent";
  size?: number;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const stroke = (v / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={toneColor[tone]}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${stroke} ${c - stroke}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-heading text-sm font-semibold leading-none">
          {Math.round(v)}%
        </p>
        {label && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
        )}
      </div>
    </div>
  );
}
const toneColor: Record<string, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
  accent: "var(--accent)",
};

// Héro : la recommandation n°1, premier repère du cockpit.
export type BestSlot = {
  day: number;
  startTime: string;
  endTime: string;
  available: number;
  percent: number;
  confidence?: number; // déduite côté client
};

const DAY_NAMES_FULL = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

export function BestRecommendationHero({
  best,
  totalMembers,
  onPlan,
}: {
  best: BestSlot;
  totalMembers: number;
  onPlan: (time: string, day: number) => void;
}) {
  const duration = (() => {
    const [sh, sm] = best.startTime.split(":").map(Number);
    const [eh, em] = best.endTime.split(":").map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  })();
  return (
    <Card className="border-accent/40 bg-accent/5 ring-1 ring-accent/30">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SparklesIcon className="size-5 text-accent" />
            Meilleur créneau
          </CardTitle>
        </div>
        <Badge
          className="bg-primary text-primary-foreground"
          title="Recommandation n°1"
        >
          #1
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-heading text-2xl font-semibold">
              {DAY_NAMES_FULL[best.day]} · {best.startTime}–{best.endTime}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              ≈ {Math.round(best.available)} présent·es attendus sur{" "}
              {totalMembers} membres
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="font-heading text-xl font-semibold">
                {Math.round(best.percent)}%
              </p>
              <p className="text-[11px] text-muted-foreground">
                cohorte dispo
              </p>
            </div>
            <div className="text-center">
              <p className="font-heading text-xl font-semibold">
                {duration} h
              </p>
              <p className="text-[11px] text-muted-foreground">durée</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onPlan(best.startTime, best.day)}>
            <CalendarPlusIcon className="size-4" />
            Planifier
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Insight générique : texte + niveau + action facultative.
export type Insight = {
  id: string;
  tone: "success" | "warning" | "error" | "info" | "accent";
  icon?: "trend" | "alert" | "users" | "sparkle";
  message: string;
  action?: { label: string; href: string };
};

const toneTint: Record<string, string> = {
  success: "border-success/40 bg-success/5",
  warning: "border-warning/40 bg-warning/5",
  error: "border-error/40 bg-error/5",
  accent: "border-accent/40 bg-accent/5",
  info: "border-border bg-muted/40",
};

export function InsightRow({ insight }: { insight: Insight }) {
  const Icon =
    insight.tone === "error"
      ? AlertTriangleIcon
      : insight.tone === "warning"
        ? AlertTriangleIcon
        : insight.tone === "success"
          ? TrendingUpIcon
          : insight.tone === "accent"
            ? SparklesIcon
            : InfoIcon;
  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3",
        toneTint[insight.tone]
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            insight.tone === "warning"
              ? "text-warning"
              : insight.tone === "error"
                ? "text-error"
                : "text-accent"
          )}
        />
        <p className="text-sm">{insight.message}</p>
      </div>
      {insight.action && (
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={insight.action.href as Route} />}
          className="shrink-0"
        >
          {insight.action.label}
        </Button>
      )}
    </li>
  );
}

export function InsightsList({
  insights,
  title = "Insights",
  description,
}: {
  insights: Insight[];
  title?: string;
  description?: string;
}) {
  if (insights.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <SparklesIcon className="size-5 text-accent" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {insights.map((i) => (
            <InsightRow key={i.id} insight={i} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}