"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarCheck2Icon,
  CalendarOffIcon,
  ChevronDownIcon,
  ClockIcon,
  HistoryIcon,
  Loader2Icon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DAY_NAMES, buildDayDates } from "@/components/scheduling-views";
import {
  MemberWeekGrid,
  type WeekSlot,
} from "@/components/member-week-grid";

type MemberRow = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: string;
  timezone: string;
  slots: WeekSlot[];
  recurring: { dayMask: number; startTime: string; endTime: string }[];
  unavailabilities: { startDate: string; endDate: string; reason: string | null }[];
  massHours: number;
  reliability: number;
  attendance: { present: number; absent: number };
  weekValidated: boolean;
  historyCount: number;
  lastValidatedAt: string | null;
};

type HistoryItem = {
  id: string;
  weekStart: string;
  validatedAt: string;
  active: boolean;
  slots: WeekSlot[];
};

type Payload = {
  members: MemberRow[];
  referenceTimezone?: string;
  weekStart?: string;
};

const ROLE_LABELS: Record<string, string> = {
  member: "Membre",
  mentor: "Mentor",
  admin: "Admin",
};

type Filter = "all" | "validated" | "pending" | "empty";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "validated", label: "Validés" },
  { key: "pending", label: "Non validés" },
  { key: "empty", label: "Sans dispo" },
];

// « du lundi 17 au dimanche 23 août 2026 » à partir du lundi (ISO, réf. tz).
function weekRangeLabel(weekStartIso: string, refTz?: string): string {
  const days = buildDayDates(weekStartIso, refTz);
  if (!days) return "";
  const year = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${days[6].key}T00:00:00Z`));
  return `Semaine du ${days[0].long} au ${days[6].long} ${year}`;
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

function slotKey(s: WeekSlot) {
  return `${s.day}|${s.startTime}|${s.endTime}`;
}

// Diff entre deux snapshots consécutifs : créneaux apparus / disparus.
function diffSlots(newer: WeekSlot[], older: WeekSlot[]) {
  const n = new Set(newer.map(slotKey));
  const o = new Set(older.map(slotKey));
  const added = newer.filter((s) => !o.has(slotKey(s)));
  const removed = older.filter((s) => !n.has(slotKey(s)));
  return { added, removed };
}

const slotLabel = (s: WeekSlot) => `${DAY_NAMES[s.day]} ${s.startTime}–${s.endTime}`;

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export function AdminMemberAvailabilities() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [openSnap, setOpenSnap] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/members");
        if (!res.ok) throw new Error();
        const d: Payload = await res.json();
        if (!active) return;
        setData(d);
        setSelectedId(d.members[0]?.id ?? null);
      } catch {
        if (active) toast.error("Impossible de charger les membres");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setHistory(null);
      return;
    }
    let active = true;
    setHistoryLoading(true);
    setOpenSnap(null);
    (async () => {
      try {
        const res = await fetch(`/api/admin/members/${selectedId}/history`);
        if (!res.ok) throw new Error();
        const d = await res.json();
        if (!active) return;
        setHistory(d.items ?? []);
        setOpenSnap(d.items?.[0]?.id ?? null);
      } catch {
        if (active) toast.error("Impossible de charger l'historique");
      } finally {
        if (active) setHistoryLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedId]);

  const members = data?.members ?? [];
  const refTz = data?.referenceTimezone;
  const weekStart = data?.weekStart;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      if (
        needle &&
        !`${m.firstname} ${m.lastname} ${m.email}`.toLowerCase().includes(needle)
      ) {
        return false;
      }
      if (filter === "validated") return m.weekValidated;
      if (filter === "pending") return !m.weekValidated && m.slots.length > 0;
      if (filter === "empty") return m.slots.length === 0;
      return true;
    });
  }, [members, q, filter]);

  const selected = useMemo(
    () => members.find((m) => m.id === selectedId) ?? null,
    [members, selectedId]
  );

  const reloadList = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/members");
      if (res.ok) setData(await res.json());
    } catch {
      // silencieux : rafraîchissement best-effort
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2Icon className="size-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* --- Liste des membres --- */}
        <aside className="space-y-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un membre…"
              aria-label="Rechercher un membre"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtres">
            {FILTERS.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                onClick={() => setFilter(f.key)}
                className="h-8 px-3 text-xs"
              >
                {f.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length} membre{filtered.length > 1 ? "s" : ""}
          </p>
          <ul className="max-h-[560px] space-y-2 overflow-y-auto pr-1" role="list">
            {filtered.length === 0 && (
              <li className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Aucun membre ne correspond.
              </li>
            )}
            {filtered.map((m) => {
              const active = m.id === selectedId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      active
                        ? "border-accent/50 bg-accent/10 ring-1 ring-accent/30"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {m.firstname} {m.lastname}
                      </span>
                      {m.weekValidated ? (
                        <CalendarCheck2Icon
                          className="size-4 shrink-0 text-success"
                          aria-label="Semaine validée"
                        />
                      ) : (
                        <ClockIcon
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-label="Semaine non validée"
                        />
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {ROLE_LABELS[m.role] ?? m.role}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {m.slots.length > 0
                          ? `${m.slots.length} créneau${m.slots.length > 1 ? "x" : ""}`
                          : "Aucune dispo"}
                      </Badge>
                      {m.historyCount > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {m.historyCount} sem. archivée{m.historyCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* --- Détail du membre sélectionné --- */}
        <section className="space-y-4" aria-live="polite">
          {!selected ? (
            <Card>
              <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Sélectionnez un membre pour voir ses disponibilités.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <UsersIcon className="size-5 text-accent" />
                        {selected.firstname} {selected.lastname}
                      </CardTitle>
                      <CardDescription>
                        {selected.email} · {ROLE_LABELS[selected.role] ?? selected.role} ·{" "}
                        {selected.timezone}
                      </CardDescription>
                    </div>
                    <Badge variant={selected.weekValidated ? "default" : "outline"}>
                      {selected.weekValidated
                        ? "Semaine validée"
                        : "Semaine non validée"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-xs text-muted-foreground">Masse horaire</dt>
                      <dd className="font-heading text-xl font-semibold">
                        {selected.massHours} h
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-xs text-muted-foreground">Fiabilité estimée</dt>
                      <dd className="font-heading text-xl font-semibold">
                        {selected.reliability}%
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-xs text-muted-foreground">Présences / absences</dt>
                      <dd className="font-heading text-xl font-semibold">
                        {selected.attendance.present} / {selected.attendance.absent}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-xs text-muted-foreground">Motifs récurrents</dt>
                      <dd className="font-heading text-xl font-semibold">
                        {selected.recurring.length}
                      </dd>
                    </div>
                  </dl>
                  {selected.unavailabilities.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <CalendarOffIcon className="size-3.5" />
                        Absences planifiées à venir
                      </p>
                      <ul className="flex flex-wrap gap-1.5">
                        {selected.unavailabilities.map((a, i) => (
                          <li
                            key={i}
                            className="rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-medium ring-1 ring-warning/30"
                            title={a.reason ?? "Absence planifiée"}
                          >
                            {fmtDay(a.startDate)} → {fmtDay(a.endDate)}
                            {a.reason ? ` · ${a.reason}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Disponibilités de la semaine</CardTitle>
                  {weekStart && (
                    <CardDescription>{weekRangeLabel(weekStart, refTz)}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <MemberWeekGrid
                    slots={selected.slots}
                    weekStart={weekStart}
                    refTz={refTz}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HistoryIcon className="size-4 text-accent" />
                    Historique des semaines validées
                  </CardTitle>
                  <CardDescription>
                    Copie figée des créneaux au moment de chaque validation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2Icon className="size-6 animate-spin text-accent" />
                    </div>
                  ) : !history || history.length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">
                      Aucune semaine validée enregistrée pour ce membre.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {history.map((snap, i) => {
                        const older = i + 1 < history.length ? history[i + 1] : null;
                        const diff = older ? diffSlots(snap.slots, older.slots) : null;
                        const open = openSnap === snap.id;
                        return (
                          <li key={snap.id} className="rounded-lg border">
                            <button
                              type="button"
                              onClick={() => setOpenSnap(open ? null : snap.id)}
                              aria-expanded={open}
                              className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <ChevronDownIcon
                                  className={cn(
                                    "size-4 shrink-0 text-muted-foreground transition-transform",
                                    !open && "-rotate-90"
                                  )}
                                />
                                <span className="truncate text-sm font-medium">
                                  {weekRangeLabel(snap.weekStart, refTz) || snap.weekStart}
                                </span>
                                {snap.active && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    active
                                  </Badge>
                                )}
                              </span>
                              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                {diff && (diff.added.length > 0 || diff.removed.length > 0) && (
                                  <span className="tabular-nums">
                                    <span className="text-success">+{diff.added.length}</span>{" "}
                                    <span className="text-destructive">
                                      −{diff.removed.length}
                                    </span>
                                  </span>
                                )}
                                <span>
                                  {snap.slots.length} créneau
                                  {snap.slots.length > 1 ? "x" : ""}
                                </span>
                                <span title="Validé le">{fmtDateTime(snap.validatedAt)}</span>
                              </span>
                            </button>
                            {open && (
                              <div className="space-y-3 border-t p-3">
                                {diff && (
                                  <div className="text-xs">
                                    <p className="mb-1.5 text-muted-foreground">
                                      Modifications vs{" "}
                                      {older
                                        ? weekRangeLabel(older.weekStart, refTz)
                                        : "semaine précédente"}
                                      :
                                    </p>
                                    {diff.added.length === 0 && diff.removed.length === 0 ? (
                                      <p className="text-muted-foreground">
                                        Aucun changement — créneaux identiques.
                                      </p>
                                    ) : (
                                      <ul className="flex flex-wrap gap-1.5">
                                        {diff.added.map((s) => (
                                          <li
                                            key={`a-${slotKey(s)}`}
                                            className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success ring-1 ring-success/30"
                                          >
                                            + {slotLabel(s)}
                                          </li>
                                        ))}
                                        {diff.removed.map((s) => (
                                          <li
                                            key={`r-${slotKey(s)}`}
                                            className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive line-through ring-1 ring-destructive/30"
                                          >
                                            − {slotLabel(s)}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                )}
                                <MemberWeekGrid
                                  slots={snap.slots}
                                  weekStart={snap.weekStart}
                                  refTz={refTz}
                                />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </section>
      </div>
      {/* Recharge silencieuse quand on revient sur la vue (statuts à jour). */}
      <RefreshOnFocus onFocus={reloadList} />
    </div>
  );
}

function RefreshOnFocus({ onFocus }: { onFocus: () => void }) {
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [onFocus]);
  return null;
}
