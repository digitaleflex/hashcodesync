"use client";

import useSWR from "swr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { computeMassHours } from "@/lib/masse-horaire";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UsersIcon,
  PlusIcon,
  Trash2Icon,
  ClockIcon,
  SearchIcon,
  XIcon,
  Loader2Icon,
  CalendarRangeIcon,
  LogOutIcon,
  UserPlusIcon,
} from "lucide-react";

const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const TYPE_LABELS: Record<string, string> = {
  atelier: "Atelier",
  conference: "Conférence",
  lab: "Lab",
  autre: "Autre",
};
const ROLE_LABELS: Record<string, string> = {
  member: "Membre",
  manager: "Manager",
  admin: "Administrateur",
};

type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  coverImage?: string | null;
  memberCount: number;
  role: string | null;
  hoursPerWeek: number;
  joinStatus: string | null;
};

type MyGroup = {
  id: string;
  name: string;
  description: string | null;
  coverImage?: string | null;
  role: string;
  hoursPerWeek: number;
  memberCount: number;
  activities: { id: string; name: string; type: string }[];
};

type Availability = {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
  groupId: string | null;
  activityId: string | null;
  group?: { id: string; name: string } | null;
  activity?: { id: string; name: string } | null;
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Erreur réseau");
    return r.json();
  });

function CoverBanner({ src, name }: { src?: string | null; name: string }) {
  if (!src) return null;
  return (
    <div className="relative -mx-4 -mt-4 h-28 overflow-hidden rounded-t-xl bg-gradient-to-r from-accent/20 to-secondary">
      <img
        src={src}
        alt={`Image de couverture du groupe ${name}`}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-12 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

function GroupCardSkeleton() {
  return (
    <Card>
      <div className="h-28 animate-pulse rounded-t-xl bg-muted" />
      <CardContent className="p-4 space-y-3">
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-6 w-16 animate-pulse rounded bg-muted" />
          <div className="h-6 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-full animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

function DiscoverCardSkeleton() {
  return (
    <Card>
      <div className="h-28 animate-pulse rounded-t-xl bg-muted" />
      <CardContent className="p-4 space-y-3">
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

export function GroupsManager() {
  const { data: session } = authClient.useSession();
  const {
    data,
    mutate,
    isLoading,
    error,
  } = useSWR<{ groups: GroupSummary[]; myMemberships: MyGroup[] }>(
    "/api/groups",
    fetcher
  );

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [selectedActivityName, setSelectedActivityName] = useState("");
  const [day, setDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [posting, setPosting] = useState(false);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const availabilityRef = useRef<HTMLDivElement>(null);

  const groups = data?.groups ?? [];
  const myGroups = data?.myMemberships ?? [];
  const selectedGroup = myGroups.find((g) => g.id === selectedGroupId);

  const stats = useMemo(
    () => ({
      myCount: myGroups.length,
      memberCount: myGroups.reduce((sum, g) => sum + g.memberCount, 0),
      activityCount: myGroups.reduce((sum, g) => sum + g.activities.length, 0),
      totalHours: myGroups.reduce((sum, g) => sum + g.hoursPerWeek, 0),
    }),
    [myGroups]
  );

  const discoverGroups = useMemo(() => {
    let result = groups.filter((g) => !myGroups.find((mg) => mg.id === g.id));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.description ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [groups, myGroups, searchQuery]);

  const loadAvailability = useCallback(async () => {
    const query = selectedGroupId ? `?groupId=${selectedGroupId}` : "";
    const res = await fetch(`/api/availabilities${query}`);
    if (res.ok) setAvailabilities(await res.json());
  }, [selectedGroupId]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  async function requestJoin(groupId: string) {
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });
    if (res.ok) {
      toast.success("Demande d'accès envoyée");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Impossible d'envoyer la demande");
    }
    mutate();
  }

  async function leaveGroup(groupId: string) {
    await fetch(`/api/groups/${groupId}/membership`, { method: "DELETE" });
    toast.success("Vous avez quitté le groupe");
    if (selectedGroupId === groupId) {
      setSelectedGroupId("");
      setSelectedActivityId("");
    }
    setLeavingId(null);
    mutate();
  }

  async function addAvailability(e: React.FormEvent) {
    e.preventDefault();
    if (selectedGroupId && day === null) {
      toast.error("Choisissez un jour");
      return;
    }
    setPosting(true);
    const res = await fetch("/api/availabilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day,
        startTime,
        endTime,
        groupId: selectedGroupId || null,
        activityId: selectedActivityId || null,
      }),
    });
    setPosting(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erreur" }));
      toast.error(err.error ?? "Erreur lors de l'ajout");
      return;
    }
    await loadAvailability();
    setStartTime("");
    setEndTime("");
    toast.success("Disponibilité ajoutée");
  }

  async function deleteAvailability(id: string) {
    const res = await fetch(`/api/availabilities/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAvailabilities((prev) => prev.filter((a) => a.id !== id));
      toast.success("Disponibilité supprimée");
    } else {
      toast.error("Suppression impossible");
    }
  }

  function scrollToAvailability() {
    availabilityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const leavingGroup = myGroups.find((g) => g.id === leavingId);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les groupes.
        </p>
        <Button onClick={() => mutate()} variant="outline">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Mes groupes
            </p>
            <p className="font-heading text-2xl font-semibold">
              {isLoading ? "…" : stats.myCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Membres
            </p>
            <p className="font-heading text-2xl font-semibold">
              {isLoading ? "…" : stats.memberCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Activités
            </p>
            <p className="font-heading text-2xl font-semibold">
              {isLoading ? "…" : stats.activityCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Heures / sem
            </p>
            <p className="font-heading text-2xl font-semibold">
              {isLoading ? "…" : `${stats.totalHours}h`}
            </p>
          </CardContent>
        </Card>
      </div>

      {}
      <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Mes groupes</h2>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <GroupCardSkeleton key={i} />
            ))}
          </div>
        ) : myGroups.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <UsersIcon className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Vous ne faites encore partie d&apos;aucun groupe.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Découvrez des groupes ci-dessous et demandez à rejoindre.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myGroups.map((g) => (
              <Card key={g.id} className="flex flex-col">
                <CoverBanner src={g.coverImage} name={g.name} />
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <h3 className="font-medium">{g.name}</h3>
                    {g.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {g.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <UsersIcon className="size-3.5" />
                      {g.memberCount} membre{g.memberCount > 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarRangeIcon className="size-3.5" />
                      {g.activities.length} activité{g.activities.length > 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3.5" />
                      {g.hoursPerWeek}h/sem
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={g.role === "manager" ? "default" : "secondary"}
                    >
                      {ROLE_LABELS[g.role] ?? g.role}
                    </Badge>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedGroupId(g.id);
                          scrollToAvailability();
                        }}
                      >
                        Disponibilités
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setLeavingId(g.id)}
                        aria-label={`Quitter le groupe ${g.name}`}
                      >
                        <LogOutIcon className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {}
      <section ref={availabilityRef} className="space-y-4 scroll-mt-24">
        <h2 className="font-heading text-lg font-semibold">Mes disponibilités</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClockIcon className="size-5 text-accent" />
              Disponibilités par groupe
            </CardTitle>
            <CardDescription>
              Choisissez un groupe auquel vous êtes inscrit, puis une de ses
              activités si besoin, et indiquez vos créneaux.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Groupe</Label>
                <Select
                  value={selectedGroupId}
                  onValueChange={(v) => {
                    const found = myGroups.find((g) => g.id === v);
                    setSelectedGroupName(found?.name ?? "");
                    setSelectedGroupId(v ?? "");
                    setSelectedActivityId("");
                    setSelectedActivityName("");
                  }}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue render={<span>{selectedGroupName || "Choisir un groupe"}</span>} />
                  </SelectTrigger>
                  <SelectContent>
                    {myGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Activité (optionnel)</Label>
                <Select
                  value={selectedActivityId}
                  disabled={!selectedGroupId}
                  onValueChange={(v) => {
                    const activity = selectedGroup?.activities.find((a) => a.id === v);
                    setSelectedActivityName(activity?.name ?? "");
                    setSelectedActivityId(v ?? "");
                  }}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue render={<span>{selectedActivityName || "Toutes les activités"}</span>} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes les activités</SelectItem>
                    {selectedGroup?.activities.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedGroup && (
              <form onSubmit={addAvailability} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label>Jour</Label>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                    {DAY_SHORT.map((name, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setDay(i)}
                        aria-pressed={day === i}
                        className={`flex h-11 items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                          day === i
                            ? "border-accent bg-accent text-white shadow-sm"
                            : "border-border bg-background text-muted-foreground hover:border-accent/50 hover:text-foreground"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="start-time">Début</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <span className="pb-2.5 text-sm text-muted-foreground">
                    à
                  </span>
                  <div className="space-y-1.5">
                    <Label htmlFor="end-time">Fin</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <Button type="submit" disabled={posting} className="h-11">
                    {posting ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <PlusIcon />
                    )}
                    Ajouter
                  </Button>
                </div>
              </form>
            )}

            {selectedGroupId && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Créneaux pour {selectedGroup?.name}
                </p>
                {availabilities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun créneau renseigné
                    {selectedActivityId ? " pour cette activité" : ""}.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {availabilities.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-lg bg-background px-3 py-2.5 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{DAY_NAMES[a.day]}</span>
                          <span className="text-muted-foreground">
                            {a.startTime}–{a.endTime}
                          </span>
                          {a.activity && (
                            <Badge variant="outline" className="text-[10px]">
                              {a.activity.name}
                            </Badge>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteAvailability(a.id)}
                          aria-label="Supprimer le créneau"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2Icon className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-heading text-lg font-semibold">
            Découvrir des groupes
          </h2>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un groupe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 sm:w-64"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        </div>

        {discoverGroups.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Aucun groupe ne correspond à votre recherche."
                  : "Aucun groupe disponible pour le moment."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {discoverGroups.map((g) => {
              const isMember = !!g.role;
              const isPending = g.joinStatus === "pending";
              return (
                <Card key={g.id} className="flex flex-col">
                  <CoverBanner src={g.coverImage} name={g.name} />
                  <CardContent className="flex flex-1 flex-col gap-3 p-4">
                    <div>
                      <h3 className="font-medium">{g.name}</h3>
                      {g.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {g.description}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <UsersIcon className="mr-1 inline size-3.5" />
                      {g.memberCount} membre{g.memberCount > 1 ? "s" : ""}
                    </p>
                    <div className="mt-auto flex items-center gap-2">
                      {isPending && (
                        <Badge variant="outline">Demande en cours</Badge>
                      )}
                      {isMember && <Badge variant="secondary">Membre</Badge>}
                      {!isMember && !isPending && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => requestJoin(g.id)}
                        >
                          <UserPlusIcon className="mr-1.5 size-3.5" />
                          Demander l&apos;accès
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {}
      <Dialog open={!!leavingId} onOpenChange={(open) => !open && setLeavingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quitter le groupe</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir quitter &quot;{leavingGroup?.name}&quot;
              ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeavingId(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => leavingId && leaveGroup(leavingId)}
            >
              Quitter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
