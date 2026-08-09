"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarPlusIcon, UsersIcon } from "lucide-react";
import { DAY_NAMES_FULL } from "@/components/scheduling-views";
import { MetricDonut } from "@/components/admin/cockpit";

type Member = {
  id: string;
  name: string;
  email: string;
  weight: number;
};

type CellResponse = {
  day: number;
  hour: number;
  total: number;
  members: Member[];
  referenceTimezone: string;
};

export function CellDrillDown({
  cell,
  totalMembers,
  onClose,
  onPlan,
}: {
  cell: { day: number; hour: number } | null;
  totalMembers: number;
  onClose: () => void;
  onPlan?: (time: string, day: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CellResponse | null>(null);

  useEffect(() => {
    if (!cell) return;
    setLoading(true);
    setData(null);
    const params = new URLSearchParams({
      day: String(cell.day),
      hour: String(cell.hour),
    });
    fetch(`/api/admin/scheduling/cell?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) setData(json);
      })
      .finally(() => setLoading(false));
  }, [cell]);

  const label = useMemo(() => {
    if (!cell) return "";
    return `${DAY_NAMES_FULL[cell.day]} ${cell.hour}:00 → ${cell.hour + 1}:00`;
  }, [cell]);

  const ratio = data ? data.total / Math.max(totalMembers, 1) : 0;

  return (
    <Dialog open={!!cell} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersIcon className="size-4 text-accent" />
            {label}
          </DialogTitle>
          <DialogDescription>
            Membres disponibles à ce créneau, classés par probabilité de présence.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <MetricDonut value={Math.round(ratio * 100)} tone="success" size={56} label="dispo" />
              <div className="text-sm">
                <p className="font-medium">{data.total} / {totalMembers} membres</p>
                <p className="text-muted-foreground">Fuseau : {data.referenceTimezone}</p>
              </div>
            </div>
              {data.total > 0 && onPlan && cell && (
                <Button
                  onClick={() => onPlan(`${String(cell.hour).padStart(2, "0")}:00`, cell.day)}
                  className="w-full"
                >
                <CalendarPlusIcon className="size-4" />
                Créer un atelier à ce créneau
              </Button>
            )}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {data.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border p-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(m.weight * 100)}% présence
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun membre disponible à ce créneau.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
