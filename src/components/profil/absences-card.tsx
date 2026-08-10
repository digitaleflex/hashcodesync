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
import { Textarea } from "@/components/ui/textarea";
import {
  PlaneIcon,
  Loader2Icon,
  SaveIcon,
  PlusIcon,
  Trash2Icon,
  PencilIcon,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import type { UnavailabilityData } from "@/components/profil/types";

export function AbsencesCard({
  unavailabilities,
  onSaved,
}: {
  unavailabilities: UnavailabilityData[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UnavailabilityData | null>(null);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const openNew = () => {
    setEditing(null);
    setStartDate("");
    setEndDate("");
    setReason("");
    setOpen(true);
  };

  const openEdit = (u: UnavailabilityData) => {
    setEditing(u);
    setStartDate(u.startDate);
    setEndDate(u.endDate);
    setReason(u.reason ?? "");
    setOpen(true);
  };

  const save = async () => {
    if (!startDate || !endDate) {
      toast.error("Les dates sont requises");
      return;
    }
    if (endDate < startDate) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `/api/unavailability/${editing.id}`
        : "/api/unavailability";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, reason: reason || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Enregistrement impossible");
        return;
      }
      toast.success("Période enregistrée");
      setOpen(false);
      onSaved();
    } catch {
      toast.error("Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u: UnavailabilityData) => {
    if (!window.confirm("Supprimer cette période d'indisponibilité ?")) return;
    const res = await fetch(`/api/unavailability/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Suppression impossible");
      return;
    }
    toast.success("Période supprimée");
    onSaved();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlaneIcon className="size-4 text-warning" />
          Mes absences
        </CardTitle>
        <CardDescription>
          Périodes pendant lesquelles vous êtes indisponible : une contrainte
          dure, aucun créneau ne vous y sera recommandé.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unavailabilities.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Aucune période d'indisponibilité déclarée.
            </p>
            <Button variant="outline" onClick={openNew}>
              <PlusIcon className="size-4" />
              Ajouter une absence
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="space-y-2">
              {unavailabilities.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {formatDate(u.startDate)} → {formatDate(u.endDate)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.reason ?? "Sans motif"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Modifier la période"
                      onClick={() => openEdit(u)}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Supprimer la période"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void remove(u)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" onClick={openNew}>
              <PlusIcon className="size-4" />
              Ajouter une absence
            </Button>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Modifier la période" : "Ajouter une absence"}
              </DialogTitle>
              <DialogDescription>
                Pendant cette période, aucun atelier ne vous sera recommandé.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Du</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Au</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Motif (optionnel)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Vacances, concours, mobilité…"
                  rows={2}
                />
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
      </CardContent>
    </Card>
  );
}