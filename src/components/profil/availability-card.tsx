"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarRangeIcon, ChevronRightIcon } from "lucide-react";
import type { AvailabilitySummary } from "@/components/profil/types";

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0").replace(/0$/, "")}`.trim();
}

export function AvailabilityCard({
  availability,
}: {
  availability: AvailabilitySummary;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarRangeIcon className="size-4 text-accent" />
          Disponibilités
        </CardTitle>
        <CardDescription>
          Vos créneaux hebdomadaires déclarés.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="font-heading text-3xl font-semibold">
              {availability.hasData
                ? formatHours(availability.hours)
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">heures / semaine</p>
          </div>
          <div>
            <p className="font-heading text-3xl font-semibold">
              {availability.slots}
            </p>
            <p className="text-xs text-muted-foreground">créneau·x</p>
          </div>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/disponibilites" />}
          variant="outline"
          className="mt-4 w-full"
        >
          Gérer mes disponibilités
          <ChevronRightIcon className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}