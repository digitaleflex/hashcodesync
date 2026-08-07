"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RotateCwIcon, HomeIcon, TriangleAlertIcon } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent">
        <TriangleAlertIcon className="size-8" />
      </div>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold">
          Une erreur est survenue
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Quelque chose s&apos;est mal passé. Réessayez, ou revenez à
          l&apos;accueil.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>
          <RotateCwIcon />
          Réessayer
        </Button>
        <Button nativeButton={false} render={<Link href="/" />} variant="outline">
          <HomeIcon />
          Accueil
        </Button>
      </div>
    </main>
  );
}
