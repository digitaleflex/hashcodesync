"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  CalendarRangeIcon,
  ClockIcon,
  ShieldCheckIcon,
  LockIcon,
} from "lucide-react";

const DAY_NAMES = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start.getTime() + 6 * 86400000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = (dt: Date) => `${pad(dt.getUTCDate())} ${MONTHS[dt.getUTCMonth()]}`;
  return `du ${d(start)} au ${d(end)} ${start.getUTCFullYear()}`;
}

type Availability = {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
};

function compare(a: Availability, b: Availability) {
  return a.day - b.day || a.startTime.localeCompare(b.startTime);
}

export function AvailabilityManager() {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [locked, setLocked] = useState(false);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [avRes, valRes] = await Promise.all([
        fetch("/api/availabilities"),
        fetch("/api/availabilities/validate"),
      ]);
      if (avRes.ok) {
        setAvailabilities(await avRes.json());
      } else {
        toast.error("Impossible de charger les disponibilités");
      }
      if (valRes.ok) {
        const val = await valRes.json();
        setLocked(val.validated);
        setWeekStart(val.weekStart ?? null);
      }
    } catch {
      toast.error("Erreur réseau : impossible de charger vos disponibilités");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleValidate() {
    setValidating(true);
    try {
      const res = await fetch("/api/availabilities/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validated: true }),
      });
      if (res.ok) {
        setLocked(true);
        toast.success("Semaine validée : vos disponibilités sont maintenant figées");
      } else {
        toast.error("Impossible de valider la semaine");
      }
    } catch {
      toast.error("Erreur réseau : impossible de valider la semaine");
    } finally {
      setValidating(false);
    }
  }

  async function handleUnvalidate() {
    setValidating(true);
    try {
      const res = await fetch("/api/availabilities/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validated: false }),
      });
      if (res.ok) {
        setLocked(false);
        toast.success("Semaine dévalidée : vous pouvez à nouveau modifier");
      } else {
        toast.error("Impossible de dévalider la semaine");
      }
    } catch {
      toast.error("Erreur réseau : impossible de dévalider la semaine");
    } finally {
      setValidating(false);
    }
  }

  const grouped = useMemo<Record<number, Availability[]>>(() => {
    const g: Record<number, Availability[]> = {};
    DAY_NAMES.forEach((_, i) => (g[i] = []));
    availabilities.forEach((a) => {
      if (g[a.day]) g[a.day].push(a);
    });
    Object.values(g).forEach((arr) => arr.sort(compare));
    return g;
  }, [availabilities]);

  const previewValid = day !== null && startTime && endTime && startTime < endTime;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (locked) {
      toast.error("Semaine validée : vous ne pouvez plus modifier vos disponibilités");
      return;
    }
    if (day === null) {
      toast.error("Choisissez un jour");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/availabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, startTime, endTime }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur" }));
        toast.error(err.error ?? "Erreur lors de l'ajout");
        return;
      }
      const created = await res.json();
      setAvailabilities((prev) =>
        [...prev, created].sort((x, y) => x.day - y.day || x.startTime.localeCompare(y.startTime))
      );
      setStartTime("");
      setEndTime("");
      toast.success("Disponibilité ajoutée");
    } catch {
      toast.error("Erreur réseau : impossible d'ajouter la disponibilité");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (locked) {
      toast.error("Semaine validée : vous ne pouvez plus modifier vos disponibilités");
      return;
    }
    try {
      const res = await fetch(`/api/availabilities/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAvailabilities((prev) => prev.filter((a) => a.id !== id));
        toast.success("Disponibilité supprimée");
      } else {
        toast.error("Suppression impossible");
      }
    } catch {
      toast.error("Erreur réseau : suppression impossible");
    }
  }

  return (
    <div className="space-y-6">
      <Card
        className={`${
          locked ? "border-warning/40 bg-warning/5" : "bg-secondary/40"
        }`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarRangeIcon className="size-5 text-accent" />
            Ajouter une disponibilité
          </CardTitle>
          <CardDescription>
            Indiquez un jour puis l&apos;horaire où vous êtes disponible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locked && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
              <LockIcon className="mt-0.5 size-5 shrink-0 text-warning" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">
                  Semaine validée — disponibilités figées
                </p>
                <p className="text-muted-foreground">
                  Vous ne pouvez plus ajouter ou retirer de créneau jusqu&apos;au
                  lundi suivant ({formatDateFr(weekStart ?? "")} →{" "}
                  {formatWeekRange(weekStart ?? "")}).
                </p>
              </div>
            </div>
          )}
          <form
            onSubmit={handleAdd}
            lang="fr-FR"
            aria-disabled={locked}
            className={`flex flex-col gap-5 ${locked ? "pointer-events-none opacity-60" : ""}`}
          >
            <div className="flex flex-col gap-2">
              <Label>Jour</Label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {DAY_SHORT.map((name, i) => {
                  const active = day === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDay(i)}
                      aria-pressed={active}
                      className={`flex h-10 items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                        active
                          ? "border-accent bg-accent text-white shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-accent/50 hover:text-foreground"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Horaires</Label>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-2">
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    aria-label="Heure de début"
                    aria-invalid={
                      Boolean(startTime && endTime && startTime >= endTime)
                    }
                  />
                </div>
                <span className="pb-2 text-sm text-muted-foreground">à</span>
                <div className="flex flex-col gap-2">
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    aria-label="Heure de fin"
                    aria-invalid={
                      Boolean(startTime && endTime && startTime >= endTime)
                    }
                  />
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <PlusIcon />
                  )}
                  Ajouter
                </Button>
              </div>
            </div>

            {day !== null && (
              <p
                aria-live="polite"
                className={`flex items-center gap-2 text-sm ${
                  previewValid ? "text-success" : "text-foreground"
                }`}
              >
                <ClockIcon className="size-4" />
                {DAY_NAMES[day]}
                {startTime || endTime ? (
                  <>
                    {" "}
                    · {startTime || "--:--"} à {endTime || "--:--"}
                    {startTime && endTime && startTime >= endTime && (
                      <span className="text-error">
                        — la fin doit être après le début
                      </span>
                    )}
                  </>
                ) : (
                  " · choisissez un horaire"
                )}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg">Ma semaine</CardTitle>
              <CardDescription>
                {availabilities.length} créneau
                {availabilities.length > 1 ? "x" : ""} renseigné
                {availabilities.length > 1 ? "s" : ""}
                {weekStart && !loading ? (
                  <>
                    {" "}
                    · {formatWeekRange(weekStart)}
                  </>
                ) : null}
                {locked ? " · " : ""}
              </CardDescription>
            </div>
            {locked ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnvalidate}
                disabled={validating}
                className="border-warning/50 text-warning hover:text-warning"
              >
                {validating ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <LockIcon className="size-4" />
                )}
                Dévalider la semaine
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleValidate}
                disabled={validating || availabilities.length === 0}
              >
                {validating ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <ShieldCheckIcon className="size-4" />
                )}
                Valider la semaine
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2Icon className="size-6 animate-spin text-accent" />
            </div>
          ) : availabilities.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucune disponibilité pour le moment. Ajoutez votre premier créneau.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[720px] grid-cols-7 gap-2">
                {DAY_NAMES.map((name, dayIdx) => (
                  <div key={dayIdx} className="flex flex-col gap-1.5">
                    <p className="text-center text-xs font-medium text-muted-foreground">
                      {name}
                    </p>
                    <div className="space-y-1.5">
                      {grouped[dayIdx].length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground/60">
                          —
                        </p>
                      ) : (
                        grouped[dayIdx].map((a) => (
                          <div
                            key={a.id}
                            className="group flex items-center justify-between gap-1 rounded-lg bg-accent/90 px-2 py-1.5 text-xs font-medium text-white shadow-sm"
                          >
                            <span className="min-w-0 truncate">
                              {a.startTime}–{a.endTime}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(a.id)}
                              disabled={locked}
                              className="shrink-0 text-white/80 opacity-0 transition-opacity hover:text-white focus:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
                              aria-label={`Supprimer ${a.startTime}–${a.endTime}`}
                            >
                              <Trash2Icon className="size-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}