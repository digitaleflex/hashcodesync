"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2Icon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  UsersIcon,
  ClockIcon,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import {
  HeatmapCard,
  RecommendationCard,
} from "@/components/scheduling-views";
import {
  UpcomingWorkshopsCard,
  type UpcomingWorkshop,
} from "@/components/dashboard/upcoming-workshops";
import {
  ActivityFeedCard,
  type ActivityItem,
} from "@/components/dashboard/activity-feed";
import { PersonalSummaryCard } from "@/components/dashboard/personal-summary";
import { WeekValidationBanner } from "@/components/dashboard/week-banner";

const roleLabels: Record<string, string> = {
  member: "Membre",
  mentor: "Mentor",
  admin: "Administrateur",
};

type CohortData = {
  heatmap: { day: number; hour: number; count: number }[];
  recommendation: {
    day: number;
    startTime: string;
    endTime: string;
    available: number;
    percent: number;
  }[];
  minHour: number;
  maxHour: number;
  totalMembers: number;
  referenceTimezone?: string;
};

export default function DashboardPage() {
  const { data, isPending } = authClient.useSession();

  const [availCount, setAvailCount] = useState<number | null>(null);
  const [weekValidated, setWeekValidated] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingWorkshop[]>([]);
  const [groupCount, setGroupCount] = useState<number | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [cohort, setCohort] = useState<CohortData & { has: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const role = data?.user?.role;
      const results = await Promise.allSettled([
        fetch("/api/availabilities"),
        fetch("/api/availabilities/validate"),
        fetch("/api/workshops"),
        fetch("/api/groups"),
        fetch("/api/notifications"),
        role === "mentor" || role === "admin"
          ? fetch("/api/mentor/scheduling?window=2")
          : Promise.resolve(null),
      ]);
      if (!active) return;

      const [avail, validation, ws, groups, notifs, scheduling] = results;

      if (avail.status === "fulfilled" && avail.value.ok) {
        const arr = await avail.value.json();
        if (Array.isArray(arr)) setAvailCount(arr.length);
      }
      if (validation.status === "fulfilled" && validation.value?.ok) {
        const v = await validation.value.json();
        if (v && typeof v.validated === "boolean") setWeekValidated(v.validated);
      }
      if (ws.status === "fulfilled" && ws.value.ok) {
        const list = await ws.value.json();
        if (Array.isArray(list)) {
          const now = Date.now();
          const future = list
            .filter((w) => new Date(w.endAt).getTime() >= now)
            .map((w) => ({
              id: w.id,
              title: w.title,
              startAt: w.startAt,
              endAt: w.endAt,
              series: w.series ?? null,
              participantCount: Array.isArray(w.participants)
                ? w.participants.length
                : 0,
            }));
          setUpcoming(future);
        }
      }
      if (groups.status === "fulfilled" && groups.value.ok) {
        const g = await groups.value.json();
        setGroupCount(
          Array.isArray(g.groups)
            ? g.groups.filter((x: { memberCount: number }) => x.memberCount > 0)
                .length
            : 0
        );
      }
      if (notifs.status === "fulfilled" && notifs.value.ok) {
        const n = await notifs.value.json();
        if (Array.isArray(n.notifications))
          setActivities(n.notifications.filter((x: any) => !x.read).slice(0, 6));
      }
      if (scheduling && scheduling.status === "fulfilled" && scheduling.value?.ok) {
        const s = await scheduling.value.json();
        setCohort({
          has: true,
          heatmap: s.heatmap ?? [],
          recommendation: s.recommendation ?? [],
          minHour: s.minHour,
          maxHour: s.maxHour,
          totalMembers: s.totalMembers,
          referenceTimezone: s.referenceTimezone,
        });
      }
    }
    if (data?.user) load();
    return () => {
      active = false;
    };
  }, [data?.user]);

  if (isPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-accent" />
      </div>
    );
  }

  const user = data?.user;
  const role = user?.role as string | undefined;
  const isLeader = role === "mentor" || role === "admin";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold">
            Bonjour {user?.firstname} 👋
          </h1>
          {user && (
            <Badge variant="secondary">
              {roleLabels[role as string] ?? "Membre"}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {isLeader
            ? "Vue d&apos;ensemble de la disponibilité de la cohorte et de vos prochaines sessions."
            : "Gérez vos disponibilités, retrouvez vos ateliers et restez synchronisé·e avec la cohorte."}
        </p>
      </div>

      <WeekValidationBanner weekValidated={weekValidated} availCount={availCount ?? 0} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<CalendarRangeIcon className="size-4 text-accent" />}
          label="Mes disponibilités"
          value={availCount === null ? "—" : availCount}
          footnote="pour la semaine en cours"
        />
        <StatCard
          icon={<CalendarDaysIcon className="size-4 text-accent" />}
          label="Ateliers à venir"
          value={upcoming.length}
          footnote="programmés ou à venir"
        />
        <StatCard
          icon={<UsersIcon className="size-4 text-accent" />}
          label="Mes groupes"
          value={groupCount === null ? "—" : groupCount}
          footnote="dont je suis membre"
        />
        <StatCard
          icon={<ClockIcon className="size-4 text-accent" />}
          label={isLeader ? "Cohorte couverte" : "Dernière activité"}
          value={
            isLeader
              ? cohort?.totalMembers ?? "—"
              : activities.length > 0
                ? activities.length
                : "—"
          }
          footnote={isLeader ? "membres renseignés" : "événements non lus"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {isLeader && cohort ? (
            <>
              <HeatmapCard
                heatmap={cohort.heatmap}
                minHour={cohort.minHour}
                maxHour={cohort.maxHour}
                totalMembers={cohort.totalMembers}
                refLabel={cohort.referenceTimezone}
              />
              <RecommendationCard
                recommendation={cohort.recommendation}
                totalMembers={cohort.totalMembers}
                description="Créneaux les plus propices selon les disponibilités de la cohorte."
              />
            </>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <ClockIcon className="size-5 shrink-0 text-accent" />
                    <div>
                      <p className="text-sm font-medium">
                        {availCount && availCount > 0
                          ? `${availCount} disponibilité·s renseignées cette semaine`
                          : "Aucune disponibilité renseignée cette semaine"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Renseignez vos créneaux pour aider la cohorte à se
                        synchroniser.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <UpcomingWorkshopsCard workshops={upcoming} compact />
        </div>

        <div className="space-y-6 lg:col-span-4">
          <PersonalSummaryCard availCount={availCount ?? 0} weekValidated={weekValidated} />
          <ActivityFeedCard activities={activities} />
        </div>
      </div>
    </div>
  );
}