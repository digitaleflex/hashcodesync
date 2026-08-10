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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { formatDate } from "@/lib/format";
import {
  KeyRoundIcon,
  Loader2Icon,
  ShieldAlertIcon,
  MonitorIcon,
  LogOutIcon,
  LoaderIcon,
} from "lucide-react";
import type { ProfileUser } from "@/components/profil/types";

type BetterAuthSession = {
  id: string;
  token: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt?: string | Date;
};

export function SecurityCard({ user }: { user: ProfileUser }) {
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  const [sessions, setSessions] = useState<BetterAuthSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (!showPassword) return;
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPassword]);

  const loadSessions = async () => {
    setSessionError(null);
    setLoadingSessions(true);
    try {
      const res = await authClient.listSessions();
      if (res.error) {
        setSessionError(res.error.message ?? "Impossible de lister les sessions");
      } else {
        setSessions((res.data ?? []) as BetterAuthSession[]);
      }
    } catch {
      setSessionError("Impossible de lister les sessions");
    } finally {
      setLoadingSessions(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setChanging(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        toast.error(error.message ?? "Mot de passe incorrect");
        return;
      }
      toast.success("Mot de passe modifié");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
    } finally {
      setChanging(false);
    }
  };

  const revokeSession = async (token: string) => {
    setRevoking(true);
    try {
      const { error } = await authClient.revokeSession({ token });
      if (error) throw new Error(error.message);
      toast.success("Session révoquée");
      setSessions((prev) => prev.filter((s) => s.token !== token));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Révocation impossible"
      );
    } finally {
      setRevoking(false);
    }
  };

  const revokeAllOthers = async () => {
    if (!window.confirm("Déconnecter tous les autres appareils ?")) return;
    setRevoking(true);
    try {
      const { error } = await authClient.revokeOtherSessions();
      if (error) throw new Error(error.message);
      toast.success("Autres sessions révoquées");
      await loadSessions();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Révocation impossible"
      );
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlertIcon className="size-4 text-accent" />
          Sécurité
        </CardTitle>
        <CardDescription>Mot de passe et sessions actives.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showPassword ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <PasswordInput
                id="currentPassword"
                value={currentPassword}
                onChange={setCurrentPassword}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={setNewPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer</Label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sessions actives</Label>
                {sessions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void revokeAllOthers()}
                    disabled={revoking}
                  >
                    {revoking ? (
                      <LoaderIcon className="size-4 animate-spin" />
                    ) : (
                      <LogOutIcon className="size-4" />
                    )}
                    Se déconnecter des autres
                  </Button>
                )}
              </div>

              {loadingSessions ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2Icon className="size-5 animate-spin text-accent" />
                </div>
              ) : sessionError ? (
                <p className="py-2 text-xs text-muted-foreground">{sessionError}</p>
              ) : sessions.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">
                  Aucune session active.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <MonitorIcon className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {s.userAgent ?? "Appareil inconnu"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            Connecté le{" "}
                            {formatDate(s.createdAt)}
                            {s.ipAddress ? ` · ${s.ipAddress}` : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void revokeSession(s.token)}
                        disabled={revoking}
                      >
                        Révoquer
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPassword(false)}>
                Annuler
              </Button>
              <Button onClick={changePassword} disabled={changing}>
                {changing ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <KeyRoundIcon className="size-4" />
                )}
                Modifier le mot de passe
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setShowPassword(true)}>
            <KeyRoundIcon className="size-4" />
            Modifier le mot de passe
          </Button>
        )}
      </CardContent>
    </Card>
  );
}