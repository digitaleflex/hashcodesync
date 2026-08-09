"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUpIcon, RefreshCwIcon } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

type WeekPoint = {
  weekStart: string;
  coveragePercent: number;
  totalMembers: number;
  totalAvailabilities: number;
};

type HistoryResponse = {
  weeks: WeekPoint[];
};

const DAY_NAMES_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatWeekLabel(iso: string) {
  const d = new Date(iso);
  const start = new Date(d);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (x: Date) => `${x.getDate()}/${x.getMonth() + 1}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

export function CoverageTrend({ groupId }: { groupId?: string }) {
  const [data, setData] = useState<WeekPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ weeks: "4" });
      if (groupId) params.set("groupId", groupId);
      const res = await fetch(`/api/admin/scheduling/history?${params}`);
      if (res.ok) {
        const json: HistoryResponse = await res.json();
        setData(json.weeks);
      } else {
        toast.error("Impossible de charger l'historique");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = useMemo(
    () =>
      data.map((w) => ({
        label: formatWeekLabel(w.weekStart),
        couverture: w.coveragePercent,
        membres: w.totalMembers,
        creneaux: w.totalAvailabilities,
      })),
    [data]
  );

  const latest = data[data.length - 1];
  const previous = data[data.length - 2];
  const delta = latest && previous ? latest.coveragePercent - previous.coveragePercent : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUpIcon className="size-5 text-accent" />
            Tendance de couverture
          </CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
          <RefreshCwIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Pas encore d'historique disponible. Les données apparaîtront après la première validation de semaine.
          </p>
        ) : (
          <div className="space-y-4">
            {latest && (
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Dernière semaine : </span>
                  <span className="font-medium">{latest.coveragePercent}%</span>
                </div>
                {delta !== null && (
                  <div className={`flex items-center gap-1 ${delta >= 0 ? "text-success" : "text-error"}`}>
                    <span>{delta >= 0 ? "+" : ""}{delta}%</span>
                    <span className="text-muted-foreground">vs semaine précédente</span>
                  </div>
                )}
              </div>
            )}
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value, name) => [
                      `${value}${name === "couverture" ? "%" : ""}`,
                      name === "couverture" ? "Couverture" : name === "membres" ? "Membres" : "Créneaux",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="couverture"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "var(--accent)" }}
                    activeDot={{ r: 6, fill: "var(--accent)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
