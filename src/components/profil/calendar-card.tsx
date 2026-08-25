"use client";

import { useEffect, useState } from "react";
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
  CalendarSyncIcon,
  CopyIcon,
  Loader2Icon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";

export function CalendarCard() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/profile/calendar-token")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUrl(d?.url ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function activate() {
    setBusy(true);
    try {
      const res = await fetch("/api/profile/calendar-token", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUrl(data.url);
      toast.success("Abonnement calendrier activé");
    } catch {
      toast.error("Activation impossible");
    } finally {
      setBusy(false);
    }
  }

  async function regenerate() {
    setBusy(true);
    try {
      // DELETE puis POST garantit un token neuf même si un ancien existe.
      await fetch("/api/profile/calendar-token", { method: "DELETE" });
      const res = await fetch("/api/profile/calendar-token", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUrl(data.url);
      toast.success(
        "Nouvelle URL générée — l'ancienne abonnement est invalide",
      );
    } catch {
      toast.error("Régénération impossible");
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiée — collez-la dans Google Calendar ou Apple Calendar");
    } catch {
      toast.error("Copie impossible");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarSyncIcon className="size-4 text-accent" />
          Abonnement calendrier
        </CardTitle>
        <CardDescription>
          Synchronisez automatiquement vos ateliers et mentorats dans Google
          Calendar, Apple Calendar ou Outlook.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        ) : url ? (
          <>
            <div className="flex items-center gap-2 rounded-lg border bg-white/[0.03] px-3 py-2">
              <code className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {url}
              </code>
            </div>
            <p className="text-xs text-muted-foreground/80" role="note">
              Traitez cette URL comme un mot de passe : elle expose votre
              planning sans connexion.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={copyUrl}>
                <CopyIcon aria-hidden="true" />
                Copier l&apos;URL
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={regenerate}
                disabled={busy}
              >
                <RefreshCwIcon aria-hidden="true" />
                Régénérer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  setUrl(null);
                  void fetch("/api/profile/calendar-token", {
                    method: "DELETE",
                  }).then(() =>
                    toast.success("Abonnement révoqué"),
                  );
                }}
                disabled={busy}
              >
                <Trash2Icon aria-hidden="true" />
                Révoquer
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="max-w-xl text-sm text-muted-foreground">
              Générez une URL privée à ajouter dans votre application
              d&apos;agenda (« Ajouter un calendrier par URL »). Vos sessions
              y arriveront sans aucune action manuelle.
            </p>
            <Button size="sm" onClick={activate} disabled={busy}>
              {busy ? (
                <Loader2Icon className="animate-spin" aria-hidden="true" />
              ) : (
                <CalendarSyncIcon aria-hidden="true" />
              )}
              Activer l&apos;abonnement
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
