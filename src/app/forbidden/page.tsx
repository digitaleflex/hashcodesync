import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlertIcon } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent">
        <ShieldAlertIcon className="size-8" />
      </div>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold">Accès refusé</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Vous n&apos;avez pas les droits nécessaires pour accéder à cette page.
        </p>
      </div>
      <Button nativeButton={false} render={<Link href="/dashboard" />}>
        Retour au dashboard
      </Button>
    </main>
  );
}
