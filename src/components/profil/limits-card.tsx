"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { ProfileRow } from "@/components/profil/profile-row";
import { GaugeIcon, Loader2Icon, SaveIcon } from "lucide-react";
import type { PlanningPreferencesData } from "@/components/profil/types";

const DEFAULT_LIMITS = {
  maxHoursPerWeek: null as number | null,
  maxWorkshopsPerWeek: null as number | null,
  maxMentorshipPerWeek: null as number | null,
};

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

  const limits: Array<{ n: number | null; label: string; unit: string }> = [
    { n: p.maxHoursPerWeek, label: "heures", unit: "h" },
    { n: p.maxWorkshopsPerWeek, label: "ateliers", unit: "atelier" },
    { n: p.maxMentorshipPerWeek, label: "mentorats", unit: "mentorat" },
  ];
  const active = limits.filter((l) => l.n !== null);
  const summary = active.length
    ? active.map((l) => `${l.n} ${l.n! > 1 ? l.label : l.unit} / semaine`).join(" · ")
    : "Aucune limite configurée";

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
    <>
      <ProfileRow
        icon={<GaugeIcon className="size-4.5" />}
        label="Limites"
        value={summary}
        action="Modifier"
        onClick={() => setOpen(true)}
      />

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
    </>
  );
}