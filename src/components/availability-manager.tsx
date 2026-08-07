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
  const [day, setDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/availabilities");
    if (res.ok) {
      setAvailabilities(await res.json());
    } else {
      toast.error("Impossible de charger les disponibilités");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    if (day === null) {
      toast.error("Choisissez un jour");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/availabilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day, startTime, endTime }),
    });
    setSubmitting(false);

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
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/availabilities/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAvailabilities((prev) => prev.filter((a) => a.id !== id));
      toast.success("Disponibilité supprimée");
    } else {
      toast.error("Suppression impossible");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-secondary/40">
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
          <form onSubmit={handleAdd} className="flex flex-col gap-5">
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
          <CardTitle className="text-lg">Ma semaine</CardTitle>
          <CardDescription>
            {availabilities.length} créneau{availabilities.length > 1 ? "x" : ""} renseigné
            {availabilities.length > 1 ? "s" : ""}.
          </CardDescription>
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
                              className="shrink-0 text-white/80 opacity-0 transition-opacity hover:text-white focus:opacity-100 group-hover:opacity-100"
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