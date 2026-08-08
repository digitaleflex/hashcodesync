"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2Icon,
  Trash2Icon,
  CalendarDaysIcon,
  UsersIcon,
  SearchIcon,
  XIcon,
  CopyIcon,
  UserPlusIcon,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/format";
import { PublicWorkshop } from "@/components/workshops-manager";

export function AdminWorkshopsManager() {
  const [workshops, setWorkshops] = useState<PublicWorkshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistWorkshopId, setWaitlistWorkshopId] = useState<string | null>(null);
  const [waitlistItems, setWaitlistItems] = useState<Array<{ id: string; user: { id: string; name: string } }>>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/workshops");
    if (res.ok) {
      const data = await res.json();
      setWorkshops(data);
    } else {
      toast.error("Impossible de charger les ateliers");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openWaitlist(workshopId: string) {
    setWaitlistWorkshopId(workshopId);
    setWaitlistLoading(true);
    const res = await fetch(`/api/admin/workshops/${workshopId}/waitlist`);
    if (res.ok) {
      const data = await res.json();
      setWaitlistItems(data);
    } else {
      toast.error("Impossible de charger la liste d'attente");
    }
    setWaitlistLoading(false);
    setWaitlistOpen(true);
  }

  async function promoteWaitlistUser(workshopId: string, userId: string) {
    const res = await fetch(`/api/admin/workshops/${workshopId}/waitlist/${userId}/promote`, {
      method: "POST",
    });
    if (res.ok) {
      toast.success("Utilisateur promu en participant");
      openWaitlist(workshopId);
      load();
    } else {
      const err = await res.json().catch(() => ({ error: "Erreur" }));
      toast.error(err.error ?? "Action impossible");
    }
  }

  async function removeWaitlistUser(workshopId: string, userId: string) {
    const res = await fetch(`/api/admin/workshops/${workshopId}/waitlist/${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Utilisateur retiré de la liste d'attente");
      openWaitlist(workshopId);
    } else {
      toast.error("Action impossible");
    }
  }

  async function duplicateWorkshop(id: string) {
    const res = await fetch(`/api/workshops/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      toast.success("Atelier dupliqué");
      load();
    } else {
      const err = await res.json().catch(() => ({ error: "Erreur" }));
      toast.error(err.error ?? "Duplication impossible");
    }
  }

  const filtered = useMemo(() => {
    let result = workshops;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          (w.series?.name ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter && statusFilter !== "all") {
      const now = Date.now();
      result = result.filter((w) => {
        const end = new Date(w.endAt).getTime();
        if (statusFilter === "upcoming") return end >= now;
        if (statusFilter === "past") return end < now;
        return true;
      });
    }
    return result;
  }, [workshops, search, statusFilter]);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer définitivement cet atelier ?")) return;
    setDeletingId(id);
    const res = await fetch(`/api/workshops/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      toast.success("Atelier supprimé");
      setWorkshops((prev) => prev.filter((w) => w.id !== id));
    } else {
      toast.error("Suppression impossible");
    }
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

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Rechercher un atelier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-transparent pl-9 pr-9 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-auto sm:w-40">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="upcoming">À venir</SelectItem>
              <SelectItem value="past">Passés</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CalendarDaysIcon className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {search || statusFilter !== "all"
                  ? "Aucun atelier ne correspond à votre recherche."
                  : "Aucun atelier programmé."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((w) => {
              const isPast = new Date(w.endAt).getTime() < Date.now();
              return (
                <Card key={w.id} className="flex flex-col">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {w.series && (
                          <Badge variant="secondary" className="text-[10px] font-medium">
                            <CalendarDaysIcon className="mr-1 size-3" />
                            {w.series.name}
                          </Badge>
                        )}
                      </div>
                      <Badge
                        variant={isPast ? "secondary" : "default"}
                        className="text-[10px] font-medium"
                      >
                        {isPast ? "Terminé" : "À venir"}
                      </Badge>
                    </div>
                    <CardTitle className="text-base leading-snug">
                      {w.title}
                    </CardTitle>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(w.startAt)} · {formatTime(w.startAt)} – {formatTime(w.endAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Par {w.creator.name}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <UsersIcon className="size-3.5" />
                      <span>
                        {w.participants.length} participant{w.participants.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <Button
                        nativeButton={false}
                        render={<Link href={`/ateliers/${w.id}`} />}
                        variant="outline"
                        size="sm"
                        className="h-10 flex-1"
                      >
                        Voir
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => duplicateWorkshop(w.id)}
                        aria-label="Dupliquer l'atelier"
                        className="h-10 w-10"
                      >
                        <CopyIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openWaitlist(w.id)}
                        aria-label="Liste d'attente"
                        className="h-10 w-10"
                      >
                        <UserPlusIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(w.id)}
                        disabled={deletingId === w.id}
                        aria-label="Supprimer l'atelier"
                        className="h-10 w-10 text-destructive hover:text-destructive"
                      >
                        {deletingId === w.id ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <Trash2Icon className="size-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={waitlistOpen} onOpenChange={setWaitlistOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liste d'attente</DialogTitle>
            <DialogDescription>
              Utilisateurs en attente pour cet atelier.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {waitlistLoading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : waitlistItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune personne en attente.</p>
            ) : (
              <ul className="space-y-2">
                {waitlistItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between rounded-lg border p-2">
                    <span className="text-sm">{item.user.name}</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => waitlistWorkshopId && promoteWaitlistUser(waitlistWorkshopId, item.user.id)}
                      >
                        Promouvoir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => waitlistWorkshopId && removeWaitlistUser(waitlistWorkshopId, item.user.id)}
                      >
                        Retirer
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
