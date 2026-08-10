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
import { Switch } from "@/components/ui/switch";
import { SlidersHorizontalIcon, Loader2Icon, SaveIcon, PencilIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlanningPreferencesData } from "@/components/profil/types";
import { DAY_SHORT } from "@/components/availability/constants";

const frequencyLabels: Record<string, string> = {
  weekly: "Chaque semaine",
  biweekly: "Toutes les deux semaines",
  monthly: "Une fois par mois",
  flexible: "Selon mes disponibilités",
};

const SUMMARY_DEFAULT: PlanningPreferencesData = {
  preferredDays: 0,
  morning: true,
  afternoon: true,
  evening: true,
  preferredDurationHours: null,
  wantsWorkshops: true,
  wantsMentoring: true,
  frequency: "weekly",
  maxHoursPerWeek: null,
  maxWorkshopsPerWeek: null,
  maxMentorshipPerWeek: null,
};

export function PreferencesCard({
  preferences,
  onSaved,
}: {
  preferences: PlanningPreferencesData | null;
  onSaved: () => void;
}) {
  const prefs = preferences ?? SUMMARY_DEFAULT;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [days, setDays] = useState<boolean[]>(
    DAY_SHORT.map((_, i) => (prefs.preferredDays & (1 << i)) !== 0)
  );
  const [morning, setMorning] = useState(prefs.morning);
  const [afternoon, setAfternoon] = useState(prefs.afternoon);
  const [evening, setEvening] = useState(prefs.evening);
  const [duration, setDuration] = useState(
    prefs.preferredDurationHours ? String(prefs.preferredDurationHours) : ""
  );
  const [wantsWorkshops, setWantsWorkshops] = useState(prefs.wantsWorkshops);
  const [wantsMentoring, setWantsMentoring] = useState(prefs.wantsMentoring);
  const [frequency, setFrequency] = useState(prefs.frequency);

  const selectedDays = DAY_SHORT.filter((_, i) => days[i]);
  const moments = [
    morning && "Matin",
    afternoon && "Après-midi",
    evening && "Soir",
  ].filter(Boolean);

  const save = async () => {
    setSaving(true);
    try {
      let preferredDays = 0;
      days.forEach((on, i) => {
        if (on) preferredDays |= 1 << i;
      });
      const body = {
        preferredDays,
        morning,
        afternoon,
        evening,
        preferredDurationHours: duration ? Number(duration) : null,
        wantsWorkshops,
        wantsMentoring,
        frequency,
      };
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success("Préférences enregistrées");
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
          <SlidersHorizontalIcon className="size-4 text-accent" />
          Préférences
        </CardTitle>
        <CardDescription>
          Vos préférences orientent les recommandations, sans remplacer les
          contraintes de planification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">
          {selectedDays.length === 0
            ? "Aucun jour privilégié"
            : `Jours privilégiés : ${selectedDays.join(", ")}`}
        </p>
        <p className="text-sm">
          Moments : {moments.length === 0 ? "aucun" : moments.join(", ")}
        </p>
        <p className="text-sm">
          Activités :{" "}
          {[wantsWorkshops && "Ateliers", wantsMentoring && "Mentorat"]
            .filter(Boolean)
            .join(", ") || "aucune"}
        </p>
        <p className="text-sm">
          Fréquence : {frequencyLabels[frequency] ?? frequency}
        </p>

        <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
          <PencilIcon className="size-4" />
          Modifier
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Préférences de planification</DialogTitle>
            <DialogDescription>
              Des préférences soft : elles influencent les recommandations
              personnalisées.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jours privilégiés</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAY_SHORT.map((d, i) => {
                  const on = days[i];
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      aria-label={d}
                      onClick={() =>
                        setDays((prev) => prev.map((v, j) => (j === i ? !v : v)))
                      }
                      className={`h-9 min-w-11 rounded-lg border px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Moments de la journée</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">Matin (avant 12h)</span>
                  <Switch checked={morning} onCheckedChange={setMorning} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">Après-midi (12h – 18h)</span>
                  <Switch checked={afternoon} onCheckedChange={setAfternoon} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">Soir (après 18h)</span>
                  <Switch checked={evening} onCheckedChange={setEvening} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Durée préférée (heures)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={12}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Optionnel"
              />
            </div>

            <div className="space-y-2">
              <Label>Types d'activités</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">Ateliers</span>
                  <Switch checked={wantsWorkshops} onCheckedChange={setWantsWorkshops} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">Mentorat</span>
                  <Switch checked={wantsMentoring} onCheckedChange={setWantsMentoring} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Fréquence de participation</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v ?? "weekly")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(frequencyLabels).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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