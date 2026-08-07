import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CompassIcon } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent font-heading text-3xl font-bold text-white">
        404
      </div>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold">Page introuvable</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
      </div>
      <div className="flex gap-3">
        <Button nativeButton={false} render={<Link href="/" />}>
          <CompassIcon />
          Retour à l&apos;accueil
        </Button>
        <Button nativeButton={false} render={<Link href="/dashboard" />} variant="outline">
          Dashboard
        </Button>
      </div>
    </main>
  );
}
