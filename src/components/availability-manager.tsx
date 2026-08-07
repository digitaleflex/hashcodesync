"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2Icon, CalendarDaysIcon } from "lucide-react";
import type { Availability } from "@/components/availability/shared";
import { computeStats } from "@/components/availability/shared";
import { PageHeader } from "@/components/availability/page-header";
import { KpiGrid } from "@/components/availability/kpi-grid";
import { WeeklyOverview } from "@/components/availability/weekly-overview";
import { TimeSlotsList } from "@/components/availability/time-slots-list";
import { AddAvailabilityForm } from "@/components/availability/add-availability-form";
import { AvailabilitySummaryCard } from "@/components/availability/availability-summary-card";
import { ValidateBar } from "@/components/availability/validate-bar";
import { LockBanner } from "@/components/availability/lock-banner";
import { EmptyState } from "@/components/availability/empty-state";

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
    for (let i = 0; i < 7; i++) g[i] = [];
    availabilities.forEach((a) => {
      if (g[a.day]) g[a.day].push(a);
    });
    Object.values(g).forEach((arr) => arr.sort(compare));
    return g;
  }, [availabilities]);

  const sorted = useMemo(() => [...availabilities].sort(compare), [availabilities]);

  const stats = useMemo(() => computeStats(availabilities), [availabilities]);

  const hoursPerDay = useMemo(() => {
    const per = new Array(7).fill(0);
    availabilities.forEach((a) => {
      const sh = Number(a.startTime.slice(0, 2));
      const eh = Number(a.endTime.slice(0, 2));
      per[a.day] += Math.max(0, eh - sh);
    });
    return per;
  }, [availabilities]);

  const onAdd = useCallback(async () => {
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
  }, [locked, day, startTime, endTime]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2Icon className="size-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        weekStart={weekStart}
        locked={locked}
        onValidate={() => void handleValidate()}
        onUnvalidate={() => void handleUnvalidate()}
        validating={validating}
        canValidate={availabilities.length > 0}
      />

      {locked && weekStart && <LockBanner weekStart={weekStart} />}

      <KpiGrid stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDaysIcon className="size-5 text-accent" />
            Visuel hebdomadaire
          </CardTitle>
          <CardDescription>
            Un aperçu jour par jour de vos créneaux libres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availabilities.length === 0 ? (
            <EmptyState />
          ) : (
            <WeeklyOverview grouped={grouped} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Créneaux définis</CardTitle>
            <CardDescription>
              {stats.slots} créneau{stats.slots > 1 ? "x" : ""} · {stats.daysCount} jour{stats.daysCount > 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TimeSlotsList slots={sorted} onDelete={handleDelete} disabled={locked} />
          </CardContent>
        </Card>

        <Card className={locked ? "bg-warning/5" : ""}>
          <CardHeader>
            <CardTitle className="text-lg">Ajouter un créneau</CardTitle>
            <CardDescription>
              Choisissez un jour, un horaire de début et de fin, puis ajoutez.
            </CardDescription>
          </CardHeader>
          <CardContent className={locked ? "pointer-events-none opacity-60" : ""}>
            <AddAvailabilityForm
              day={day}
              onSelectDay={setDay}
              hoursPerDay={hoursPerDay}
              startTime={startTime}
              endTime={endTime}
              onStartTime={setStartTime}
              onEndTime={setEndTime}
              onSubmit={() => void onAdd()}
              submitting={submitting}
              disabled={locked}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Résumé — mon profil de disponibilité</CardTitle>
          <CardDescription>
            Comment se répartit votre temps disponible cette semaine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvailabilitySummaryCard stats={stats} />
        </CardContent>
      </Card>

      <div className="rounded-xl ring-1 ring-foreground/10">
        <ValidateBar
          locked={locked}
          validating={validating}
          onValidate={() => void handleValidate()}
          onUnvalidate={() => void handleUnvalidate()}
          canValidate={availabilities.length > 0}
        />
      </div>
    </div>
  );
}