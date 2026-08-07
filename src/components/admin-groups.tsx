"use client";

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
  UsersIcon,
  CalendarRangeIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  CheckIcon,
  XIcon,
  UserPlusIcon,
  LockIcon,
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  atelier: "Atelier",
  conference: "Conférence",
  lab: "Lab",
  autre: "Autre",
};
const ACTIVITY_TYPE_OPTIONS = [
  { value: "atelier", label: "Atelier" },
  { value: "conference", label: "Conférence" },
  { value: "lab", label: "Lab" },
  { value: "autre", label: "Autre" },
];

type Creator = { id: string; firstname: string; lastname: string; email: string };

type GroupMember = {
  id: string;
  role: string;
  hoursPerWeek: number;
  reliability?: number;
  weekValidated?: boolean;
  weekValidatedAt?: string | null;
  joinedAt: string;
  user: Creator;
};

type GroupActivity = { id: string; name: string; type: string; description: string | null };

type JoinRequest = {
  id: string;
  status: string;
  user: Creator;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  creator: Creator;
  members: GroupMember[];
  activities: GroupActivity[];
  joinRequests: JoinRequest[];
  _count: { members: number; activities: number };
  totalHours: number;
};
export function AdminGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const res = await fetch("/api/admin/groups");
    if (res.ok) {
      setGroups(await res.json());
    } else {
      toast.error("Impossible de charger les groupes");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupBusy, setGroupBusy] = useState(false);

  const [activityInputs, setActivityInputs] = useState<Record<string, string>>({});
  const [activityTypes, setActivityTypes] = useState<Record<string, string>>({});
  const [activityBusy, setActivityBusy] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [removingActivity, setRemovingActivity] = useState<string | null>(null);
  const [decidingRequest, setDecidingRequest] = useState<string | null>(null);

  const post = useCallback(
    async (path: string, body: unknown, method = "POST") => {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Une erreur est survenue");
      }
      load();
      return res.ok;
    },
    [load]
  );

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setGroupBusy(true);
    const ok = await post("/api/admin/groups", {
      name: groupName,
      description: groupDescription,
    });
    setGroupBusy(false);
    if (ok) {
      toast.success("Groupe créé");
      setGroupName("");
      setGroupDescription("");
    }
  }

  async function addActivity(groupId: string) {
    const name = activityInputs[groupId] ?? "";
    if (!name.trim()) {
      toast.error("Le nom de l'activité est requis");
      return;
    }
    setActivityBusy(groupId);
    const ok = await post(
      `/api/admin/groups/${groupId}`,
      {
        name: name.trim(),
        type: activityTypes[groupId] ?? "atelier",
        description: "",
      },
      "POST"
    );
    setActivityBusy(null);
    if (ok) {
      toast.success("Activité ajoutée");
      setActivityInputs((prev) => ({ ...prev, [groupId]: "" }));
    }
  }

  async function removeMember(groupId: string, userId: string) {
    setRemovingMember(userId);
    const ok = await post(
      `/api/admin/groups/${groupId}/members/${userId}`,
      {},
      "DELETE"
    );
    setRemovingMember(null);
    if (ok) toast.success("Membre retiré");
  }

  async function removeActivity(groupId: string, activityId: string) {
    setRemovingActivity(activityId);
    const ok = await post(
      `/api/admin/groups/${groupId}/activities/${activityId}`,
      {},
      "DELETE"
    );
    setRemovingActivity(null);
    if (ok) toast.success("Activité supprimée");
  }

  async function decideRequest(groupId: string, requestId: string, status: "accepted" | "rejected") {
    setDecidingRequest(requestId);
    const ok = await post(
      `/api/admin/groups/${groupId}/join-requests/${requestId}`,
      { status },
      "PATCH"
    );
    setDecidingRequest(null);
    if (ok) toast.success(status === "accepted" ? "Demande acceptée" : "Demande refusée");
  }

  return (
    <div className="space-y-6">
      <Card className="bg-secondary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PlusIcon className="size-5 text-accent" />
            Nouveau groupe
          </CardTitle>
          <CardDescription>
            Créer un groupe pour que les utilisateurs puissent en demander
            l&apos;accès.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createGroup} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ex. Hackathon 2026"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Décrivez le groupe"
                />
              </div>
            </div>
            <Button type="submit" disabled={groupBusy}>
              {groupBusy ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
              Créer le groupe
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <Loader2Icon className="mx-auto my-12 animate-spin text-accent" />
      ) : groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun groupe pour le moment.
        </p>
      ) : (
        groups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UsersIcon className="size-5 text-accent" />
                {group.name}
              </CardTitle>
              <CardDescription>
                {group.description || "Aucune description"}
                <span className="mt-1 block text-xs text-muted-foreground">
                  Créé par {group.creator.firstname} {group.creator.lastname} ·{" "}
                  {group._count.members} membre{group._count.members > 1 ? "s" : ""} ·{" "}
                  {group._count.activities} activité{group._count.activities > 1 ? "s" : ""} ·{" "}
                  {group.totalHours} h/sem
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Activités */}
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <CalendarRangeIcon className="size-4 text-accent" />
                  Activités
                </p>
                {group.activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune activité pour ce groupe.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {group.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{activity.name}</span>
                          <Badge variant="secondary">
                            {TYPE_LABELS[activity.type] ?? activity.type}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeActivity(group.id, activity.id)}
                          disabled={removingActivity === activity.id}
                          aria-label="Supprimer l'activité"
                          className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                        >
                          {removingActivity === activity.id ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : (
                            <Trash2Icon className="size-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-40 flex-1 space-y-2">
                    <Label>Nom de l&apos;activité</Label>
                    <Input
                      value={activityInputs[group.id] ?? ""}
                      onChange={(e) =>
                        setActivityInputs((prev) => ({ ...prev, [group.id]: e.target.value }))
                      }
                      placeholder="Ex : Défi algorithme"
                      aria-label="Nom de l'activité"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={activityTypes[group.id] ?? "atelier"}
                      onValueChange={(v) =>
                        setActivityTypes((prev) => ({ ...prev, [group.id]: v ?? "atelier" }))
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activityBusy === group.id}
                    onClick={() => addActivity(group.id)}
                  >
                    {activityBusy === group.id ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <PlusIcon />
                    )}
                    Ajouter
                  </Button>
                </div>
              </div>

              {/* Membres */}
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <UsersIcon className="size-4 text-accent" />
                  Membres ({group.members.length})
                </p>
                {group.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun membre.</p>
                ) : (
                  <div className="space-y-2">
                    {group.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {member.user.firstname} {member.user.lastname}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {member.user.email}
                          </span>
                          <Badge variant="outline">
                            {member.hoursPerWeek} h/sem
                          </Badge>
                          {typeof member.reliability === "number" && (
                            <Badge
                              variant={
                                member.reliability >= 80
                                  ? "default"
                                  : member.reliability >= 50
                                    ? "secondary"
                                    : "outline"
                              }
                              title="Fiabilité estimée (probabilité de présence)"
                            >
                              fiabilité {member.reliability}%
                            </Badge>
                          )}
                          {member.weekValidated && (
                            <Badge
                              variant="secondary"
                              className="border-warning/50 text-warning"
                              title={
                                member.weekValidatedAt
                                  ? `Semaine validée le ${new Date(member.weekValidatedAt).toLocaleString("fr-FR")}`
                                  : "Semaine validée (disponibilités figées)"
                              }
                            >
                              <LockIcon className="mr-1 size-3" />
                              Semaine validée
                            </Badge>
                          )}
                          {member.role === "manager" && (
                            <Badge variant="secondary">Manager</Badge>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={removingMember === member.user.id}
                          onClick={() => removeMember(group.id, member.user.id)}
                          aria-label="Retirer le membre"
                          className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                        >
                          {removingMember === member.user.id ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : (
                            <Trash2Icon className="size-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Demandes d'accès */}
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <UserPlusIcon className="size-4 text-accent" />
                  Demandes d&apos;accès en attente ({group.joinRequests.length})
                </p>
                {group.joinRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
                ) : (
                  <div className="space-y-2">
                    {group.joinRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {request.user.firstname} {request.user.lastname}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {request.user.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={decidingRequest === request.id}
                            onClick={() =>
                              decideRequest(group.id, request.id, "accepted")
                            }
                          >
                            {decidingRequest === request.id ? (
                              <Loader2Icon className="animate-spin" />
                            ) : (
                              <CheckIcon />
                            )}
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={decidingRequest === request.id}
                            onClick={() =>
                              decideRequest(group.id, request.id, "rejected")
                            }
                          >
                            <XIcon />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}