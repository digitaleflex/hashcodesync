"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2Icon,
  PlusIcon,
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon,
  Trash2Icon,
  CalendarDaysIcon,
  PencilIcon,
  SearchIcon,
  XIcon,
  FilterIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/format";

export type PublicWorkshop = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  createdBy: string;
  type: string;
  menteeId?: string | null;
  mentee?: { id: string; name: string; email: string; firstname?: string; lastname?: string } | null;
  series?: { id: string; name: string } | null;
  activity?: { id: string; name: string; type: string } | null;
  requiresMentor?: boolean;
  creator: { id: string; name: string; email: string };
  participants: {
    id: string;
    userId: string;
    status: string;
    user: { id: string; name: string; email: string };
  }[];
  attendance?: { id: string; userId: string; status: string }[];
  capacity?: number | null;
  location?: string | null;
  meetingUrl?: string | null;
};

type FilterState = {
  search: string;
  seriesId: string;
};

export function WorkshopsManager({ initial }: { initial: PublicWorkshop[] }) {
  const { data: session } = authClient.useSession();
  const [workshops, setWorkshops] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ search: "", seriesId: "" });
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const me = session?.user;
  const isAdmin = me?.role === "admin" || me?.role === "mentor";

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/workshops");
    if (res.ok) setWorkshops(await res.json());
    else toast.error("Impossible de charger les ateliers");
    setLoading(false);
  }, []);

  const { upcoming, past, seriesOptions } = useMemo(() => {
    const now = Date.now();
    const upcoming = workshops
      .filter((w) => new Date(w.endAt).getTime() >= now)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
    const past = workshops
      .filter((w) => new Date(w.endAt).getTime() < now)
      .sort((a, b) => b.startAt.localeCompare(a.startAt));

    const seriesMap = new Map<string, { id: string; name: string }>();
    for (const w of workshops) {
      if (w.series && !seriesMap.has(w.series.id)) {
        seriesMap.set(w.series.id, w.series);
      }
    }
    const seriesOptions = Array.from(seriesMap.values());

    return { upcoming, past, seriesOptions };
  }, [workshops]);

  const filteredUpcoming = useMemo(() => {
    let result = upcoming;
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          (w.series?.name ?? "").toLowerCase().includes(q)
      );
    }
    if (filters.seriesId) {
      result = result.filter((w) => w.series?.id === filters.seriesId);
    }
    return result;
  }, [upcoming, filters]);

  const filteredPast = useMemo(() => {
    let result = past;
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          (w.series?.name ?? "").toLowerCase().includes(q)
      );
    }
    if (filters.seriesId) {
      result = result.filter((w) => w.series?.id === filters.seriesId);
    }
    return result;
  }, [past, filters]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const thisWeek = upcoming.filter(
      (w) => new Date(w.startAt) >= now && new Date(w.startAt) <= weekEnd
    );
    const nextWorkshop = upcoming[0];
    const totalParticipants = upcoming.reduce(
      (sum, w) => sum + w.participants.length,
      0
    );
    return {
      upcomingCount: upcoming.length,
      totalParticipants,
      thisWeekCount: thisWeek.length,
      nextWorkshop,
    };
  }, [upcoming]);

  function participation(w: PublicWorkshop) {
    return me?.id ? w.participants.find((p) => p.userId === me.id) : undefined;
  }

  async function handleJoin(id: string) {
    const res = await fetch(`/api/workshops/${id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (res.ok) {
      toast.success("Vous êtes inscrit !");
      reload();
    } else if (res.status === 409) {
      const err = await res.json().catch(() => ({ error: "Impossible de rejoindre" }));
      toast.error(err.error ?? "Impossible de rejoindre");
    } else {
      toast.error("Inscription impossible");
    }
  }

  async function handleLeave(id: string) {
    const res = await fetch(`/api/workshops/${id}/participants`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Vous êtes désinscrit");
      reload();
    } else {
      toast.error("Désinscription impossible");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer définitivement cet atelier ?")) return;
    const res = await fetch(`/api/workshops/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Atelier supprimé");
      setWorkshops((prev) => prev.filter((w) => w.id !== id));
    } else {
      toast.error("Suppression impossible");
    }
  }

  function WorkshopCard({ w }: { w: PublicWorkshop }) {
    const part = participation(w);
    const isCreator = me?.id && w.createdBy === me.id;
    const startDate = new Date(w.startAt);
    const endDate = new Date(w.endAt);
    const dayName = startDate.toLocaleDateString("fr-FR", { weekday: "long" });
    const dayNum = startDate.getDate();
    const month = startDate.toLocaleDateString("fr-FR", { month: "short" });
    const startTime = formatTime(startDate);
    const endTime = formatTime(endDate);
    const isPast = new Date(w.endAt).getTime() < Date.now();
    const isFull = w.capacity ? w.participants.length >= w.capacity : false;

    const isMentorship = w.type === "mentorship_session";
    const menteeName = w.mentee ? `${w.mentee.firstname ?? w.mentee.name}` : null;

    return (
      <Card className="flex flex-col transition-colors hover:bg-muted/30">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {w.series && (
                <Badge variant="secondary" className="text-[10px] font-medium">
                  <CalendarDaysIcon className="mr-1 size-3" />
                  {w.series.name}
                </Badge>
              )}
              {w.activity && (
                <Badge variant="secondary" className="text-[10px] font-medium">
                  {w.activity.name}
                </Badge>
              )}
              {w.requiresMentor && (
                <Badge variant="outline" className="text-[10px] font-medium">
                  Mentor requis
                </Badge>
              )}
              {isMentorship && (
                <Badge variant="outline" className="text-[10px] font-medium">
                  Mentorat
                </Badge>
              )}
            </div>
            <Badge
              variant={
                isPast
                  ? "secondary"
                  : isFull
                    ? "destructive"
                    : part
                      ? "default"
                      : "outline"
              }
              className="text-[10px] font-medium"
            >
              {isPast ? "Terminé" : isFull ? "Complet" : part ? "Inscrit" : "Non inscrit"}
            </Badge>
          </div>
          <CardTitle className="text-base leading-snug">
            {w.title}
          </CardTitle>
          {isMentorship && menteeName && (
            <p className="text-xs text-muted-foreground">
              Avec {menteeName}
            </p>
          )}
          <div className="space-y-1">
            <p className="font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {dayName} {dayNum} {month}
            </p>
            <p className="font-heading text-lg font-semibold">
              {startTime} — {endTime}
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          {w.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {w.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UsersIcon className="size-3.5" />
            <span>
              {w.participants.length} participant{w.participants.length > 1 ? "s" : ""}
              {w.capacity ? ` / ${w.capacity}` : ""}
            </span>
          </div>
          {w.location && (
            <p className="text-xs text-muted-foreground">📍 {w.location}</p>
          )}
          {w.meetingUrl && (
            <a
              href={w.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Lien de réunion
            </a>
          )}
          <div className="mt-auto flex items-center gap-2 pt-2">
            {isCreator ? (
              <>
                <Button
                  nativeButton={false}
                  render={<Link href={`/ateliers/${w.id}`} />}
                  variant="outline"
                  size="sm"
                  className="h-10 flex-1"
                >
                  <PencilIcon className="size-3.5" />
                  Gérer
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(w.id)}
                  aria-label="Supprimer l'atelier"
                  className="h-10 w-10 text-destructive hover:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </>
            ) : isPast ? (
              <Button
                nativeButton={false}
                render={<Link href={`/ateliers/${w.id}`} />}
                variant="outline"
                size="sm"
                className="h-10 w-full"
              >
                Voir les détails
              </Button>
            ) : isFull && !part ? (
              <Button variant="outline" size="sm" className="h-10 w-full" disabled>
                Complet
              </Button>
            ) : part ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLeave(w.id)}
                className="h-10 flex-1"
              >
                <UserMinusIcon className="size-3.5" />
                Quitter
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleJoin(w.id)}
                className="h-10 flex-1"
              >
                <UserPlusIcon className="size-3.5" />
                Rejoindre
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  function SkeletonCard() {
    return (
      <Card>
        <div className="h-28 animate-pulse rounded-t-xl bg-muted" />
        <CardContent className="space-y-3 p-4">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-9 w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  function StatCard({
    label,
    value,
    sub,
  }: {
    label: string;
    value: string | number;
    sub?: string;
  }) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="font-heading text-xl font-semibold">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </CardContent>
      </Card>
    );
  }

  const hasActiveFilters = filters.search || filters.seriesId;

  function FilterBar() {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un atelier..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="h-10 pl-9 pr-9"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, search: "" }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Effacer la recherche"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ search: "", seriesId: "" })}
              className="h-9 text-xs"
            >
              <XIcon className="mr-1 size-3.5" />
              Réinitialiser
            </Button>
          )}
            <Select
              value={filters.seriesId}
              onValueChange={(v) => setFilters((f) => ({ ...f, seriesId: v ?? "" }))}
            >
            <SelectTrigger className="h-10 w-auto sm:w-48">
              <SelectValue placeholder="Tous les programmes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les programmes</SelectItem>
              {seriesOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  function MobileFilters() {
    return (
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetTrigger render={<Button variant="outline" size="sm" className="h-10">
          <FilterIcon className="mr-2 size-4" />
          Filtres
          {hasActiveFilters && (
            <span className="ml-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
              !
            </span>
          )}
        </Button>} />
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filtrer les ateliers</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Rechercher</Label>
              <Input
                placeholder="Nom d'atelier..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Programme</Label>
              <Select
                value={filters.seriesId}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, seriesId: v ?? "" }));
                  setMobileFilterOpen(false);
                }}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Tous les programmes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les programmes</SelectItem>
                  {seriesOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({ search: "", seriesId: "" });
                  setMobileFilterOpen(false);
                }}
                className="w-full"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (loading && workshops.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                <div className="h-7 w-10 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="À venir"
          value={stats.upcomingCount}
        />
        <StatCard
          label="Participants"
          value={stats.totalParticipants}
        />
        <StatCard
          label="Cette semaine"
          value={stats.thisWeekCount}
        />
        <StatCard
          label="Prochain"
          value={
            stats.nextWorkshop
              ? `${formatDate(stats.nextWorkshop.startAt)} ${formatTime(stats.nextWorkshop.startAt)}`
              : "—"
          }
        />
      </div>

      {}
      <div className="flex items-center gap-3">
        <div className="hidden sm:block flex-1">
          <FilterBar />
        </div>
        <div className="sm:hidden flex-1">
          <MobileFilters />
        </div>
      </div>

      {}
      {loading && (
        <div className="flex justify-center py-2">
          <Loader2Icon className="size-4 animate-spin text-accent" />
        </div>
      )}

      {}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">À venir</h2>
          <span className="text-xs text-muted-foreground">
            {filteredUpcoming.length} atelier{filteredUpcoming.length > 1 ? "s" : ""}
          </span>
        </div>
        {filteredUpcoming.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CalendarDaysIcon className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {upcoming.length === 0
                  ? "Aucun atelier programmé pour le moment."
                  : "Aucun atelier ne correspond à votre recherche."}
              </p>
              {upcoming.length === 0 && isAdmin && (
                <Button
                  nativeButton={false}
                  render={<Link href="/ateliers/nouveau" />}
                  className="mt-4"
                  size="sm"
                >
                  <PlusIcon className="mr-1.5 size-3.5" />
                  Créer un atelier
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUpcoming.map((w) => (
              <WorkshopCard key={w.id} w={w} />
            ))}
          </div>
        )}
      </section>

      {}
      {past.length > 0 && (
        <section className="space-y-4 opacity-70">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-muted-foreground">
              Passés
            </h2>
            <span className="text-xs text-muted-foreground">
              {filteredPast.length} atelier{filteredPast.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPast.map((w) => (
              <WorkshopCard key={w.id} w={w} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
