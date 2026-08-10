"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2Icon, CalendarDaysIcon, ArrowLeftIcon, UsersIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";

function toLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Member = { id: string; firstname: string; lastname: string; email: string };

export default function NewWorkshopPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data } = authClient.useSession();
  const user = data?.user;
  const presetStart = searchParams.get("start") ?? "";
  const presetEnd = searchParams.get("end") ?? "";

  useEffect(() => {
    if (user && !["admin", "mentor"].includes(user.role)) {
      toast.error("Seul un administrateur ou mentor peut créer un atelier ou une session de mentorat");
      router.push("/ateliers");
    }
  }, [user, router]);

  const [type, setType] = useState<"atelier" | "mentorship_session">("atelier");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState(presetStart ? toLocal(presetStart) : "");
  const [endAt, setEndAt] = useState(presetEnd ? toLocal(presetEnd) : "");
  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [menteeId, setMenteeId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [seriesOptions, setSeriesOptions] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const valid =
    title.trim() &&
    startAt &&
    endAt &&
    new Date(endAt).getTime() > new Date(startAt).getTime() &&
    (type !== "mentorship_session" || menteeId);

  useEffect(() => {
    fetch("/api/series")
      .then((r) => r.ok ? r.json() : Promise.resolve([]))
      .then((data) => setSeriesOptions(Array.isArray(data) ? data : []))
      .catch(() => setSeriesOptions([]));
  }, []);

  useEffect(() => {
    if (type === "mentorship_session") {
      setLoadingMembers(true);
      fetch("/api/members")
        .then((r) => r.ok ? r.json() : Promise.resolve([]))
        .then((data) => setMembers(Array.isArray(data) ? data : []))
        .catch(() => setMembers([]))
        .finally(() => setLoadingMembers(false));
    }
  }, [type]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      toast.error("Renseignez les champs obligatoires");
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
        capacity: type === "mentorship_session" ? 2 : (capacity ? Number(capacity) : null),
        location: location || null,
        meetingUrl: meetingUrl || null,
        seriesId: seriesId || null,
        type,
        menteeId: type === "mentorship_session" ? menteeId : null,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erreur" }));
      toast.error(err.error ?? "Création impossible");
      return;
    }
    toast.success(type === "mentorship_session" ? "Session de mentorat créée !" : "Atelier créé !");
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
              {type === "mentorship_session" ? "Nouvelle session de mentorat" : "Nouvel atelier"}
            </CardTitle>
            <CardDescription>
              {type === "mentorship_session"
                ? "Planifiez une séance de mentorat 1-on-1 avec un membre de la cohorte."
                : "Planifiez un atelier ou une séance de mentorat pour la cohorte."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as "atelier" | "mentorship_session")}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atelier">Atelier</SelectItem>
                    <SelectItem value="mentorship_session">Session de mentorat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  placeholder={type === "mentorship_session" ? "Ex. Suivi de progression" : "Ex. Introduction à React"}
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
               {type === "mentorship_session" ? (
                 <div className="flex flex-col gap-2">
                   <Label htmlFor="mentee">Membre à coacher</Label>
                   <Select value={menteeId} onValueChange={(v) => setMenteeId(v ?? "")}>
                     <SelectTrigger className="h-10 w-full">
                       <SelectValue placeholder={loadingMembers ? "Chargement..." : "Sélectionner un membre"} />
                     </SelectTrigger>
                     <SelectContent>
                       {members.map((m) => (
                         <SelectItem key={m.id} value={m.id}>
                           {m.firstname} {m.lastname} ({m.email})
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                   <div className="flex flex-col gap-2">
                     <Label htmlFor="capacity">Capacité (optionnel)</Label>
                     <Input
                       id="capacity"
                       type="number"
                       min={1}
                       placeholder="Illimité"
                       value={capacity}
                       onChange={(e) => setCapacity(e.target.value)}
                     />
                   </div>
                   <div className="flex flex-col gap-2">
                     <Label htmlFor="location">Lieu (optionnel)</Label>
                     <Input
                       id="location"
                       placeholder="Ex. Salle A, En ligne..."
                       value={location}
                       onChange={(e) => setLocation(e.target.value)}
                     />
                   </div>
                 </div>
               )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="meetingUrl">Lien de réunion (optionnel)</Label>
                <Input
                  id="meetingUrl"
                  placeholder="https://meet.example.com/..."
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Programme (optionnel)</Label>
                <Select value={seriesId} onValueChange={(value) => setSeriesId(value ?? "")}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Aucun programme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun programme</SelectItem>
                    {seriesOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={submitting || !valid} className="mt-2">
                {submitting ? <Loader2Icon className="animate-spin" /> : null}
                {type === "mentorship_session" ? "Créer la session de mentorat" : "Créer l'atelier"}
              </Button>
              {!valid && (
                <p className="text-xs text-muted-foreground">
                  {!title.trim()
                    ? "Renseignez un titre pour activer la création."
                    : !startAt || !endAt
                      ? "Renseignez les dates de début et de fin."
                      : type === "mentorship_session" && !menteeId
                        ? "Sélectionnez un membre à coacher."
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
