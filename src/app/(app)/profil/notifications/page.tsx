"use client";

import * as React from "react";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2Icon, BellIcon } from "lucide-react";

type Preferences = {
  emailWorkshops: boolean;
  emailGroups: boolean;
  emailMentoring: boolean;
  emailSecurity: boolean;
  emailReminders: boolean;
};

const defaultPrefs: Preferences = {
  emailWorkshops: true,
  emailGroups: true,
  emailMentoring: true,
  emailSecurity: true,
  emailReminders: true,
};

export default function NotificationPreferencesPage() {
  const { isPending } = useSession();
  const [prefs, setPrefs] = React.useState<Preferences>(defaultPrefs);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/notification-preferences")
      .then((r) => r.json())
      .then((d) => {
        if (d.preferences) setPrefs(d.preferences);
      })
      .catch(() => toast.error("Impossible de charger les préférences"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key: keyof Preferences) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const save = async () => {
    setSaving(true);
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
      setSaving(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-accent" />
      </div>
    );
  }

  const items: { key: keyof Preferences; label: string; description: string }[] = [
    { key: "emailWorkshops", label: "Ateliers", description: "Création, modification, annulation" },
    { key: "emailGroups", label: "Groupes", description: "Invitations, demandes, admissions" },
    { key: "emailMentoring", label: "Mentorat", description: "Sessions et rappels" },
    { key: "emailSecurity", label: "Sécurité", description: "Connexions, changements de mot de passe" },
    { key: "emailReminders", label: "Rappels", description: "Disponibilités et validations" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="size-4 text-accent" />
            Préférences de notifications
          </CardTitle>
          <CardDescription>
            Choisissez les e-mails que vous souhaitez recevoir de HashCode Sync.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor={item.key} className="text-sm font-medium">
                  {item.label}
                </Label>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                id={item.key}
                checked={prefs[item.key]}
                onCheckedChange={() => toggle(item.key)}
              />
            </div>
          ))}
          <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              "Enregistrer"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
