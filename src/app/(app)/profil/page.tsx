"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAllTimezones,
  getBrowserTimezone,
} from "@/lib/timezones";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2Icon,
  SaveIcon,
  KeyRoundIcon,
  UserCircle2Icon,
} from "lucide-react";

const roleLabels: Record<string, string> = {
  member: "Membre",
  mentor: "Mentor",
  admin: "Administrateur",
};

const TIMEZONE_REGIONS = getAllTimezones();

export default function ProfilPage() {
  const router = useRouter();
  const { data, isPending, refetch } = authClient.useSession();
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [timezone, setTimezone] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  if (isPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-accent" />
      </div>
    );
  }

  const user = data?.user;
  const selectedTimezone = timezone ?? user?.timezone ?? getBrowserTimezone();

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstname, lastname, timezone: selectedTimezone }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Mise à jour impossible");
        return;
      }
      toast.success("Profil mis à jour");
      refetch();
      router.refresh();
    } catch {
      toast.error("Mise à jour impossible");
    } finally {
      setSaving(false);
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
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold">Mon profil</h1>
          {user && (
            <Badge variant="secondary">
              {roleLabels[user.role as string] ?? "Membre"}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Gérez vos informations personnelles et la sécurité de votre compte.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle2Icon className="size-4 text-accent" />
            Informations personnelles
          </CardTitle>
          <CardDescription>
            Ces informations sont visibles par la cohorte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstname">Prénom</Label>
              <Input
                id="firstname"
                value={firstname || user?.firstname || ""}
                onChange={(e) => setFirstname(e.target.value)}
                placeholder="Votre prénom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastname">Nom</Label>
              <Input
                id="lastname"
                value={lastname || user?.lastname || ""}
                onChange={(e) => setLastname(e.target.value)}
                placeholder="Votre nom"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Fuseau horaire</Label>
            <Select
              value={selectedTimezone}
              onValueChange={(v) => setTimezone(v ?? undefined)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un fuseau" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_REGIONS.map(({ region, zones }) => (
                  <SelectGroup key={region}>
                    <SelectLabel>{region}</SelectLabel>
                    {zones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Vos disponibilités seront interprétées dans ce fuseau et converties
              dans le fuseau de référence de la cohorte.
            </p>
          </div>
          <Button onClick={saveProfile} disabled={saving}>
            {saving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SaveIcon className="size-4" />
            )}
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-accent" />
            Mot de passe
          </CardTitle>
          <CardDescription>
            Les autres sessions seront déconnectées après le changement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Mot de passe actuel</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={changePassword}
            disabled={changing}
          >
            {changing ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <KeyRoundIcon className="size-4" />
            )}
            Modifier le mot de passe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}