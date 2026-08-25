"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  UsersIcon,
  CalendarRangeIcon,
  CalendarPlusIcon,
} from "lucide-react";
import { DAY_NAMES_FULL, HeatmapCard, RecommendationCard } from "@/components/scheduling-views";
import { StatCard } from "@/components/ui/stat-card";
import {
  BestRecommendationHero,
  InsightsList,
  type BestSlot,
} from "@/components/admin/cockpit";
import { useAdminInsights, type AdminGroup } from "@/components/admin/use-admin-insights";
import { CoverageTrend } from "@/components/admin/coverage-trend";
import { CellDrillDown } from "@/components/admin/cell-drilldown";
import { GapTimeline } from "@/components/admin/gap-timeline";
import { AdminExportBar } from "@/components/admin/admin-export";
import { SeriesPlannerDialog } from "@/components/admin/series-planner-dialog";

type Rec = {
  day: number;
  startTime: string;
  endTime: string;
  available: number;
  percent: number;
  expectedAttendance?: number;
  coveragePercent?: number;
  memberCount?: number;
  factors?: RecFactor[];
};

type RecFactor = { kind: string; label: string; detail: string };

type GroupOption = { id: string; name: string; activityCount: number; memberCount: number };

type Data = {
  totalMembers: number;
  totalAvailabilities: number;
  windowHours: number;
  minHour: number;
  maxHour: number;
  heatmap: { day: number; hour: number; count: number; memberCount?: number }[];
  heatmapSmoothed?: { day: number; hour: number; count: number }[];
  recommendation: Rec[];
  referenceTimezone?: string;
  weekStart?: string;
  groupName?: string;
  maxSlotsPerUser?: number;
  groups?: GroupOption[];
};

type GapData = {
  gaps: { day: number; dayName: string; gaps: { startHour: number; endHour: number; duration: number }[] }[];
  minHour: number;
  maxHour: number;
  totalMembers: number;
  totalAvailabilities: number;
};

const DEFAULT_GROUP_ID = "";
const DEFAULT_WINDOW = 2;

export function SchedulingDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [groupsData, setGroupsData] = useState<AdminGroup[]>([]);
  const [gapsData, setGapsData] = useState<GapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gapsLoading, setGapsLoading] = useState(true);
  const [windowHours, setWindowHours] = useState(DEFAULT_WINDOW);
  const [groupId, setGroupId] = useState(DEFAULT_GROUP_ID);
  const [selectedCell, setSelectedCell] = useState<{ day: number; hour: number } | null>(null);
  const [showSmoothed, setShowSmoothed] = useState(false);
  const [showGaps, setShowGaps] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [requiresMentor, setRequiresMentor] = useState(false);
  const [capacity, setCapacity] = useState("");

  const load = useCallback(async (window: number, gid: string, mentor: boolean, cap: string) => {
    setLoading(true);
    const params = new URLSearchParams({ window: String(window), smooth: "true" });
    if (gid) params.set("groupId", gid);
    if (mentor) params.set("mentor", "true");
    if (cap && Number(cap) > 0) params.set("capacity", cap);
    const res = await fetch(`/api/admin/scheduling?${params}`);
    if (res.ok) setData(await res.json());
    else toast.error("Impossible de charger les statistiques");
    setLoading(false);
  }, []);

  const loadGaps = useCallback(async (window: number, gid: string) => {
    setGapsLoading(true);
    const params = new URLSearchParams({ window: String(window) });
    if (gid) params.set("groupId", gid);
    const res = await fetch(`/api/admin/scheduling/gaps?${params}`);
    if (res.ok) setGapsData(await res.json());
    setGapsLoading(false);
  }, []);

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
    load(windowHours, groupId, requiresMentor, capacity);
  }, [load, windowHours, groupId, requiresMentor, capacity]);

  useEffect(() => {
    loadGaps(windowHours, groupId);
  }, [loadGaps, windowHours, groupId]);

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
    // Dénominateur dynamique : créneaux max déclarés par membre (même référence
    // que /api/admin/scheduling/history), borné à 100. Plus de constante « 40 ».
    const maxPerUser = data?.maxSlotsPerUser ?? 1;
    if (!total || !maxPerUser) return 0;
    return Math.min(100, (avail / (total * maxPerUser)) * 100);
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
    const windowHours = r ? data.windowHours ?? DEFAULT_WINDOW : DEFAULT_WINDOW;
    const start = nextOccurrence(day, time);
    const end = new Date(start.getTime() + windowHours * 3600000);
    const q = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
    router.push(`/ateliers/nouveau?${q}`);
  }

  function handleCellSelect(day: number, hour: number) {
    setSelectedCell(day === selectedCell?.day && hour === selectedCell?.hour ? null : { day, hour });
  }

  const highlightCell =
    selectedCell ?? (best ? { day: best.day, hour: Number(best.startTime.split(":")[0]) } : null);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2Icon className="size-8 animate-spin text-accent" />
      </div>
    );
  }

  const hasNoAvailabilities = data.totalAvailabilities === 0;

  return (
    <div className="space-y-6">
      {hasNoAvailabilities && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium">Aucune disponibilité renseignée</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Les données apparaîtront lorsque les membres auront rempli leurs créneaux.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {selectedGroupName
            ? `Groupe affiché : ${selectedGroupName}`
            : "Toutes les cohortes"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={requiresMentor}
              onChange={(e) => {
                setRequiresMentor(e.target.checked);
                setSelectedCell(null);
              }}
              className="size-3.5 accent-[var(--accent)]"
            />
            Atelier avec mentor
          </label>
          <label className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs text-muted-foreground">
            Capacité
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => {
                setCapacity(e.target.value);
                setSelectedCell(null);
              }}
              placeholder="—"
              className="w-16 rounded bg-muted px-1.5 py-0.5 text-xs text-foreground"
            />
          </label>
          <Select
            value={groupId}
            onValueChange={(v) => {
              setGroupId(v ?? "");
              setSelectedCell(null);
            }}
          >
            <SelectTrigger className="w-48 sm:w-64">
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
          <SeriesPlannerDialog groups={groups} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Masquer les outils" : "Afficher les outils"}
            className="hidden sm:flex"
          >
            {sidebarOpen ? <PanelRightCloseIcon className="size-4" /> : <PanelRightOpenIcon className="size-4" />}
          </Button>
        </div>
      </div>

      {!hasNoAvailabilities && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<UsersIcon className="size-4 text-accent" />}
              label="Membres actifs"
              value={data.totalMembers}
              footnote="inscrits à la cohorte"
            />
            <StatCard
              icon={<CalendarRangeIcon className="size-4 text-accent" />}
              label="Couverture"
              value={`${Math.round(coveragePercent)}%`}
              footnote={`${data.totalAvailabilities} créneaux remplis`}
            />
            <StatCard
              icon={<CalendarRangeIcon className="size-4 text-accent" />}
              label="Créneaux renseignés"
              value={data.totalAvailabilities}
              footnote="créneaux cette semaine"
            />
            <StatCard
              icon={<CalendarPlusIcon className="size-4 text-accent" />}
              label="Durée cible"
              value={`${data.windowHours ?? DEFAULT_WINDOW}h`}
              footnote="par créneau"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className={sidebarOpen ? "lg:col-span-2 space-y-4" : "lg:col-span-3 space-y-4"}>
              <HeatmapCard
                heatmap={data.heatmap}
                minHour={data.minHour}
                maxHour={data.maxHour}
                totalMembers={data.totalMembers}
                refLabel={data.referenceTimezone}
                weekStart={data.weekStart}
                highlightCell={highlightCell}
                onCellSelect={handleCellSelect}
                heatmapSmoothed={data.heatmapSmoothed}
                showSmoothed={showSmoothed}
                gaps={gapsData?.gaps}
                showGaps={showGaps}
                description={
                  selectedCell
                    ? `${DAY_NAMES_FULL[selectedCell.day]} ${selectedCell.hour}:00 → ${selectedCell.hour + 1}:00 · créez un atelier ici. Le meilleur créneau est en surbrillance.`
                    : "Une couleur par jour, l'intensité = part de la cohorte disponible. Cliquez une cellule pour planifier à ce créneau."
                }
                title={
                  <div className="flex items-center gap-2">
                    <span>Heatmap des disponibilités</span>
                    {data.heatmapSmoothed && (
                      <Button
                        variant={showSmoothed ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowSmoothed(!showSmoothed)}
                      >
                        Lissage
                      </Button>
                    )}
                    {gapsData && gapsData.gaps.length > 0 && (
                      <Button
                        variant={showGaps ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowGaps(!showGaps)}
                      >
                        Zones creuses
                      </Button>
                    )}
                  </div>
                }
              />

              {best && (
                <BestRecommendationHero best={best} totalMembers={data.totalMembers} onPlan={handlePlan} />
              )}

              <RecommendationCard
                recommendation={data.recommendation.slice(0, 5)}
                totalMembers={data.totalMembers}
                onPlan={handlePlan}
                weekStart={data.weekStart}
                refTz={data.referenceTimezone}
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
            </div>

            {sidebarOpen && (
              <div className="space-y-4">
                <div className="hidden md:block">
                  <CoverageTrend groupId={groupId || undefined} />
                </div>
                {gapsData && !gapsLoading && (
                  <GapTimeline gaps={gapsData.gaps} minHour={gapsData.minHour} maxHour={gapsData.maxHour} />
                )}
                <AdminExportBar
                  heatmap={data.heatmap}
                  minHour={data.minHour}
                  maxHour={data.maxHour}
                  totalMembers={data.totalMembers}
                  groupName={selectedGroupName ?? undefined}
                  recommendation={data.recommendation}
                />
              </div>
            )}
          </div>

          {insights.length > 0 && <InsightsList insights={insights} />}
        </>
      )}

      <CellDrillDown
        cell={selectedCell}
        totalMembers={data.totalMembers}
        onClose={() => setSelectedCell(null)}
        onPlan={handlePlan}
      />
    </div>
  );
}
