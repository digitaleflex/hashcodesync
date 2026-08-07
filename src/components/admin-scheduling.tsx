"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2Icon, SparklesIcon, UsersIcon, CalendarRangeIcon } from "lucide-react";
import { DAY_NAMES_FULL, HeatmapCard, RecommendationCard } from "@/components/scheduling-views";
import { StatCard } from "@/components/ui/stat-card";
import { AttendanceNudgeCard } from "@/components/dashboard/attendance-nudge";

type Rec = {
  day: number;
  startTime: string;
  endTime: string;
  available: number;
  percent: number;
};

type GroupOption = { id: string; name: string; activityCount: number; memberCount: number };

type Data = {
  totalMembers: number;
  totalAvailabilities: number;
  windowHours: number;
  minHour: number;
  maxHour: number;
  heatmap: { day: number; hour: number; count: number }[];
  recommendation: Rec[];
  referenceTimezone?: string;
  groupName?: string;
  groups?: GroupOption[];
};

export function SchedulingDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowHours, setWindowHours] = useState(2);
  const [groupId, setGroupId] = useState("");

  const load = useCallback(async (window: number, gid: string) => {
    setLoading(true);
    const params = new URLSearchParams({ window: String(window) });
    if (gid) params.set("groupId", gid);
    const res = await fetch(`/api/admin/scheduling?${params}`);
    if (res.ok) setData(await res.json());
    else toast.error("Impossible de charger les statistiques");
    setLoading(false);
  }, []);

  useEffect(() => {
    load(windowHours, groupId);
  }, [load, windowHours, groupId]);

  const best = data?.recommendation[0];
  const groups = data?.groups ?? [];
  const selectedGroupName = data?.groupName ?? null;

  function nextOccurrence(day: number, time: string) {
    const [h, m] = time.split(":").map(Number);
    const now = new Date();
    const diff = (day - (now.getDay() + 6) % 7 + 7) % 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, h, m);
    if (start.getTime() <= Date.now()) start.setDate(start.getDate() + 7);
    return start;
  }

  function handlePlan(time: string, day: number) {
    if (!data) return;
    const r = data.recommendation.find((x) => x.startTime === time && x.day === day);
    if (!r) return;
    const start = nextOccurrence(day, time);
    const end = new Date(start.getTime() + data.windowHours * 3600000);
    const q = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
    });
    router.push(`/ateliers/nouveau?${q}`);
  }

  const highlightCell = best
    ? { day: best.day, hour: Number(best.startTime.split(":")[0]) }
    : null;

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
                : "Toutes les cohortes"}
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
            <StatCard
              icon={<UsersIcon className="size-4 text-accent" />}
              label="Membres actifs"
              value={data.totalMembers}
            />
            <StatCard
              icon={<CalendarRangeIcon className="size-4 text-accent" />}
              label="Créneaux renseignés"
              value={data.totalAvailabilities}
            />
            <Card className={best ? "ring-accent/40" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SparklesIcon className="size-4 text-accent" />
                  Meilleur créneau
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {best ? (
                  <>
                    <div className="space-y-1">
                      <p className="font-heading text-lg font-semibold">
                        {DAY_NAMES_FULL[best.day]} · {best.startTime}–{best.endTime}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ≈ {best.available} présent attendu{best.available > 1 ? "s" : ""} ·
                        {best.percent}% (assiduité des membres comptée)
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handlePlan(best.startTime, best.day)}>
                      <SparklesIcon className="size-3.5" />
                      Planifier
                    </Button>
                  </>
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
            highlightCell={highlightCell}
          />

          <RecommendationCard
            recommendation={data.recommendation}
            totalMembers={data.totalMembers}
            onPlan={handlePlan}
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
        </>
      )}
    </div>
  );
}