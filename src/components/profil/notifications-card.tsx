"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BellIcon, ChevronRightIcon } from "lucide-react";

export function NotificationsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellIcon className="size-4 text-accent" />
          Notifications
        </CardTitle>
        <CardDescription>
          Ateliers, groupes, mentorat, sécurité, rappels.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Choisissez les e-mails que vous souhaitez recevoir de HashCode Sync.
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/profil/notifications" />}
          variant="outline"
          className="mt-4 w-full"
        >
          Configurer mes notifications
          <ChevronRightIcon className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}