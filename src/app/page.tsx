import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent font-heading text-3xl font-bold text-white">
        H
      </div>
      <div className="space-y-2">
        <h1 className="font-heading text-4xl font-bold text-accent">
          HashCode Sync
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Scheduling &amp; Cohort Coordination System — centralisez les
          disponibilités, trouvez les meilleurs créneaux et planifiez les
          ateliers de la cohorte.
        </p>
      </div>
      <div className="flex gap-3">
        <Button nativeButton={false} render={<Link href="/login" />} size="lg">
          Se connecter
        </Button>
        <Button nativeButton={false} render={<Link href="/register" />} size="lg" variant="outline">
          S&apos;inscrire
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Identifie. Développe. Impacte. — HashCode Community
      </p>
    </main>
  );
}
