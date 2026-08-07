"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClipboardCheckIcon, Loader2Icon } from "lucide-react";

type PastWorkshop = {
  id: string;
  title: string;
  startAt: string;
  pointed: boolean;
  attendees: number;
  participants: number;
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Nudge : encourage le mentor/admin à pointer la présence des ateliers passés
// récents pour affiner les recommandations bayésiennes (lecture seule).
export function AttendanceNudgeCard() {
  const [items, setItems] = useState<PastWorkshop[] | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/workshops");
        if (!res.ok) return;
        const list = await res.json();
        if (!Array.isArray(list)) return;
        const now = Date.now();
        const past = list
          .filter((w) => new Date(w.endAt).getTime() < now)
          .sort(
            (a, b) =>
              new Date(b.endAt).getTime() - new Date(a.endAt).getTime()
          )
          .slice(0, 5);

        const detailed = await Promise.all(
          past.map(async (w) => {
            try {
              const d = await fetch(`/api/workshops/${w.id}`);
              if (!d.ok) return null;
              const full = await d.json();
              const attendance = Array.isArray(full.attendance)
                ? full.attendance
                : [];
              const participants = Array.isArray(full.participants)
                ? full.participants.filter(
                    (p: { status: string }) => p.status === "accepted"
                  ).length
                : 0;
              return {
                id: w.id,
                title: w.title,
                startAt: w.startAt,
                pointed: attendance.length > 0,
                attendees: attendance.length,
                participants,
              } satisfies PastWorkshop;
            } catch {
              return null;
            }
          })
        );
        if (active)
          setItems(detailed.filter((x): x is PastWorkshop => x !== null));
      } catch {
        /* silencieux */
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  if (items === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheckIcon className="size-5 text-accent" />
            Feedback de présence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Loader2Icon className="size-5 animate-spin text-accent" />
        </CardContent>
      </Card>
    );
  }

  const unpointed = items.filter((w) => !w.pointed);
  if (unpointed.length === 0) return null;

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardCheckIcon className="size-5 text-accent" />
          Feedback de présence
        </CardTitle>
        <CardDescription>
          Cochez la présence des derniers ateliers pour affiner les
          recommandations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {unpointed.map((w) => (
            <li
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-warning/20 bg-background p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{w.title}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(w.startAt)} · {w.participants} participant
                  {w.participants > 1 ? "s" : ""} à pointer
                </p>
              </div>
              <Button
                nativeButton={false}
                render={<Link href={`/ateliers/${w.id}`} />}
                size="sm"
                variant="outline"
                className="shrink-0"
              >
                Pointer
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}