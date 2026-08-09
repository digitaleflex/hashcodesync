"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2Icon, ShieldCheckIcon, LockIcon, HistoryIcon } from "lucide-react";
import dynamic from "next/dynamic";
import type { Availability } from "@/components/availability/shared";
import { computeStats } from "@/components/availability/shared";
import { PageHeader } from "@/components/availability/page-header";
import { KpiGrid } from "@/components/availability/kpi-grid";
import { WeeklyCalendar } from "@/components/availability/weekly-calendar";
import { MobileWeekView } from "@/components/availability/mobile-week-view";
import { TimeSlotsList } from "@/components/availability/time-slots-list";
import { SlotFormModal } from "@/components/availability/slot-form-modal";
import { CompatibilitySection } from "@/components/availability/compatibility-section";
import { LockBanner } from "@/components/availability/lock-banner";
import { EmptyState } from "@/components/availability/empty-state";
import { CopyDialog } from "@/components/availability/copy-dialog";

const HISTORY_SECTION = dynamic(
  () =>
    import("@/components/availability/history-section").then(
      (m) => m.HistorySection
    ),
  { ssr: false, loading: () => null }
);

type GroupOption = {
  id: string;
  name: string;
  activities: { id: string; name: string }[];
};

type WeekHistoryEntry = {
  id: string;
  weekStart: string;
  validatedAt: string;
  slots: { day: number; startTime: string; endTime: string }[];
};

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
  const [validating, setValidating] = useState(false);
  const [locked, setLocked] = useState(false);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Availability | null>(null);
  const [copyingSlot, setCopyingSlot] = useState<Availability | null>(null);
  const [preselectDay, setPreselectDay] = useState<number | null>(null);
  const [historyWeek, setHistoryWeek] = useState<WeekHistoryEntry | null>(null);
  const initialLoadRef = useRef(true);

  const canValidate = availabilities.length > 0 && !hasOverlaps(availabilities);

  const selectedGroupOption = useMemo(
    () => groups.find((g) => g.id === editingSlot?.group?.id) ?? null,
    [groups, editingSlot]
  );

  const availableActivities = useMemo(
    () => selectedGroupOption?.activities ?? [],
    [selectedGroupOption]
  );

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

  const load = useCallback(async () => {
    if (initialLoadRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const [avRes, valRes, groupsRes] = await Promise.all([
        fetch("/api/availabilities"),
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
  }, []);

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
          const err = await res.json().catch(() => ({ error: "Erreur" }));
          toast.error(err.error ?? "Suppression impossible");
        }
      } catch {
        toast.error("Erreur réseau : suppression impossible");
      }
    },
    [locked]
  );

  const handleEdit = useCallback((slot: Availability) => {
    if (locked) {
      toast.error("Semaine validée : vous ne pouvez plus modifier vos disponibilités");
      return;
    }
    setEditingSlot(slot);
    setAddModalOpen(true);
  }, [locked]);

  const handleOpenDay = useCallback(
    (day: number) => {
      if (locked) {
        toast.error("Semaine validée : vous ne pouvez plus modifier vos disponibilités");
        return;
      }
      setEditingSlot(null);
      setPreselectDay(day);
      setAddModalOpen(true);
    },
    [locked]
  );

  const handleDuplicate = useCallback((slot: Availability) => {
    if (locked) {
      toast.error("Semaine validée : vous ne pouvez plus modifier vos disponibilités");
      return;
    }
    setCopyingSlot(slot);
  }, [locked]);

  const handlePrevWeek = useCallback(async () => {
    // Show the most recent validated week from history.
    try {
      const res = await fetch("/api/availabilities/history?limit=1");
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setHistoryWeek(data.items[0]);
        } else {
          toast.info("Aucune semaine validée dans l'historique");
        }
      }
    } catch {
      toast.error("Impossible de charger l'historique");
    }
  }, []);

  const handleNextWeek = useCallback(() => {
    // Reset to current week view.
    setHistoryWeek(null);
    toast.info("Navigation vers la semaine en cours");
  }, []);

  const handleHistoryCopy = useCallback(async (snapshotId: string) => {
    try {
      const res = await fetch("/api/availabilities/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId }),
      });
      if (res.ok) {
        const created = await res.json();
        setAvailabilities((prev) => [...prev, ...created].sort(compare));
        toast.success("Semaine copiée dans vos disponibilités actuelles");
        setHistoryWeek(null);
      } else {
        const err = await res.json().catch(() => ({ error: "Erreur" }));
        toast.error(err.error ?? "Impossible de copier la semaine");
      }
    } catch {
      toast.error("Erreur réseau");
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2Icon className="size-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24 sm:pb-0">
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
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
      />

      {locked && weekStart && <LockBanner weekStart={weekStart} />}

      {/* History overlay */}
      {historyWeek && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Semaine du {historyWeek.weekStart ? new Date(historyWeek.weekStart).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : ""}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryWeek(null)}
              >
                Fermer
              </Button>
            </div>
            <CardDescription>
              Cette semaine a été validée. Vous pouvez la consulter ou la copier.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <MobileWeekView grouped={groupSlots(historyWeek.slots)} />
            </div>
            <Button
              onClick={() => handleHistoryCopy(historyWeek.id)}
              className="w-full sm:w-auto"
            >
              Copier cette semaine dans mes disponibilités actuelles
            </Button>
          </CardContent>
        </Card>
      )}

      <KpiGrid stats={stats} />

      {/* Weekly Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span>Vue hebdomadaire</span>
          </CardTitle>
          <CardDescription>
            Un aperçu visuel jour par jour de vos créneaux disponibles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availabilities.length === 0 ? (
            <EmptyState onAdd={() => setAddModalOpen(true)} />
          ) : (
            <>
              <div className="sm:hidden">
                <MobileWeekView grouped={grouped} />
              </div>
              <div className="hidden sm:block">
                <WeeklyCalendar grouped={grouped} onOpenDay={handleOpenDay} onEditSlot={handleEdit} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Slots List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Créneaux définis</CardTitle>
              <CardDescription>
                {stats.slots} créneau{stats.slots > 1 ? "x" : ""} · {stats.daysCount} jour{stats.daysCount > 1 ? "s" : ""}
              </CardDescription>
            </div>
            {!locked && (
              <Button size="sm" onClick={() => { setEditingSlot(null); setPreselectDay(null); setAddModalOpen(true); }}>
                + Ajouter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <TimeSlotsList
            slots={sorted}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            disabled={locked}
            groups={groups}
          />
        </CardContent>
      </Card>

      {/* Compatibility */}
      <CompatibilitySection />

      {/* History */}
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
          <HISTORY_SECTION onCopyWeek={handleHistoryCopy} />
        </CardContent>
      </Card>

      {/* Desktop validate bar (kept for desktop users) */}
      <div className="hidden rounded-xl ring-1 ring-foreground/10 sm:block">
        <div className="flex items-center justify-between gap-3 border-t border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            {locked
              ? "Vos disponibilités sont engagées pour cette semaine."
              : "Une fois validé, vos disponibilités seront figées pour la semaine."}
          </p>
          {locked ? (
            <Button variant="outline" size="sm" onClick={handleUnvalidate} disabled={validating} className="border-warning/50 text-warning hover:text-warning">
              {validating ? <Loader2Icon className="size-4 animate-spin" /> : <LockIcon className="size-4" />}
              Dévalider la semaine
            </Button>
          ) : (
            <Button size="sm" onClick={handleValidate} disabled={validating || !canValidate}>
              {validating ? <Loader2Icon className="size-4 animate-spin" /> : <ShieldCheckIcon className="size-4" />}
              Valider la semaine
            </Button>
          )}
        </div>
      </div>

      {/* Mobile sticky action bar */}
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

      {/* Modals */}
      <SlotFormModal
        open={addModalOpen}
        onOpenChange={(v) => {
          setAddModalOpen(v);
          if (!v) setPreselectDay(null);
        }}
        groups={groups}
        editing={editingSlot}
        defaultDay={preselectDay}
        onSaved={() => {
          setEditingSlot(null);
          setPreselectDay(null);
          load();
        }}
      />

      <CopyDialog
        open={!!copyingSlot}
        onOpenChange={(v) => setCopyingSlot(v ? copyingSlot : null)}
        slot={copyingSlot}
        onCopied={load}
      />
    </div>
  );
}

function groupSlots(slots: { day: number; startTime: string; endTime: string }[]) {
  const g: Record<number, { day: number; startTime: string; endTime: string }[]> = {};
  for (let i = 0; i < 7; i++) g[i] = [];
  slots.forEach((s) => {
    if (g[s.day]) g[s.day].push(s);
  });
  return g;
}
