import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CalendarRangeIcon } from "lucide-react";

export default function DisponibilitesPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-accent">
          <ArrowLeftIcon className="size-4" /> Retour au dashboard
        </Link>
        <Card className="bg-secondary/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarRangeIcon className="size-5 text-accent" />
              Disponibilités
            </CardTitle>
            <CardDescription>
              Le calendrier hebdomadaire de disponibilités arrive bientôt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Cette section est en cours de développement. Bientôt, vous pourrez
              définir vos créneaux hebdomadaires directement ici.
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