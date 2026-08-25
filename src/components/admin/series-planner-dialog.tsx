"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarRangeIcon, Loader2Icon, SparklesIcon } from "lucide-react";

type GroupOption = { id: string; name: string; memberCount: number };

type Proposal = {
  weekIndex: number;
  startAt: string;
  endAt: string;
  day: number;
  startHour: number;
  score: number;
  expectedAttendance: number;
  memberCount: number;
};

type PreviewResponse = {
  proposals: Proposal[];
  warnings: string[];
  startWeekStart: string;
};

const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

function formatSlot(p: Proposal): string {
  const d = new Date(p.startAt);
  return `${DAY_NAMES[p.day]} ${dateFmt.format(d)} · ${String(p.startHour).padStart(2, "0")}:00`;
}

export function SeriesPlannerDialog({ groups }: { groups: GroupOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [weeks, setWeeks] = useState(4);
  const [perWeek, setPerWeek] = useState(1);
  const [windowHours, setWindowHours] = useState(2);
  const [groupId, setGroupId] = useState("");
  const [requiresMentor, setRequiresMentor] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [busy, setBusy] = useState<"preview" | "create" | null>(null);

  function reset() {
    setPreview(null);
    setName("");
    setBusy(null);
  }

  async function runPreview() {
    setBusy("preview");
    try {
      const res = await fetch("/api/admin/scheduling/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "preview",
          weeks,
          perWeek,
          windowHours,
          groupId: groupId || undefined,
          requiresMentor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Prévisualisation impossible");
      setPreview(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Prévisualisation impossible");
    } finally {
      setBusy(null);
    }
  }

  async function createSeries() {
    if (!name.trim()) {
      toast.error("Donnez un nom à la série (ex. « Atelier algo — session automne »).");
      return;
    }
    setBusy("create");
    try {
      const res = await fetch("/api/admin/scheduling/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "create",
          name,
          weeks,
          perWeek,
          windowHours,
          groupId: groupId || undefined,
          requiresMentor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Création impossible");
      toast.success(
        `Série créée : ${data.count} atelier${data.count > 1 ? "s" : ""} planifié${data.count > 1 ? "s" : ""}.`,
      );
      setOpen(false);
      reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline">
            <SparklesIcon aria-hidden="true" />
            Planifier en série
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRangeIcon className="size-4 text-accent" />
            Planifier en série
          </DialogTitle>
          <DialogDescription>
            Générez d&apos;un coup une saison d&apos;ateliers récurrents, équilibrée
            selon les disponibilités, budgets et absences des membres.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="series-name">Nom de la série</Label>
            <Input
              id="series-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Atelier algo — automne"
              maxLength={80}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="series-weeks">Semaines</Label>
              <Select
                value={String(weeks)}
                onValueChange={(v) => {
                  setWeeks(Number(v));
                  setPreview(null);
                }}
              >
                <SelectTrigger id="series-weeks">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 6, 8, 10, 12, 16].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} semaines
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="series-perweek">Fréquence</Label>
              <Select
                value={String(perWeek)}
                onValueChange={(v) => {
                  setPerWeek(Number(v));
                  setPreview(null);
                }}
              >
                <SelectTrigger id="series-perweek">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 / semaine</SelectItem>
                  <SelectItem value="2">2 / semaine</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="series-duration">Durée</Label>
              <Select
                value={String(windowHours)}
                onValueChange={(v) => {
                  setWindowHours(Number(v));
                  setPreview(null);
                }}
              >
                <SelectTrigger id="series-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h} h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="series-group">Groupe</Label>
              <Select
                value={groupId || "all"}
                onValueChange={(v) => {
                  setGroupId(!v || v === "all" ? "" : v);
                  setPreview(null);
                }}
              >
                <SelectTrigger id="series-group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toute la cohorte</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={requiresMentor}
              onChange={(e) => {
                setRequiresMentor(e.target.checked);
                setPreview(null);
              }}
              className="size-3.5 accent-[var(--accent)]"
            />
            Un mentor doit couvrir chaque séance
          </label>

          {preview && (
            <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border p-3">
              {preview.proposals.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun créneau viable avec ces contraintes.
                </p>
              )}
              {preview.proposals.map((p, i) => (
                <div
                  key={`${p.weekIndex}-${i}`}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>
                    S{p.weekIndex + 1} · {formatSlot(p)}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    ≈{p.expectedAttendance} présences · score {p.score}
                  </span>
                </div>
              ))}
              {preview.warnings.map((w) => (
                <p key={w} className="text-xs text-warning">
                  {w}
                </p>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={runPreview} disabled={busy !== null}>
            {busy === "preview" ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <SparklesIcon aria-hidden="true" />
            )}
            Prévisualiser
          </Button>
          <Button onClick={createSeries} disabled={busy !== null || !preview || preview.proposals.length === 0}>
            {busy === "create" && (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            )}
            Créer la série
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
