"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  CalendarRangeIcon,
  CalendarPlusIcon,
} from "lucide-react";
import { DAY_NAMES_FULL, HeatmapCard, RecommendationCard } from "@/components/scheduling-views";
import { StatCard } from "@/components/ui/stat-card";
import { AttendanceNudgeCard } from "@/components/dashboard/attendance-nudge";
import {
  BestRecommendationHero,
  InsightsList,
  MetricDonut,
  type BestSlot,
} from "@/components/admin/cockpit";
import { useAdminInsights, type AdminGroup } from "@/components/admin/use-admin-insights";

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

const DEFAULT_GROUP_ID = "";
const DEFAULT_WINDOW = 2;

export function SchedulingDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [groupsData, setGroupsData] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowHours, setWindowHours] = useState(DEFAULT_WINDOW);
  const [groupId, setGroupId] = useState(DEFAULT_GROUP_ID);
  const [selectedCell, setSelectedCell] = useState<{ day: number; hour: number } | null>(null);

  const load = useCallback(async (window: number, gid: string) => {
    setLoading(true);
    const params = new URLSearchParams({ window: String(window) });
    if (gid) params.set("groupId", gid);
    const res = await fetch(`/api/admin/scheduling?${params}`);
    if (res.ok) setData(await res.json());
    else toast.error("Impossible de charger les statistiques");
    setLoading(false);
  }, []);

  // Second appel lecture seule : membres/groupes pour le nudge d'insights.
  useEffect(() => {
    let active = true;
    fetch("/api/admin/groups")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (active && Array.isArray(list)) setGroupsData(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    load(windowHours, groupId);
  }, [load, windowHours, groupId]);

  const best: BestSlot | null = data?.recommendation[0]
    ? {
        day: data.recommendation[0].day,
        startTime: data.recommendation[0].startTime,
        endTime: data.recommendation[0].endTime,
        available: data.recommendation[0].available,
        percent: data.recommendation[0].percent,
      }
    : null;
  const groups = data?.groups ?? [];
  const selectedGroupName = data?.groupName ?? null;

  const coveragePercent = useMemo(() => {
    const total = data?.totalMembers ?? 0;
    const avail = data?.totalAvailabilities ?? 0;
    if (!total) return 0;
    return (avail / (total * 40)) * 100;
  }, [data]);

  const insights = useAdminInsights({
    totalMembers: data?.totalMembers ?? 0,
    totalAvailabilities: data?.totalAvailabilities ?? 0,
    coveragePercent,
    groups: groupsData,
  });

  function nextOccurrence(day: number, time: string) {
    const [h, m] = time.split(":").map(Number);
    const now = new Date();
    const diff = (day - ((now.getDay() + 6) % 7) + 7) % 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, h, m);
    if (start.getTime() <= Date.now()) start.setDate(start.getDate() + 7);
    return start;
  }

  function handlePlan(time: string, day: number) {
    if (!data) return;
    const r = data.recommendation.find((x) => x.startTime === time && x.day === day);
    if (!r) return;
    const start = nextOccurrence(day, time);
    const end = new Date(start.getTime() + (data.windowHours || DEFAULT_WINDOW) * 3600000);
    const q = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
    router.push(`/ateliers/nouveau?${q}`);
  }

  // Interaction heatmap : sélectionner une cellule → propose de planifier à ce créneau.
  function handleCellSelect(day: number, hour: number) {
    setSelectedCell(day === selectedCell?.day && hour === selectedCell?.hour ? null : { day, hour });
  }

  const highlightCell =
    selectedCell ?? (best ? { day: best.day, hour: Number(best.startTime.split(":")[0]) } : null);

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
              onValueChange={(v) => {
                setGroupId(v ?? "");
                setSelectedCell(null);
              }}
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

          {/* 1. Décision principale : meilleur créneau */}
          {best ? (
            <BestRecommendationHero best={best} totalMembers={data.totalMembers} onPlan={handlePlan} />
          ) : (
            <AttendanceNudgeCard />
          )}

          {/* 2. KPI décisionnels (4 max) */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<UsersIcon className="size-4 text-accent" />}
              label="Membres"
              value={data.totalMembers}
              footnote="inscrits à la cohorte"
            />
            <StatCard
              icon={<CalendarRangeIcon className="size-4 text-accent" />}
              label="Cohorte couverte"
              value={<MetricDonut value={coveragePercent} tone="success" label="couverture" size={64} />}
              footnote={`${data.totalAvailabilities} créneaux renseignés`}
            />
            <StatCard
              icon={<UsersIcon className="size-4 text-accent" />}
              label="Groupes affichés"
              value={groups.length}
              footnote={`${groups.filter((g) => g.memberCount > 0).length} avec membres`}
            />
            <StatCard
              icon={<CalendarPlusIcon className="size-4 text-accent" />}
              label="Fenêtre"
              value={`${data.windowHours ?? DEFAULT_WINDOW}h`}
              footnote="durée des créneaux"
            />
          </div>

          {/* 3. Heatmap interactive (cœur) + fenêtre */}
          <HeatmapCard
            heatmap={data.heatmap}
            minHour={data.minHour}
            maxHour={data.maxHour}
            totalMembers={data.totalMembers}
            refLabel={data.referenceTimezone}
            highlightCell={highlightCell}
            onCellSelect={handleCellSelect}
            description={
              selectedCell
                ? `${DAY_NAMES_FULL[selectedCell.day]} ${selectedCell.hour}:00 → ${selectedCell.hour + 1}:00 · créez un atelier ici. Le meilleur créneau est en surbrillance.`
                : "Une couleur par jour, l'intensité = part de la cohorte disponible. Cliquez une cellule pour planifier à ce créneau."
            }
          />

          {/* 5. Insights (décisionnels, proposent des actions) */}
          {insights.length > 0 && <InsightsList insights={insights} />}

          {/* 6. Recommandations (classement complet) */}
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