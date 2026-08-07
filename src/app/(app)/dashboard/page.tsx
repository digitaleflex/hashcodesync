"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2Icon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  CalendarPlusIcon,
} from "lucide-react";

const roleLabels: Record<string, string> = {
  member: "Membre",
  mentor: "Mentor",
  admin: "Administrateur",
};

export default function DashboardPage() {
  const { data, isPending } = authClient.useSession();
  const [availCount, setAvailCount] = useState<number | null>(null);
  const [upcoming, setUpcoming] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const [availRes, workshopRes] = await Promise.all([
        fetch("/api/availabilities"),
        fetch("/api/workshops"),
      ]);
      if (!active) return;
      if (availRes.ok) {
        const arr = await availRes.json();
        setAvailCount(Array.isArray(arr) ? arr.length : 0);
      }
      if (workshopRes.ok) {
        const list = await workshopRes.json();
        const now = Date.now();
        const up = Array.isArray(list)
          ? list.filter((w) => new Date(w.endAt).getTime() >= now).length
          : 0;
        setUpcoming(up);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  if (isPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-accent" />
      </div>
    );
  }

  const user = data?.user;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold">
            Bonjour {user?.firstname} 👋
          </h1>
          {user && (
            <Badge variant="secondary">
              {roleLabels[user.role as string] ?? "Membre"}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Gérez vos disponibilités, retrouvez vos ateliers et restez synchronisé
          avec la cohorte.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarRangeIcon className="size-4 text-accent" />
              Mes créneaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold">
              {availCount === null ? "—" : availCount}
            </p>
            <p className="text-xs text-muted-foreground">
              disponibilité renseignée·s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDaysIcon className="size-4 text-accent" />
              Ateliers à venir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold">
              {upcoming === null ? "—" : upcoming}
            </p>
            <p className="text-xs text-muted-foreground">
              session progé
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarPlusIcon className="size-4 text-accent" />
              Planifier
            </CardTitle>
            <CardDescription>
              Proposez un atelier à la cohorte en un clic.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link href="/ateliers/nouveau" />}>
              <CalendarPlusIcon className="size-4" />
              Créer un atelier
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarRangeIcon className="size-4 text-accent" />
              Mes disponibilités
            </CardTitle>
            <CardDescription>
              Indiquez les créneaux où vous êtes disponible chaque semaine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link href="/disponibilites" />} variant="outline">
              Renseigner mes disponibilités
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDaysIcon className="size-4 text-accent" />
              Mes ateliers
            </CardTitle>
            <CardDescription>
              Consultez vos ateliers et séances de mentorat à venir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link href="/ateliers" />} variant="outline">
              Voir les ateliers
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}