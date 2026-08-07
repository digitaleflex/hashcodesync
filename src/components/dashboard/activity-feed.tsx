"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActivityIcon, BellIcon } from "lucide-react";

export type ActivityItem = {
  id: string;
  type: string;
  title: string;
  message?: string | null;
  read: boolean;
  createdAt: string;
};

function fmtAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return min <= 1 ? "à l'instant" : `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  return `il y a ${days} j`;
}

export function ActivityFeedCard({
  activities,
}: {
  activities: ActivityItem[];
}) {
  const list = activities.slice(0, 6);
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ActivityIcon className="size-5 text-accent" />
            Activité récente
          </CardTitle>
          <CardDescription>
            Les derniers événements vous concernant.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune activité récente pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {list.map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <BellIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{a.title}</p>
                  {a.message && (
                    <p className="text-xs text-muted-foreground">{a.message}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {fmtAgo(a.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}