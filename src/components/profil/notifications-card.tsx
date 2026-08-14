"use client";

import { ProfileRow } from "@/components/profil/profile-row";
import { BellIcon } from "lucide-react";

export function NotificationsCard() {
  return (
    <ProfileRow
      icon={<BellIcon className="size-4.5" />}
      label="Notifications"
      value="Ateliers, groupes, mentorat et rappels"
      action="Configurer"
      href="/profil/notifications"
    />
  );
}