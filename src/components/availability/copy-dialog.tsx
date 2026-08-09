import { useCallback, useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { CopyIcon, Loader2Icon } from "lucide-react";
import { DAY_NAMES } from "@/components/availability/constants";
import type { Availability } from "@/components/availability/shared";
import { cn } from "@/lib/utils";

export function CopyDialog({
  open,
  onOpenChange,
  slot,
  onCopied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: Availability | null;
  onCopied?: () => void;
}) {
  const [targetDays, setTargetDays] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTargetDays([]);
      setSubmitting(false);
    }
  }, [open]);

  const toggleDay = useCallback((day: number) => {
    setTargetDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }, []);

  const handleCopy = useCallback(async () => {
    if (!slot || targetDays.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/availabilities/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: slot.id,
          targetDays,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur" }));
        toast.error(err.error ?? "Impossible de copier le créneau");
        return;
      }
      toast.success(`Créneau copié vers ${targetDays.length} jour${targetDays.length > 1 ? "s" : ""}`);
      onOpenChange(false);
      onCopied?.();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }, [slot, targetDays, onOpenChange, onCopied]);

  if (!slot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Copier vers...</DialogTitle>
          <DialogDescription>
            Dupliquer ce créneau ({slot.startTime}–{slot.endTime}) vers d&apos;autres jours.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label className="text-sm font-medium">Jours cibles</Label>
          <div className="flex flex-wrap gap-2">
            {DAY_NAMES.map((name, i) => {
              const active = targetDays.includes(i);
              const sameDay = i === slot.day;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !sameDay && toggleDay(i)}
                  disabled={sameDay}
                  className={cn(
                    "h-9 min-w-[3.2rem] rounded-lg border px-3 text-sm font-medium transition-all",
                    sameDay
                      ? "cursor-not-allowed opacity-30"
                      : active
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-accent/50 hover:text-foreground"
                  )}
                >
                  {name.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleCopy} disabled={submitting || targetDays.length === 0}>
            {submitting && <Loader2Icon className="size-4 animate-spin" />}
            <CopyIcon className="size-4" />
            Appliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
