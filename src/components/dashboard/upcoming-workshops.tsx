"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarDaysIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export const UpcomingWorkshopsCard = memo(function UpcomingWorkshopsCard({
  workshops,
  compact = false,
}: {
  workshops: UpcomingWorkshop[];
  compact?: boolean;
}) {
  const list = compact ? workshops.slice(0, 5) : workshops;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDaysIcon className="size-5 text-accent" />
          Prochains ateliers
        </CardTitle>
        <CardDescription>
          S&apos;organisent autour de vos disponibilités.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun atelier programmé pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {list.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{w.title}</p>
                    {w.series && (
                      <Badge variant="secondary" className="shrink-0">
                        {w.series.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(w.startAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                  <UsersIcon className="size-4" />
                  {w.participantsCount ?? 0}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Button
          nativeButton={false}
          render={<Link href="/ateliers" />}
          variant="ghost"
          className="mt-3 w-full justify-center"
        >
          Voir toutes les ateliers
        </Button>
      </CardContent>
    </Card>
  );
});

export type UpcomingWorkshop = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  series?: { name: string } | null;
  participantsCount?: number;
};