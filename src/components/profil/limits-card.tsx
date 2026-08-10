"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GaugeIcon, Loader2Icon, SaveIcon, PencilIcon } from "lucide-react";
import type { PlanningPreferencesData } from "@/components/profil/types";

const DEFAULT_LIMITS = {
  maxHoursPerWeek: null as number | null,
  maxWorkshopsPerWeek: null as number | null,
  maxMentorshipPerWeek: null as number | null,
};

function fmt(n: number | null, unit: string): string {
  return n === null ? "Illimité" : `${n} ${unit}${n > 1 ? "s" : ""}`;
}

export function LimitsCard({
  preferences,
  onSaved,
}: {
  preferences: PlanningPreferencesData | null;
  onSaved: () => void;
}) {
  const p = preferences
    ? {
        maxHoursPerWeek: preferences.maxHoursPerWeek,
        maxWorkshopsPerWeek: preferences.maxWorkshopsPerWeek,
        maxMentorshipPerWeek: preferences.maxMentorshipPerWeek,
      }
    : DEFAULT_LIMITS;

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState(p.maxHoursPerWeek ? String(p.maxHoursPerWeek) : "");
  const [workshops, setWorkshops] = useState(
    p.maxWorkshopsPerWeek ? String(p.maxWorkshopsPerWeek) : ""
  );
  const [mentoring, setMentoring] = useState(
    p.maxMentorshipPerWeek ? String(p.maxMentorshipPerWeek) : ""
  );

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        maxHoursPerWeek: hours ? Number(hours) : null,
        maxWorkshopsPerWeek: workshops ? Number(workshops) : null,
        maxMentorshipPerWeek: mentoring ? Number(mentoring) : null,
      };
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success("Limites enregistrées");
      setOpen(false);
      onSaved();
    } catch {
      toast.error("Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GaugeIcon className="size-4 text-warning" />
          Mes limites
        </CardTitle>
        <CardDescription>
          Des limites dures : la planification ne les dépassera jamais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="font-heading text-2xl font-semibold">
              {fmt(p.maxHoursPerWeek, "h")}
            </p>
            <p className="text-xs text-muted-foreground">par semaine</p>
          </div>
          <div>
            <p className="font-heading text-2xl font-semibold">
              {fmt(p.maxWorkshopsPerWeek, "atelier")}
            </p>
            <p className="text-xs text-muted-foreground">ateliers / semaine</p>
          </div>
          <div>
            <p className="font-heading text-2xl font-semibold">
              {fmt(p.maxMentorshipPerWeek, "session")}
            </p>
            <p className="text-xs text-muted-foreground">mentorats / semaine</p>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
          <PencilIcon className="size-4" />
          Modifier
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mes limites personnelles</DialogTitle>
            <DialogDescription>
              Le moteur de planification respectera ces limites en priorité,
              quelle que soit votre masse horaire déclarée.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lim-hours">Max heures / semaine</Label>
              <Input
                id="lim-hours"
                type="number"
                min={1}
                max={168}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Illimité"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lim-workshops">Max ateliers / semaine</Label>
              <Input
                id="lim-workshops"
                type="number"
                min={1}
                max={30}
                value={workshops}
                onChange={(e) => setWorkshops(e.target.value)}
                placeholder="Illimité"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lim-mentoring">Max mentorats / semaine</Label>
              <Input
                id="lim-mentoring"
                type="number"
                min={1}
                max={30}
                value={mentoring}
                onChange={(e) => setMentoring(e.target.value)}
                placeholder="Illimité"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Laissez vide pour ne pas imposer de limite sur un critère.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SaveIcon className="size-4" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}