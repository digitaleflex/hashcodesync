"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
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
    <html lang="fr" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 text-center text-foreground">
        <div className="font-heading text-lg font-semibold">
          Erreur critique
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          L&apos;application a rencontré une erreur inattendue.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="h-9 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-all hover:bg-accent/80"
          >
            Réessayer
          </button>
          <Link href="/" className="h-9 rounded-lg border px-4 text-sm font-medium transition-colors hover:bg-muted">
            Retour à l&apos;accueil
          </Link>
        </div>
      </body>
    </html>
  );
}
