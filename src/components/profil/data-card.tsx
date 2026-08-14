"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { PasswordInput } from "@/components/ui/password-input";
import { ProfileRow } from "@/components/profil/profile-row";
import { authClient } from "@/lib/auth-client";
import {
  FileDownIcon,
  TableIcon,
  Trash2Icon,
  Loader2Icon,
  AlertTriangleIcon,
  CheckCircle2Icon,
} from "lucide-react";

export function DataCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<"json" | "csv" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const download = async (kind: "json" | "csv") => {
    setExporting(kind);
    try {
      const res = await fetch(
        kind === "json"
          ? "/api/profile/export"
          : "/api/profile/export/availabilities"
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Export impossible");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? "export." + (kind === "json" ? "json" : "csv");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export impossible");
    } finally {
      setExporting(null);
    }
  };

  const deleteAccount = async () => {
    if (confirmText !== "SUPPRIMER") {
      toast.error("Tapez SUPPRIMER pour confirmer la suppression");
      return;
    }
    if (!password) {
      toast.error("Votre mot de passe est requis");
      return;
    }
    setDeleting(true);
    try {
      const { error } = await authClient.deleteUser({
        password,
        callbackURL: "/login",
      });
      if (error) {
        toast.error(error.message ?? "Suppression impossible");
        return;
      }
      toast.success("Compte supprimé");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Suppression impossible");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <ProfileRow
        icon={<FileDownIcon className="size-4.5" />}
        label="Données & confidentialité"
        value="Exports et suppression de votre compte"
        action={open ? "Fermer" : "Gérer"}
        onClick={() => setOpen((v) => !v)}
        expanded={open}
      />

      {open && (
        <div className="space-y-4 rounded-b-xl border border-t-0 border-border bg-card p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => void download("json")}
              disabled={exporting !== null}
            >
              {exporting === "json" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <FileDownIcon className="size-4" />
              )}
              Exporter mes données (JSON)
            </Button>
            <Button
              variant="outline"
              onClick={() => void download("csv")}
              disabled={exporting !== null}
            >
              {exporting === "csv" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <TableIcon className="size-4" />
              )}
              Exporter mes disponibilités (CSV)
            </Button>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="size-4 text-destructive" />
              <p className="text-sm font-medium">Zone sensible</p>
            </div>
            <p className="text-xs text-muted-foreground">
              La suppression est définitive : profil, disponibilités,
              préférences et historique seront effacés. Cette action est
              irréversible.
            </p>
            <Button
              variant="destructive"
              className="mt-1 w-full sm:w-fit"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon className="size-4" />
              Supprimer mon compte
            </Button>
          </div>
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer mon compte</DialogTitle>
            <DialogDescription>
              Cette action est définitive. Toutes vos données seront effacées.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-xs text-muted-foreground">
                Vous perdrez l'accès à vos groupes, vos disponibilités et votre
                historique. Aucune récupération ne sera possible.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                Tapez <span className="font-semibold">SUPPRIMER</span> pour
                confirmer :
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-password">Mot de passe</Label>
              <PasswordInput
                id="delete-password"
                value={password}
                onChange={setPassword}
              />
              <p className="text-xs text-muted-foreground">
                Requis pour confirmer que vous êtes bien le titulaire du compte.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteAccount()}
              disabled={deleting || confirmText !== "SUPPRIMER" || !password}
            >
              {deleting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CheckCircle2Icon className="size-4" />
              )}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}