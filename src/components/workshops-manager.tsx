"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/format";
import {
  Loader2Icon,
  PlusIcon,
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon,
  Trash2Icon,
  CalendarDaysIcon,
  PencilIcon,
} from "lucide-react";

export type PublicWorkshop = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  createdBy: string;
  series?: { id: string; name: string } | null;
  creator: { id: string; name: string; email: string };
  participants: {
    id: string;
    userId: string;
    status: string;
    user: { id: string; name: string; email: string };
  }[];
  attendance?: { id: string; userId: string; status: string }[];
};

export function WorkshopsManager({ initial }: { initial: PublicWorkshop[] }) {
  const { data } = authClient.useSession();
  const [workshops, setWorkshops] = useState(initial);
  const [loading, setLoading] = useState(false);

  const me = data?.user;

  const reload = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/workshops");
    if (res.ok) setWorkshops(await res.json());
    else toast.error("Impossible de charger les ateliers");
    setLoading(false);
  }, []);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    return {
      upcoming: workshops
        .filter((w) => new Date(w.endAt).getTime() >= now)
        .sort((a, b) => a.startAt.localeCompare(b.startAt)),
      past: workshops
        .filter((w) => new Date(w.endAt).getTime() < now)
        .sort((a, b) => b.startAt.localeCompare(a.startAt)),
    };
  }, [workshops]);

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

  function ActionButtons({ w }: { w: PublicWorkshop }) {
    const part = participation(w);
    const isCreator = me?.id && w.createdBy === me.id;
    if (isCreator) {
      return (
        <div className="flex gap-2">
          <Button
            nativeButton={false}
            render={<Link href={`/ateliers/${w.id}`} />}
            variant="outline"
            size="sm"
          >
            <PencilIcon /> Gérer
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleDelete(w.id)}
            aria-label="Supprimer"
          >
            <Trash2Icon className="text-destructive" />
          </Button>
        </div>
      );
    }
    return part ? (
      <Button variant="outline" size="sm" onClick={() => handleLeave(w.id)}>
        <UserMinusIcon /> Quitter
      </Button>
    ) : (
      <Button size="sm" onClick={() => handleJoin(w.id)}>
        <UserPlusIcon /> Rejoindre
      </Button>
    );
  }

  function WorkshopCard({ w }: { w: PublicWorkshop }) {
    const part = participation(w);
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {w.title}
                {w.series && (
                  <Badge
                    variant="secondary"
                    className="ml-2 align-middle font-normal"
                  >
                    <CalendarDaysIcon className="mr-1 size-3" />
                    {w.series.name}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {formatDate(w.startAt)} · {formatTime(w.startAt)} –{" "}
                {formatTime(w.endAt)}
              </CardDescription>
            </div>
            <Badge variant={part ? "default" : "secondary"}>
              {part ? "Inscrit" : "Non inscrit"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {w.description && (
            <p className="text-sm text-muted-foreground">{w.description}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <UsersIcon className="size-4" />
                {w.participants.length} participant
                {w.participants.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <CardFooter className="justify-end">
            <ActionButtons w={w} />
          </CardFooter>
        </CardContent>
      </Card>
    );
  }

  function Section({
    title,
    items,
    empty,
  }: {
    title: string;
    items: PublicWorkshop[];
    empty: string;
  }) {
    return (
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((w) => (
              <WorkshopCard key={w.id} w={w} />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {loading && (
        <div className="flex justify-center py-2">
          <Loader2Icon className="size-4 animate-spin text-accent" />
        </div>
      )}
      <Section
        title="À venir"
        items={upcoming}
        empty="Aucun atelier à venir. Créez le premier !"
      />
      {past.length > 0 && (
        <Section
          title="Passés"
          items={past}
          empty=""
        />
      )}
    </div>
  );
}