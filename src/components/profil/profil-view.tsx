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
import { CalendarCard } from "@/components/profil/calendar-card";
import { ProfileSectionTitle } from "@/components/profil/profile-section";

export function ProfilView(props: ProfilProps) {
  const router = useRouter();

  // Après une mutation serveur, re-fetch la page (Server Component) pour
  // que toutes les cartes reflètent la donnée fraîche.
  const refresh = () => router.refresh();

  return (
    <div className="space-y-8">
      <IdentityCard
        user={props.user}
        groups={props.groups}
        availability={props.availability}
        onSaved={refresh}
      />

      <section aria-label="Ma planification" className="space-y-4">
        <ProfileSectionTitle
          title="Ma planification"
          description="Vos disponibilités, préférences, limites, fuseau et absences définissent les créneaux que Sync recherche pour vous."
        />
        <div className="space-y-3">
          <AvailabilityCard availability={props.availability} />

          <div className="grid gap-3 md:grid-cols-2">
            <PreferencesCard
              preferences={props.planningPreferences}
              onSaved={refresh}
            />
            <LimitsCard
              preferences={props.planningPreferences}
              onSaved={refresh}
            />
            <TimezoneCard user={props.user} onSaved={refresh} />
            <AbsencesCard
              unavailabilities={props.unavailabilities}
              onSaved={refresh}
            />
          </div>
        </div>
      </section>

      <ReliabilityCard reliability={props.reliability} />

      <DataUsageCard />

      <section aria-label="Compte" className="space-y-4">
        <ProfileSectionTitle
          title="Compte"
          description="Notifications, sécurité et vos données."
        />
        <div className="space-y-3">
          <NotificationsCard />
          <SecurityCard user={props.user} />
          <CalendarCard />
          <DataCard />
        </div>
      </section>
    </div>
  );
}