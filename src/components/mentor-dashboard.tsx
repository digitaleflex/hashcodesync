"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2Icon,
  UsersIcon,
  CalendarCheck2Icon,
  CalendarPlusIcon,
  SparklesIcon,
} from "lucide-react";
import {
  DAY_NAMES,
  DAY_NAMES_FULL,
  HeatmapCard,
  RecommendationCard,
} from "@/components/scheduling-views";
import { AttendanceNudgeCard } from "@/components/dashboard/attendance-nudge";

type HeatCell = { day: number; hour: number; count: number };
type Rec = {
  day: number;
  startTime: string;
  endTime: string;
  available: number;
  percent: number;
};
type Mentee = {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  reliability?: number;
  availabilities: { day: number; startTime: string; endTime: string }[];
};
type Workshop = {
  id: string;
  title: string;
  startAt: string;
  _count: { participants: number };
};

type GroupOption = { id: string; name: string; activityCount: number; memberCount: number };

type Data = {
  totalMembers: number;
  totalAvailabilities: number;
  minHour: number;
  maxHour: number;
  heatmap: HeatCell[];
  recommendation: Rec[];
  totalUsers: number;
  coverage: number;
  referenceTimezone?: string;
  mentees: Mentee[];
  upcomingWorkshops: Workshop[];
  groupName?: string;
  groups?: GroupOption[];
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function MentorDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowHours, setWindowHours] = useState(2);
  const [groupId, setGroupId] = useState("");

  const load = useCallback(async (window: number, gid: string) => {
    setLoading(true);
    const params = new URLSearchParams({ window: String(window) });
    if (gid) params.set("groupId", gid);
    const res = await fetch(`/api/mentor/scheduling?${params}`);
    if (res.ok) setData(await res.json());
    else toast.error("Impossible de charger le tableau de bord mentor");
    setLoading(false);
  }, []);

  useEffect(() => {
    load(windowHours, groupId);
  }, [load, windowHours, groupId]);

  const best = data?.recommendation[0];
  const groups = data?.groups ?? [];
  const selectedGroupName = data?.groupName ?? null;

  return (
    <div className="space-y-6">
      {loading || !data ? (
        <div className="flex items-center justify-center py-16">
          <Loader2Icon className="size-8 animate-spin text-accent" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {selectedGroupName
                ? `Groupe affiché : ${selectedGroupName}`
                : "Toutes la cohorte"}
            </p>
            <Select
              value={groupId}
              onValueChange={(v) => setGroupId(v ?? "")}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrer par groupe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les groupes</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name} ({g.memberCount} membre{g.memberCount > 1 ? "s" : ""})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AttendanceNudgeCard />

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="size-4 text-accent" />
                  Membres inscrits
                </CardTitle>
              </CardHeader>
              <CardContent className="font-heading text-3xl font-semibold">
                {data.totalUsers}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck2Icon className="size-4 text-accent" />
                  Cadence de dispo.
                </CardTitle>
              </CardHeader>
              <CardContent className="font-heading text-3xl font-semibold">
                {data.coverage}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  / {data.totalUsers}
                </span>
              </CardContent>
            </Card>
            <Card className={best ? "ring-accent/40" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SparklesIcon className="size-4 text-accent" />
                  Meilleur créneau
                </CardTitle>
              </CardHeader>
              <CardContent>
                {best ? (
                  <div className="space-y-1">
                    <p className="font-heading text-lg font-semibold">
                      {DAY_NAMES_FULL[best.day]} · {best.startTime}–{best.endTime}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {best.available} dispo ({best.percent} %)
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>
          </div>

          <HeatmapCard
            heatmap={data.heatmap}
            minHour={data.minHour}
            maxHour={data.maxHour}
            totalMembers={data.totalMembers}
            refLabel={data.referenceTimezone}
          />

          <RecommendationCard
            recommendation={data.recommendation}
            totalMembers={data.totalMembers}
            description="Créneaux les plus propices selon les disponibilités de la cohorte."
            actions={
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((w) => (
                  <Button
                    key={w}
                    size="sm"
                    variant={windowHours === w ? "default" : "outline"}
                    onClick={() => setWindowHours(w)}
                  >
                    {w}h
                  </Button>
                ))}
              </div>
            }
          />

          <div className="flex justify-end">
            <Button nativeButton={false} render={<Link href="/ateliers/nouveau" />}>
              <CalendarPlusIcon className="size-4" />
              Planifier un atelier
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarCheck2Icon className="size-5 text-accent" />
                  Mes ateliers à venir
                </CardTitle>
                <CardDescription>
                  Ateliers que vous avez créés et pas encore passés.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.upcomingWorkshops.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun atelier à venir.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.upcomingWorkshops.map((w) => (
                      <li
                        key={w.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{w.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {fmtDate(w.startAt)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {w._count.participants} inscrit
                          {w._count.participants > 1 ? "s" : ""}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UsersIcon className="size-5 text-accent" />
                  Disponibilités par membre
                </CardTitle>
                <CardDescription>
                  Créneaux renseignés par chaque membre de la cohorte.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[420px] overflow-y-auto pr-1">
                {data.mentees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun membre trouvé.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.mentees.map((m) => {
                      const n = m.availabilities.length;
                      return (
                        <li key={m.id} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              {m.firstname} {m.lastname}
                            </p>
                            {typeof m.reliability === "number" && (
                              <Badge
                                variant={
                                  m.reliability >= 80
                                    ? "default"
                                    : m.reliability >= 50
                                      ? "secondary"
                                      : "outline"
                                }
                                title="Fiabilité estimée (probabilité de présence)"
                              >
                                fiabilité {m.reliability}%
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <Badge variant="outline">
                              {n > 0 ? `${n} créneau${n > 1 ? "x" : ""}` : "Aucun créneau"}
                            </Badge>
                          </div>
                          {n > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {m.availabilities.map((a, i) => (
                                <span
                                  key={i}
                                  className="rounded-full bg-muted px-2 py-0.5 text-[11px]"
                                >
                                  {DAY_NAMES[a.day]} {a.startTime}–{a.endTime}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              {m.email}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}