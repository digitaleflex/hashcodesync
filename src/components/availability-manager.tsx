"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2Icon, CalendarDaysIcon, ShieldCheckIcon, LockIcon, HistoryIcon } from "lucide-react";
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
import { MobileWeeklyTimeline } from "@/components/availability/mobile-weekly-timeline";

const HistorySection = dynamic(
  () =>
    import("@/components/availability/history-section").then(
      (m) => m.HistorySection
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <Loader2Icon className="size-5 animate-spin text-accent" />
      </div>
    ),
  }
);

type GroupOption = { id: string; name: string; activities: { id: string; name: string }[] };

function compare(a: Availability, b: Availability) {
  return a.day - b.day || a.startTime.localeCompare(b.startTime);
}

function hasOverlaps(slots: Availability[]): boolean {
  const byDay = new Map<number, { start: string; end: string }[]>();
  for (const s of slots) {
    const arr = byDay.get(s.day) ?? [];
    arr.push({ start: s.startTime, end: s.endTime });
    byDay.set(s.day, arr);
  }
  for (const arr of byDay.values()) {
    arr.sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < arr.length; i++) {
      if (arr[i].start < arr[i - 1].end) return true;
    }
  }
  return false;
}

export function AvailabilityManager() {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [locked, setLocked] = useState(false);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const initialLoadRef = useRef(true);

  const canValidate = availabilities.length > 0 && !hasOverlaps(availabilities);

  const selectedGroupOption = useMemo(
    () => groups.find((g) => g.id === selectedGroup) ?? null,
    [groups, selectedGroup]
  );

  const availableActivities = useMemo(
    () => selectedGroupOption?.activities ?? [],
    [selectedGroupOption]
  );

  const load = useCallback(async () => {
    if (initialLoadRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const [avRes, valRes, groupsRes] = await Promise.all([
        fetch(`/api/availabilities?groupId=${selectedGroup ?? ""}&activityId=${selectedActivity ?? ""}`),
        fetch("/api/availabilities/validate"),
        fetch("/api/groups"),
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
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        const myGroups: GroupOption[] = (data.myMemberships ?? []).map(
          (m: { id: string; name: string; activities: { id: string; name: string }[] }) => ({
            id: m.id,
            name: m.name,
            activities: m.activities ?? [],
          })
        );
        setGroups(myGroups);
      }
    } catch {
      toast.error("Erreur réseau : impossible de charger vos disponibilités");
    } finally {
      if (initialLoadRef.current) {
        setLoading(false);
        initialLoadRef.current = false;
      } else {
        setRefreshing(false);
      }
    }
  }, [selectedGroup, selectedActivity]);

  useEffect(() => {
    load();
  }, [load]);

  const handleValidate = useCallback(async () => {
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
        const err = await res.json().catch(() => ({ error: "Erreur" }));
        toast.error(err.error ?? "Impossible de valider la semaine");
      }
    } catch {
      toast.error("Erreur réseau : impossible de valider la semaine");
    } finally {
      setValidating(false);
    }
  }, []);

  const handleUnvalidate = useCallback(async () => {
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
        const err = await res.json().catch(() => ({ error: "Erreur" }));
        toast.error(err.error ?? "Impossible de dévalider la semaine");
      }
    } catch {
      toast.error("Erreur réseau : impossible de dévalider la semaine");
    } finally {
      setValidating(false);
    }
  }, []);

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
      const body: Record<string, unknown> = { day, startTime, endTime };
      if (selectedGroup) body.groupId = selectedGroup;
      if (selectedActivity) body.activityId = selectedActivity;

      const res = await fetch("/api/availabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
  }, [locked, day, startTime, endTime, selectedGroup, selectedActivity]);

  const handleDelete = useCallback(
    async (id: string) => {
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
    },
    [locked]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2Icon className="size-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20 sm:pb-0">
      {refreshing && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2Icon className="size-3.5 animate-spin text-accent" />
          Mise à jour des disponibilités...
        </div>
      )}
      <PageHeader
        weekStart={weekStart}
        locked={locked}
        onValidate={handleValidate}
        onUnvalidate={handleUnvalidate}
        validating={validating}
        canValidate={canValidate}
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
            <>
              <div className="sm:hidden">
                <MobileWeeklyTimeline grouped={grouped} />
              </div>
              <div className="hidden sm:block">
                <WeeklyOverview grouped={grouped} />
              </div>
            </>
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
              Choisissez un contexte, un jour, un horaire de début et de fin, puis ajoutez.
            </CardDescription>
          </CardHeader>
          <CardContent className={locked ? "pointer-events-none opacity-60" : ""}>
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Groupe</label>
                  <Select
                    value={selectedGroup ?? ""}
                    onValueChange={(v) => {
                      setSelectedGroup(v || null);
                      setSelectedActivity(null);
                    }}
                    disabled={locked}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Disponibilités générales" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Disponibilités générales</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Les disponibilités générales sont visibles par tous. Les disponibilités par groupe aident à planifier des ateliers spécifiques.
                  </p>
                </div>
                {selectedGroup && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Activité</label>
                    <Select
                      value={selectedActivity ?? ""}
                      onValueChange={setSelectedActivity}
                      disabled={locked || availableActivities.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les activités" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Toutes les activités</SelectItem>
                        {availableActivities.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Laissez vide pour appliquer ce créneau à toutes les activités du groupe.
                    </p>
                  </div>
                )}
              </div>
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
            </div>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HistoryIcon className="size-5 text-accent" />
            Historique des semaines
          </CardTitle>
          <CardDescription>
            Les semaines que vous avez validées, avec les créneaux figés à ce moment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HistorySection />
        </CardContent>
      </Card>

      <div className="hidden rounded-xl ring-1 ring-foreground/10 sm:block">
        <ValidateBar
          locked={locked}
          validating={validating}
          onValidate={handleValidate}
          onUnvalidate={handleUnvalidate}
          canValidate={canValidate}
        />
      </div>

      {locked ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
          <Button
            variant="outline"
            className="h-11 w-full border-warning/50 text-warning hover:text-warning"
            onClick={() => void handleUnvalidate()}
            disabled={validating}
          >
            {validating ? <Loader2Icon className="size-4 animate-spin" /> : <LockIcon className="size-4" />}
            Dévalider la semaine
          </Button>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
          <Button
            className="h-11 w-full"
            onClick={() => void handleValidate()}
            disabled={validating || availabilities.length === 0}
          >
            {validating ? <Loader2Icon className="size-4 animate-spin" /> : <ShieldCheckIcon className="size-4" />}
            Valider la semaine
          </Button>
        </div>
      )}
    </div>
  );
}