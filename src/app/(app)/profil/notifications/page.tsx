"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageTitle } from "@/components/ui/page-title";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BellIcon, ChevronLeftIcon, Loader2Icon, SaveIcon } from "lucide-react";

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

const PREFS_ITEMS: {
  key: keyof NotificationPrefs;
  label: string;
  description: string;
}[] = [
  {
    key: "emailWorkshops",
    label: "Ateliers",
    description: "Création, modification, annulation",
  },
  {
    key: "emailGroups",
    label: "Groupes",
    description: "Invitations, demandes, admissions",
  },
  {
    key: "emailMentoring",
    label: "Mentorat",
    description: "Sessions et rappels",
  },
  {
    key: "emailSecurity",
    label: "Sécurité",
    description: "Connexions, changements de mot de passe",
  },
  {
    key: "emailReminders",
    label: "Rappels",
    description: "Disponibilités et validations",
  },
];

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/notification-preferences")
      .then((r) => r.json())
      .then((d) => {
        if (d.preferences) setPrefs(d.preferences);
      })
      .catch(() => toast.error("Impossible de charger les préférences"))
      .finally(() => setLoading(false));
  }, []);

  const savePrefs = async () => {
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

  const togglePref = (key: keyof NotificationPrefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <NavLink label="Retour au profil" href="/profil" icon={<ChevronLeftIcon className="size-4" />} />

      <PageTitle
        title="Notifications"
        badge={
          <span className="inline-flex h-6 items-center rounded-full bg-accent/15 px-3 text-xs font-medium text-accent">
            <BellIcon className="mr-1.5 size-3.5" />
            E-mail
          </span>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BellIcon className="size-5 text-accent" />
            Préférences de notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2Icon className="size-5 animate-spin text-accent" />
            </div>
          ) : (
            <div className="space-y-3">
              {PREFS_ITEMS.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-0.5">
                    <Label htmlFor={item.key} className="text-sm font-medium">
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <Switch
                    id={item.key}
                    checked={prefs[item.key]}
                    onCheckedChange={() => togglePref(item.key)}
                  />
                </div>
              ))}
              <Button
                onClick={savePrefs}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                {saving ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SaveIcon className="size-4" />
                )}
                Enregistrer les préférences
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Button
      nativeButton={false}
      render={<Link href={href} />}
      variant="ghost"
      className="-ml-2 gap-2"
    >
      {icon}
      {label}
    </Button>
  );
}