import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CalendarDaysIcon } from "lucide-react";

export default function AteliersPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-accent">
          <ArrowLeftIcon className="size-4" /> Retour au dashboard
        </Link>
        <Card className="bg-secondary/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDaysIcon className="size-5 text-accent" />
              Ateliers
            </CardTitle>
            <CardDescription>
              La gestion des ateliers et des séances de mentorat arrive bientôt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Cette section est en cours de développement. Les ateliers de la
              cohorte seront listés ici.
            </p>
            <Button render={<Link href="/dashboard" />} className="mt-4">
              Retour au dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}