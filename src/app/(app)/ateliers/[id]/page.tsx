"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  PublicWorkshop,
} from "@/components/workshops-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate, formatTime, toDatetimeLocal } from "@/lib/format";
import {
  Loader2Icon,
  ArrowLeftIcon,
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon,
  Trash2Icon,
  PencilIcon,
  CalendarDaysIcon,
  CheckCheckIcon,
  XIcon,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  invited: "Invité",
  accepted: "Inscrit",
  declined: "Refusé",
};

export default function WorkshopDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data } = authClient.useSession();
  const [workshop, setWorkshop] = useState<PublicWorkshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [bulkSelection, setBulkSelection] = useState<Record<string, "present" | "absent" | "">>({});
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const me = data?.user;
  const isCreator = workshop ? me?.id === workshop.createdBy : false;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/workshops/${params.id}`);
    if (res.ok) setWorkshop(await res.json());
    else toast.error("Atelier introuvable");
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !workshop) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-accent" />
      </main>
    );
  }

  const part = me?.id
    ? workshop.participants.find((p) => p.userId === me.id)
    : undefined;
  const inPast = new Date(workshop.endAt).getTime() < Date.now();

  async function handleJoin() {
    if (!workshop) return;
    const res = await fetch(`/api/workshops/${workshop.id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (res.ok) {
      toast.success("Vous êtes inscrit !");
      load();
    } else toast.error("Inscription impossible");
  }

  async function handleLeave() {
    if (!workshop) return;
    const res = await fetch(`/api/workshops/${workshop.id}/participants`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Désinscrit");
      load();
    } else toast.error("Désinscription impossible");
  }

  async function handleDelete() {
    if (!workshop) return;
    if (!confirm("Supprimer définitivement cet atelier ?")) return;
    const res = await fetch(`/api/workshops/${workshop.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Atelier supprimé");
      router.push("/ateliers");
      router.refresh();
    } else toast.error("Suppression impossible");
  }

  // Feedback de présence : marque un participant présent/absent à cet atelier.
  async function markPresence(userId: string, status: "present" | "absent") {
    if (!workshop) return;
    setBusyUserId(userId);
    const res = await fetch(`/api/admin/workshops/${workshop.id}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status }),
    });
    setBusyUserId(null);
    if (res.ok) toast.success(status === "present" ? "Présence enregistrée" : "Absence enregistrée");
    else toast.error("Impossible d'enregistrer la présence");
    load();
  }

  async function handleBulkAttendance() {
    if (!workshop) return;
    const entries = Object.entries(bulkSelection).filter(([, v]) => v === "present" || v === "absent");
    if (entries.length === 0) {
      toast.error("Sélectionnez au moins un participant");
      return;
    }
    setBulkSubmitting(true);
    const res = await fetch(`/api/admin/workshops/${workshop.id}/attendance/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: entries.map(([userId, status]) => ({ userId, status })),
      }),
    });
    setBulkSubmitting(false);
    if (res.ok) {
      toast.success("Présences enregistrées");
      setBulkSelection({});
      load();
    } else {
      const err = await res.json().catch(() => ({ error: "Erreur" }));
      toast.error(err.error ?? "Enregistrement impossible");
    }
  }

  async function handleFeedback() {
    if (!workshop || !feedbackRating) {
      toast.error("Sélectionnez une note");
      return;
    }
    setFeedbackSubmitting(true);
    const res = await fetch(`/api/workshops/${workshop.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: feedbackRating,
        comment: feedbackComment || null,
      }),
    });
    setFeedbackSubmitting(false);
    if (res.ok) {
      toast.success("Feedback envoyé !");
      setFeedbackRating(0);
      setFeedbackComment("");
    } else {
      const err = await res.json().catch(() => ({ error: "Erreur" }));
      toast.error(err.error ?? "Envoi impossible");
    }
  }

  const attendanceByUser = new Map(
    (workshop.attendance ?? []).map((a) => [a.userId, a.status])
  );

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
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CalendarDaysIcon className="size-5 text-accent" />
                  {workshop.title}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {workshop.type === "mentorship_session" && (
                    <Badge variant="outline">Session de mentorat</Badge>
                  )}
                  {workshop.series && (
                    <Badge variant="secondary">
                      <CalendarDaysIcon className="mr-1 size-3" />
                      Programme : {workshop.series.name}
                    </Badge>
                  )}
                  {workshop.type === "mentorship_session" && workshop.mentee && (
                    <span className="text-xs text-muted-foreground">
                      Avec {workshop.mentee.firstname} {workshop.mentee.lastname}
                    </span>
                  )}
                </div>
                <CardDescription>
                  {formatDate(workshop.startAt)} · {formatTime(workshop.startAt)} –
                  {formatTime(workshop.endAt)}
                </CardDescription>
              </div>
              {isCreator && (
                <div className="flex gap-2">
                  <EditDialog workshop={workshop} onSaved={load} />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleDelete}
                    aria-label="Supprimer"
                  >
                    <Trash2Icon className="text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {workshop.description ? (
              <p className="text-sm text-muted-foreground">{workshop.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Aucune description.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
              <Badge variant={inPast ? "secondary" : "default"}>
                {inPast ? "Terminé" : "À venir"}
              </Badge>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <UsersIcon className="size-4" />
                {workshop.participants.length} participant{workshop.participants.length > 1 ? "s" : ""}
                {workshop.capacity ? ` / ${workshop.capacity}` : ""}
              </span>
              {workshop.location && (
                <span className="text-sm text-muted-foreground">📍 {workshop.location}</span>
              )}
              {workshop.meetingUrl && (
                <a
                  href={workshop.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Lien de réunion
                </a>
              )}
              {!isCreator &&
                (part ? (
                  <Button variant="outline" className="ml-auto" onClick={handleLeave}>
                    <UserMinusIcon /> Quitter
                  </Button>
                ) : (
                  <Button className="ml-auto" onClick={handleJoin}>
                    <UserPlusIcon /> Rejoindre
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
              <CardTitle className="text-lg">Participants</CardTitle>
              <CardDescription>
                Merci à {workshop.creator.name} pour la création.
                {isCreator &&
                  " · Cochez la présence après l'atelier pour améliorer les recommandations."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCreator && workshop.participants.length > 0 && (
                <div className="mb-4 flex flex-col gap-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Saisie de présence en lot</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const selection: Record<string, "present" | "absent" | ""> = {};
                        for (const p of workshop.participants) {
                          selection[p.userId] = "present";
                        }
                        setBulkSelection(selection);
                      }}
                    >
                      Tout marquer présent
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const selection: Record<string, "present" | "absent" | ""> = {};
                        for (const p of workshop.participants) {
                          selection[p.userId] = "absent";
                        }
                        setBulkSelection(selection);
                      }}
                    >
                      Tout marquer absent
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setBulkSelection({})}
                    >
                      Réinitialiser
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkAttendance}
                      disabled={bulkSubmitting || Object.keys(bulkSelection).length === 0}
                    >
                      {bulkSubmitting ? (
                        <Loader2Icon className="animate-spin" />
                      ) : (
                        "Enregistrer les présences"
                      )}
                    </Button>
                  </div>
                </div>
              )}
              {workshop.participants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun participant pour le moment.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {workshop.participants.map((p) => {
                    const att = attendanceByUser.get(p.userId);
                    return (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 py-2.5"
                      >
                        <div>
                          <p className="text-sm font-medium">{p.user.name}</p>
                          <p className="text-xs text-muted-foreground">{p.user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isCreator ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant={att === "present" ? "default" : "outline"}
                                size="sm"
                                disabled={busyUserId === p.userId}
                                onClick={() => markPresence(p.userId, "present")}
                              >
                                {busyUserId === p.userId ? (
                                  <Loader2Icon className="size-3.5 animate-spin" />
                                ) : (
                                  <CheckCheckIcon className="size-3.5" />
                                )}
                                Présent
                              </Button>
                              <Button
                                variant={att === "absent" ? "destructive" : "outline"}
                                size="sm"
                                disabled={busyUserId === p.userId}
                                onClick={() => markPresence(p.userId, "absent")}
                              >
                                <XIcon className="size-3.5" />
                                Absent
                              </Button>
                            </div>
                          ) : (
                            <>
                              {att === "present" && (
                                <Badge variant="default">Présent</Badge>
                              )}
                              {att === "absent" && (
                                <Badge variant="destructive">Absent</Badge>
                              )}
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {!isCreator && inPast && part && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Votre feedback</CardTitle>
                <CardDescription>
                  Notez cet atelier pour améliorer les recommandations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        className="text-2xl transition-colors"
                        aria-label={`Note ${star}/5`}
                      >
                        {star <= feedbackRating ? "★" : "☆"}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Commentaire (optionnel)"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                  />
                  <Button onClick={handleFeedback} disabled={feedbackSubmitting || !feedbackRating}>
                    {feedbackSubmitting ? <Loader2Icon className="animate-spin" /> : "Envoyer"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isCreator && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Feedbacks</CardTitle>
                <CardDescription>
                  Notes et commentaires laissés par les participants.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FeedbackList workshopId={workshop.id} isCreator={isCreator} />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    );
  }

function statusBadge(status: string) {
  if (status === "accepted") return "default";
  if (status === "declined") return "destructive";
  return "secondary";
}

function EditDialog({
  workshop,
  onSaved,
}: {
  workshop: PublicWorkshop;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(workshop.title);
  const [description, setDescription] = useState(workshop.description ?? "");
  const [startAt, setStartAt] = useState(toDatetimeLocal(workshop.startAt));
  const [endAt, setEndAt] = useState(toDatetimeLocal(workshop.endAt));
  const [capacity, setCapacity] = useState(workshop.capacity ?? "");
  const [location, setLocation] = useState(workshop.location ?? "");
  const [meetingUrl, setMeetingUrl] = useState(workshop.meetingUrl ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/workshops/${workshop.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        capacity: capacity ? Number(capacity) : null,
        location: location || null,
        meetingUrl: meetingUrl || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Atelier mis à jour");
      onSaved();
    } else {
      const err = await res.json().catch(() => ({ error: "Erreur" }));
      toast.error(err.error ?? "Mise à jour impossible");
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="icon-sm" />}>
        <PencilIcon />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;atelier</DialogTitle>
          <DialogDescription>Mettez à jour les informations.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="et">Titre</Label>
            <Input
              id="et"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ed">Description</Label>
            <Textarea
              id="ed"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="es">Début</Label>
            <Input
              id="es"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ee">Fin</Label>
            <Input
              id="ee"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ec">Capacité</Label>
              <Input
                id="ec"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="el">Lieu</Label>
              <Input
                id="el"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="em">Lien de réunion</Label>
            <Input
              id="em"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2Icon className="animate-spin" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeedbackList({ workshopId, isCreator }: { workshopId: string; isCreator: boolean }) {
  const [feedbacks, setFeedbacks] = useState<Array<{ id: string; rating: number; comment: string | null; user: { name: string } }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workshops/${workshopId}/feedback`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFeedbacks(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workshopId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  if (feedbacks.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun feedback pour le moment.</p>;
  }

  const avg = Math.round(feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Note moyenne :</span>
        <Badge variant="secondary">{avg}/5</Badge>
        <span className="text-xs text-muted-foreground">({feedbacks.length} vote{feedbacks.length > 1 ? "s" : ""})</span>
      </div>
      <ul className="space-y-2">
        {feedbacks.map((f) => (
          <li key={f.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{f.user.name}</span>
              <Badge variant="outline">{f.rating}/5</Badge>
            </div>
            {f.comment && <p className="mt-1 text-xs text-muted-foreground">{f.comment}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}