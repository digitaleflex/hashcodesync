"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarRangeIcon, ChevronRightIcon } from "lucide-react";
import { formatHours } from "@/lib/format";
import type { AvailabilitySummary } from "@/components/profil/types";

export function AvailabilityCard({
  availability,
}: {
  availability: AvailabilitySummary;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent"
          >
            <CalendarRangeIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">Disponibilités</p>
            <p className="truncate text-sm text-muted-foreground">
              Vos créneaux hebdomadaires déclarés.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-end">
          <div>
            <p className="font-heading text-2xl font-semibold">
              {availability.hasData
                ? formatHours(availability.hours)
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">heures / semaine</p>
          </div>
          <div>
            <p className="font-heading text-2xl font-semibold">
              {availability.slots}
            </p>
            <p className="text-xs text-muted-foreground">créneau·x</p>
          </div>
          <Button
            nativeButton={false}
            render={<Link href="/disponibilites" />}
            className="ml-auto lg:ml-4"
          >
            Gérer mes disponibilités
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}