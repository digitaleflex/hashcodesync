"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ClockIcon,
  Loader2Icon,
  PlusIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from "lucide-react";
import { DAY_NAMES } from "@/components/availability/constants";

function durationMin(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function AddAvailabilityForm({
  day,
  onSelectDay,
  hoursPerDay,
  startTime,
  endTime,
  onStartTime,
  onEndTime,
  onSubmit,
  submitting,
  disabled,
}: {
  day: number | null;
  onSelectDay: (day: number) => void;
  hoursPerDay: number[];
  startTime: string;
  endTime: string;
  onStartTime: (v: string) => void;
  onEndTime: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  disabled?: boolean;
}) {
  const invalid = Boolean(startTime && endTime && startTime >= endTime);
  const valid = day !== null && startTime && endTime && !invalid;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label>Jour</Label>
        <div role="radiogroup" aria-label="Jour de la semaine" className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAY_NAMES.map((name, i) => {
            const active = day === i;
            const hasHours = hoursPerDay[i] > 0;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => onSelectDay(i)}
                className={`flex h-14 flex-col items-center justify-center rounded-lg border text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  active
                    ? "border-accent bg-accent text-accent-foreground shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-accent/50 hover:text-foreground"
                }`}
              >
                <span className="leading-none">{name.slice(0, 3)}</span>
                <span className={`mt-1 text-[11px] font-normal ${active ? "text-accent-foreground/80" : "text-muted-foreground/70"}`}>
                  {hasHours ? `${Math.round(hoursPerDay[i])} h` : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="dispo-start">Horaires</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="dispo-start"
            type="time"
            value={startTime}
            onChange={(e) => onStartTime(e.target.value)}
            required
            disabled={disabled}
            aria-invalid={invalid}
            className="w-32"
          />
          <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
          <Input
            id="dispo-end"
            type="time"
            value={endTime}
            onChange={(e) => onEndTime(e.target.value)}
            required
            disabled={disabled}
            aria-invalid={invalid}
            className="w-32"
          />
          <Button type="button" onClick={onSubmit} disabled={disabled || submitting} className="h-9">
            {submitting ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
            Ajouter
          </Button>
        </div>
        {invalid && (
          <p id="dispo-error" className="flex items-center gap-2 text-sm text-error">
            <ClockIcon className="size-4" />
            La fin doit être après le début
          </p>
        )}
        {valid && (
          <p aria-live="polite" className="flex items-center gap-2 text-sm text-success">
            <CheckCircleIcon className="size-4" />
            {DAY_NAMES[day]} · {startTime} à {endTime} · {hourLabel(durationMin(startTime, endTime))}
          </p>
        )}
      </div>
    </div>
  );
}

function hourLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}