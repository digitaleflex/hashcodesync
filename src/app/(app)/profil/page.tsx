"use client";

import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
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
  BellIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllTimezones, getBrowserTimezone } from "@/lib/timezones";
import { PasswordInput } from "@/components/ui/password-input";

const roleLabels: Record<string, string> = {
  member: "Membre",
  mentor: "Mentor",
  admin: "Administrateur",
};

const TIMEZONE_REGIONS = getAllTimezones();

type NotificationPrefs = {
  emailWorkshops: boolean;
  emailGroups: boolean;
  emailMentoring: boolean;
  emailSecurity: boolean;
  emailReminders: boolean;
};

const defaultPrefs: NotificationPrefs = {
  emailWorkshops: true,
  emailGroups: true,
  emailMentoring: true,
  emailSecurity: true,
  emailReminders: true,
};

function getInitials(firstname?: string, lastname?: string): string {
  const f = firstname?.charAt(0).toUpperCase() ?? "?";
  const l = lastname?.charAt(0).toUpperCase() ?? "";
  return f + l;
}

export default function ProfilPage() {
  const router = useRouter();
  const { data, isPending, refetch } = authClient.useSession();

  const user = data?.user;
  const [firstname, setFirstname] = useState(user?.firstname ?? "");
  const [lastname, setLastname] = useState(user?.lastname ?? "");
  const [timezone, setTimezone] = useState<string | undefined>(user?.timezone);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [tzQuery, setTzQuery] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notifications state
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // UI state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Load notification preferences
  useEffect(() => {
    fetch("/api/notification-preferences")
      .then((r) => r.json())
      .then((d) => {
        if (d.preferences) setPrefs(d.preferences);
      })
      .catch(() => toast.error("Impossible de charger les préférences"))
      .finally(() => setPrefsLoading(false));
  }, []);

  const selectedTimezone = timezone ?? user?.timezone ?? getBrowserTimezone();
  const initials = getInitials(user?.firstname, user?.lastname);
  const fullName = `${user?.firstname ?? ""} ${user?.lastname ?? ""}`.trim() || "Utilisateur";

  const q = tzQuery.trim().toLowerCase();
  const filteredRegions = TIMEZONE_REGIONS.map(({ region, zones }) => ({
    region,
    zones: q ? zones.filter((z) => z.toLowerCase().includes(q)) : zones,
  })).filter((r) => r.zones.length > 0);

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
      setShowPasswordForm(false);
    } finally {
      setChanging(false);
    }
  };

  const savePrefs = async () => {
    setPrefsSaving(true);
    try {
      const res = await fetch("/api/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error();
      toast.success("Préférences enregistrées");
    } catch {
      toast.error("Enregistrement impossible");
    } finally {
      setPrefsSaving(false);
    }
  };

  const togglePref = (key: keyof NotificationPrefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  if (isPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-16 items-center justify-center rounded-full text-xl font-semibold",
            "bg-accent/15 text-accent ring-2 ring-accent/30"
          )}
        >
          {initials}
        </div>
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold">{fullName}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          {user && (
            <Badge variant="secondary">{roleLabels[user.role as string] ?? "Membre"}</Badge>
          )}
        </div>
      </div>

      {/* Personal Information */}
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
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                placeholder="Votre prénom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastname">Nom</Label>
              <Input
                id="lastname"
                value={lastname}
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
            <Label htmlFor="tz-search">Fuseau horaire</Label>
            <Input
              id="tz-search"
              placeholder="Rechercher un fuseau (ex. Porto, Paris…)"
              value={tzQuery}
              onChange={(e) => setTzQuery(e.target.value)}
            />
            <Select value={selectedTimezone} onValueChange={(v) => setTimezone(v ?? undefined)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un fuseau" />
              </SelectTrigger>
              <SelectContent>
                {filteredRegions.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    Aucun fuseau trouvé.
                  </p>
                ) : (
                  filteredRegions.map(({ region, zones }) => (
                    <SelectGroup key={region}>
                      <SelectLabel>{region}</SelectLabel>
                      {zones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                )}
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

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="size-4 text-accent" />
            Notifications
          </CardTitle>
          <CardDescription>
            Choisissez les e-mails que vous souhaitez recevoir de HashCode Sync.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {prefsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2Icon className="size-5 animate-spin text-accent" />
            </div>
          ) : (
            <>
              {[
                { key: "emailWorkshops" as const, label: "Ateliers", description: "Création, modification, annulation" },
                { key: "emailGroups" as const, label: "Groupes", description: "Invitations, demandes, admissions" },
                { key: "emailMentoring" as const, label: "Mentorat", description: "Sessions et rappels" },
                { key: "emailSecurity" as const, label: "Sécurité", description: "Connexions, changements de mot de passe" },
                { key: "emailReminders" as const, label: "Rappels", description: "Disponibilités et validations" },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-0.5">
                    <Label htmlFor={item.key} className="text-sm font-medium">
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    id={item.key}
                    checked={prefs[item.key]}
                    onCheckedChange={() => togglePref(item.key)}
                  />
                </div>
              ))}
              <Button onClick={savePrefs} disabled={prefsSaving} className="w-full sm:w-auto">
                {prefsSaving ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SaveIcon className="size-4" />
                )}
                Enregistrer les préférences
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Password */}
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
          {showPasswordForm ? (
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordForm(false)}
                >
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
            <Button
              variant="outline"
              onClick={() => setShowPasswordForm(true)}
            >
              <KeyRoundIcon className="size-4" />
              Modifier le mot de passe
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
