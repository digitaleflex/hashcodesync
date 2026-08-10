"use client";

import { useRouter } from "next/navigation";
import { ProfilProps } from "@/components/profil/types";
import { IdentityCard } from "@/components/profil/identity-card";
import { AvailabilityCard } from "@/components/profil/availability-card";
import { PreferencesCard } from "@/components/profil/preferences-card";
import { LimitsCard } from "@/components/profil/limits-card";
import { TimezoneCard } from "@/components/profil/timezone-card";
import { AbsencesCard } from "@/components/profil/absences-card";
import { ReliabilityCard } from "@/components/profil/reliability-card";
import { DataUsageCard } from "@/components/profil/data-usage-card";
import { NotificationsCard } from "@/components/profil/notifications-card";
import { SecurityCard } from "@/components/profil/security-card";
import { DataCard } from "@/components/profil/data-card";

export function ProfilView(props: ProfilProps) {
  const router = useRouter();

  // Après une mutation serveur, re-fetch la page (Server Component) pour
  // que toutes les cartes reflètent la donnée fraîche.
  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      <IdentityCard user={props.user} groups={props.groups} onSaved={refresh} />

      <div className="grid gap-4 md:grid-cols-2">
        <AvailabilityCard availability={props.availability} />
        <PreferencesCard
          preferences={props.planningPreferences}
          onSaved={refresh}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LimitsCard preferences={props.planningPreferences} onSaved={refresh} />
        <TimezoneCard user={props.user} onSaved={refresh} />
      </div>

      <AbsencesCard
        unavailabilities={props.unavailabilities}
        onSaved={refresh}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <ReliabilityCard reliability={props.reliability} />
        <DataUsageCard />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <NotificationsCard />
        <SecurityCard user={props.user} />
      </div>

      <DataCard />
    </div>
  );
}