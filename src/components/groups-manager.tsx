"use client";

import useSWR from "swr";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
  Loader2Icon,
  UsersIcon,
  PlusIcon,
  Trash2Icon,
  ClockIcon,
} from "lucide-react";

const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_NAMES = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const TYPE_LABELS: Record<string, string> = {
  atelier: "Atelier",
  conference: "Conférence",
  lab: "Lab",
  autre: "Autre",
};

type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  role: string | null;
  hoursPerWeek: number;
  joinStatus: string | null;
};

type MyGroup = {
  id: string;
  name: string;
  description: string | null;
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function GroupsManager() {
  const { data, mutate, isLoading } = useSWR<{
    groups: GroupSummary[];
    myMemberships: MyGroup[];
  }>("/api/groups", fetcher);

  // Formulaire de disponibilité : groupe + activité + heure.
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [day, setDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [posting, setPosting] = useState(false);

  const [availabilities, setAvailabilities] = useState<Availability[]>([]);

  const loadAvailability = useCallback(async () => {
    const query = selectedGroupId ? `?groupId=${selectedGroupId}` : "";
    const res = await fetch(`/api/availabilities${query}`);
    if (res.ok) setAvailabilities(await res.json());
  }, [selectedGroupId]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const selectedGroup = data?.myMemberships.find((g) => g.id === selectedGroupId);

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
    } else toast.error("Suppression impossible");
  }

  const groups = data?.groups ?? [];
  const myGroups = data?.myMemberships ?? [];

  return (
    <div className="space-y-6">
      {/* Disponibilités par groupe/activité */}
      <Card className="bg-secondary/40">
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
                  setSelectedGroupId(v ?? "");
                  setSelectedActivityId("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir un groupe" />
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
                onValueChange={(v) => setSelectedActivityId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Toutes les activités" />
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
                      className={`flex h-10 items-center justify-center rounded-lg border text-sm font-medium transition-all ${
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
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  aria-label="Heure de début"
                />
                <span className="pb-2 text-sm text-muted-foreground">à</span>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  aria-label="Heure de fin"
                />
                <Button type="submit" disabled={posting}>
                  {posting ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
                  Ajouter
                </Button>
              </div>
            </form>
          )}

          {/* Liste des disponibilités */}
          {selectedGroupId && (
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Créneaux pour {selectedGroup?.name}
              </p>
              {availabilities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun créneau renseigné{selectedActivityId ? " pour cette activité" : ""}.
                </p>
              ) : (
                availabilities.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm"
                  >
                    <span>
                      {DAY_NAMES[a.day]} · {a.startTime}–{a.endTime}
                      {a.activity && (
                        <Badge variant="outline" className="ml-2">
                          {a.activity.name}
                        </Badge>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteAvailability(a.id)}
                      aria-label="Supprimer"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mes groupes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UsersIcon className="size-5 text-accent" />
            Mes groupes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2Icon className="mx-auto my-8 animate-spin text-accent" />
          ) : myGroups.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Vous ne faites partie d&apos;aucun groupe. Faites une demande
              d&apos;accès dans la liste ci-dessous.
            </p>
          ) : (
            <div className="space-y-3">
              {myGroups.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{g.name}</p>
                      {g.role === "manager" && (
                        <Badge variant="secondary">Manager</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {g.memberCount} membre{g.memberCount > 1 ? "s" : ""} ·{" "}
                      {g.activities.length} activité{g.activities.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <ClockIcon className="mr-1 size-3.5" />
                      {g.hoursPerWeek} h/sem
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Découvrir des groupes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Découvrir des groupes</CardTitle>
          <CardDescription>
            Les groupes sont créés par les administrateurs et mentors. Faites une
            demande ; l&apos;équipe l&apos;acceptera.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun groupe disponible pour le moment.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.map((g) => {
                const isMember = !!g.role;
                const isPending = g.joinStatus === "pending";
                return (
                  <div
                    key={g.id}
                    className="flex flex-col gap-2 rounded-lg border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{g.name}</p>
                      <div className="flex items-center gap-1.5">
                        {isPending && (
                          <Badge variant="outline">Demande en cours</Badge>
                        )}
                        {isMember && <Badge variant="secondary">Membre</Badge>}
                      </div>
                    </div>
                    {g.description && (
                      <p className="text-sm text-muted-foreground">
                        {g.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {g.memberCount} membre{g.memberCount > 1 ? "s" : ""}
                    </p>
                    {!isMember && !isPending && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestJoin(g.id)}
                      >
                        Demander l&apos;accès
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}