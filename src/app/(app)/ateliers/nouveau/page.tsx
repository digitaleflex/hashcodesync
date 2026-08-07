"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2Icon, CalendarDaysIcon, ArrowLeftIcon } from "lucide-react";

// Convertit un ISO en valeur locale compatible <input type="datetime-local">.
function toLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewWorkshopPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetStart = searchParams.get("start") ?? "";
  const presetEnd = searchParams.get("end") ?? "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState(presetStart ? toLocal(presetStart) : "");
  const [endAt, setEndAt] = useState(presetEnd ? toLocal(presetEnd) : "");
  const [submitting, setSubmitting] = useState(false);

  const valid =
    title.trim() &&
    startAt &&
    endAt &&
    new Date(endAt).getTime() > new Date(startAt).getTime();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      toast.error("Renseignez un titre et des dates valides (fin après début)");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/workshops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erreur" }));
      toast.error(err.error ?? "Création impossible");
      return;
    }
    toast.success("Atelier créé !");
    router.push("/ateliers");
    router.refresh();
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Link
          href="/ateliers"
          className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
        >
          <ArrowLeftIcon className="size-4" /> Retour aux ateliers
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDaysIcon className="size-5 text-accent" />
              Nouvel atelier
            </CardTitle>
            <CardDescription>
              Planifiez un atelier ou une séance de mentorat pour la cohorte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  placeholder="Ex. Introduction à React"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Objectifs, programme, prérequis…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="start">Début</Label>
                  <Input
                    id="start"
                    type="datetime-local"
                    required
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="end">Fin</Label>
                  <Input
                    id="end"
                    type="datetime-local"
                    required
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" disabled={submitting || !valid} className="mt-2">
                {submitting ? <Loader2Icon className="animate-spin" /> : null}
                Créer l&apos;atelier
              </Button>
              {!valid && (
                <p className="text-xs text-muted-foreground">
                  {!title.trim()
                    ? "Renseignez un titre pour activer la création."
                    : !startAt || !endAt
                      ? "Renseignez les dates de début et de fin."
                      : "La fin doit être postérieure au début."}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}