"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { DAY_NAMES } from "@/components/availability/constants";
import type { Availability } from "@/components/availability/shared";
import { cn } from "@/lib/utils";

type SlotDraft = {
  day: number;
  startTime: string;
  endTime: string;
};

type Scope = "general" | "group" | "activity";

export function SlotFormModal({
  open,
  onOpenChange,
  groups,
  editing,
  defaultDay,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: { id: string; name: string; activities: { id: string; name: string }[] }[];
  editing?: Availability | null;
  defaultDay?: number | null;
  onSaved?: () => void;
}) {
  const [scope, setScope] = useState<Scope>("general");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [slots, setSlots] = useState<SlotDraft[]>([
    { day: 0, startTime: "09:00", endTime: "12:00" },
  ]);
  const [recurring, setRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const selectedGroupOption = useMemo(
    () => groups.find((g) => g.id === selectedGroup) ?? null,
    [groups, selectedGroup]
  );

  const availableActivities = useMemo(
    () => selectedGroupOption?.activities ?? [],
    [selectedGroupOption]
  );

  // Reset form when modal opens or editing changes.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setScope(editing.group ? (editing.activity ? "activity" : "group") : "general");
      setSelectedGroup(editing.group?.id ?? "");
      setSelectedActivity(editing.activity?.id ?? "");
      setSelectedDays([editing.day]);
      setSlots([
        { day: editing.day, startTime: editing.startTime, endTime: editing.endTime },
      ]);
      setRecurring(editing.recurring ?? false);
    } else {
      setScope("general");
      setSelectedGroup("");
      setSelectedActivity("");
      setSelectedDays(defaultDay != null ? [defaultDay] : []);
      setSlots([{ day: defaultDay ?? 0, startTime: "09:00", endTime: "12:00" }]);
      setRecurring(false);
    }
  }, [open, editing, defaultDay]);

  const toggleDay = useCallback((day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }, []);

  const selectAllDays = useCallback(() => {
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
  }, []);

  const selectWorkdays = useCallback(() => {
    setSelectedDays([0, 1, 2, 3, 4]);
  }, []);

  const invertDays = useCallback(() => {
    setSelectedDays((prev) => [0, 1, 2, 3, 4, 5, 6].filter((d) => !prev.includes(d)));
  }, []);

  const daysLabel = useMemo(() => {
    if (selectedDays.length === 7) return "Tous les jours";
    if (
      selectedDays.length === 5 &&
      selectedDays.every((d) => d < 5)
    )
      return "Jours ouvrés (lun–ven)";
    if (selectedDays.length === 0) return "Aucun jour sélectionné";
    return selectedDays
      .slice()
      .sort((a, b) => a - b)
      .map((d) => DAY_NAMES[d].slice(0, 3))
      .join(" · ");
  }, [selectedDays]);

  const suggestFromHistory = useCallback(async () => {
    setSuggesting(true);
    try {
      const res = await fetch("/api/availabilities/history?limit=4");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const weeks: {
        slots: { day: number; startTime: string; endTime: string }[];
      }[] = data.items ?? [];
      if (weeks.length === 0) {
        toast.info("Pas encore d'historique : validez une semaine pour activer la suggestion");
        return;
      }

      const rangeCount = new Map<string, number>();
      const dayRangeCount = new Map<number, Set<string>>();
      for (const week of weeks) {
        for (const s of week.slots) {
          const key = `${s.startTime}-${s.endTime}`;
          rangeCount.set(key, (rangeCount.get(key) ?? 0) + 1);
          const set = dayRangeCount.get(s.day) ?? new Set<string>();
          set.add(key);
          dayRangeCount.set(s.day, set);
        }
      }

      const dominant = [...rangeCount.entries()]
        .filter(([, c]) => c >= 2)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k);
      if (dominant.length === 0) {
        toast.info("Pas de plage horaire assez récurrente pour une suggestion fiable");
        return;
      }

      const suggestedDays = [...dayRangeCount.entries()]
        .filter(([, ranges]) => [...ranges].some((r) => dominant.includes(r)))
        .map(([day]) => day)
        .sort((a, b) => a - b);
      const suggestedSlots = dominant
        .sort()
        .map((key) => {
          const [startTime, endTime] = key.split("-");
          return { day: suggestedDays[0] ?? 0, startTime, endTime };
        });

      setScope("general");
      setSelectedGroup("");
      setSelectedActivity("");
      setSelectedDays(suggestedDays);
      setSlots(suggestedSlots);
      setRecurring(true);
      toast.success(
        `Horaires habituels suggérés : ${suggestedDays.length} jour${suggestedDays.length > 1 ? "s" : ""}`
      );
    } catch {
      toast.error("Impossible de charger l'historique");
    } finally {
      setSuggesting(false);
    }
  }, []);

  const addSlot = useCallback(() => {
    setSlots((prev) => [
      ...prev,
      { day: selectedDays[0] ?? 0, startTime: "14:00", endTime: "17:00" },
    ]);
  }, [selectedDays]);

  const removeSlot = useCallback((index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateSlot = useCallback(
    (index: number, field: keyof SlotDraft, value: string | number) => {
      setSlots((prev) =>
        prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  const validate = useCallback((): string | null => {
    if (selectedDays.length === 0) return "Sélectionnez au moins un jour";
    if (slots.length === 0) return "Ajoutez au moins un créneau horaire";

    // Check each slot validity.
    for (const slot of slots) {
      if (slot.day < 0 || slot.day >= DAY_NAMES.length) {
        return `Jour invalide`;
      }
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
        return "Format d'heure invalide (HH:mm)";
      }
      if (slot.startTime >= slot.endTime) {
        return "L'heure de fin doit être postérieure à l'heure de début";
      }
    }

    // Check overlaps within the same day.
    const byDay = new Map<number, SlotDraft[]>();
    for (const slot of slots) {
      const arr = byDay.get(slot.day) ?? [];
      arr.push(slot);
      byDay.set(slot.day, arr);
    }
    for (const arr of byDay.values()) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 1; i < arr.length; i++) {
        if (arr[i].startTime < arr[i - 1].endTime) {
          return `Les plages chevauchent le ${DAY_NAMES[arr[i].day]}`;
        }
      }
    }

    return null;
  }, [selectedDays, slots]);

  const handleSubmit = useCallback(async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSubmitting(true);
    try {
      const groupId = scope === "general" ? null : selectedGroup;
      const activityId = scope === "activity" ? selectedActivity : null;

      if (editing) {
        // Edit mode: update the existing slot with first day/slot values.
        const res = await fetch(`/api/availabilities/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            day: selectedDays[0],
            startTime: slots[0].startTime,
            endTime: slots[0].endTime,
            groupId,
            activityId,
            recurring,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Erreur" }));
          toast.error(err.error ?? "Impossible de modifier le créneau");
          return;
        }
        toast.success("Créneau modifié");
      } else {
        // Add mode: create slots for all selected days.
        const allSlots: { day: number; startTime: string; endTime: string }[] = [];
        for (const day of selectedDays) {
          for (const slot of slots) {
            allSlots.push({
              day,
              startTime: slot.startTime,
              endTime: slot.endTime,
            });
          }
        }

        const res = await fetch("/api/availabilities/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slots: allSlots,
            groupId,
            activityId,
            recurring,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Erreur" }));
          toast.error(err.error ?? "Impossible d'ajouter les disponibilités");
          return;
        }
        toast.success(`${allSlots.length} créneau${allSlots.length > 1 ? "x" : ""} ajouté${allSlots.length > 1 ? "s" : ""}`);
      }

      onOpenChange(false);
      onSaved?.();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }, [validate, scope, selectedGroup, selectedActivity, selectedDays, slots, recurring, editing, onOpenChange, onSaved]);

  const scopeLabel =
    scope === "general" ? "Générale" : scope === "group" ? "Groupe" : "Activité";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Modifier la disponibilité" : "Ajouter une disponibilité"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Modifiez les paramètres de ce créneau."
              : "Définissez vos créneaux disponibles pour la planification."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto px-1">
          {/* Scope */}
          <div className="space-y-2.5">
            <Label className="text-sm font-medium">Portée</Label>
            <div className="flex gap-2">
              {(["general", "group", "activity"] as Scope[]).map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={scope === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setScope(s);
                    if (s === "general") {
                      setSelectedGroup("");
                      setSelectedActivity("");
                    } else if (s === "group") {
                      setSelectedActivity("");
                    }
                  }}
                  className="flex-1"
                >
                  {s === "general" ? "Générale" : s === "group" ? "Groupe" : "Activité"}
                </Button>
              ))}
            </div>
            {scope !== "general" && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Groupe</Label>
                <Select
                  value={selectedGroup}
                  onValueChange={(v) => {
                    setSelectedGroup(v ?? "");
                    setSelectedActivity("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un groupe" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {scope === "activity" && selectedGroup && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Activité</Label>
                <Select
                  value={selectedActivity}
                  onValueChange={(v) => setSelectedActivity(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une activité" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableActivities.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Days */}
          <div className="space-y-2.5">
            {!editing && (
              <button
                type="button"
                onClick={suggestFromHistory}
                disabled={suggesting}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-accent/40 bg-accent/5 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {suggesting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SparklesIcon className="size-4" />
                )}
                Suggérer mes horaires habituels
              </button>
            )}
            <Label className="text-sm font-medium">Jours</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={selectAllDays}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
              >
                Tous les jours
              </button>
              <button
                type="button"
                onClick={selectWorkdays}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
              >
                Jours ouvrés
              </button>
              <button
                type="button"
                onClick={invertDays}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
              >
                Tous sauf… (inverser)
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map((name, i) => {
                const active = selectedDays.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "h-9 min-w-[3.2rem] rounded-lg border px-3 text-sm font-medium transition-all",
                      active
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-accent/50 hover:text-foreground"
                    )}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{daysLabel}</p>
          </div>

          {/* Time slots */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Horaires</Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={addSlot}
                disabled={selectedDays.length === 0}
              >
                <PlusIcon className="size-3.5" />
                Ajouter une plage
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {slots.map((slot, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-2"
                >
                  {selectedDays.length > 0 && (
                    <Select
                      value={String(slot.day)}
                      onValueChange={(v) => updateSlot(i, "day", Number(v))}
                    >
                      <SelectTrigger className="h-8 w-[5rem] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedDays.map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {DAY_NAMES[d].slice(0, 3)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Input
                    type="time"
                    lang="fr-FR"
                    value={slot.startTime}
                    onChange={(e) => updateSlot(i, "startTime", e.target.value)}
                    className="h-8 flex-1 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">→</span>
                  <Input
                    type="time"
                    lang="fr-FR"
                    value={slot.endTime}
                    onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                    className="h-8 flex-1 text-xs"
                  />
                  {slots.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeSlot(i)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recurrence */}
          <div className="space-y-2.5">
            <Label className="text-sm font-medium">Répétition</Label>
            <div className="flex gap-2">
              {[
                { value: false, label: "Cette semaine uniquement" },
                { value: true, label: "Chaque semaine" },
              ].map((opt) => (
                <Button
                  key={String(opt.value)}
                  type="button"
                  variant={recurring === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRecurring(opt.value)}
                  className="flex-1"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            {recurring && (
              <p className="text-xs text-muted-foreground">
                Cette disponibilité sera reprise automatiquement chaque semaine.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2Icon className="size-4 animate-spin" />}
            {editing ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
