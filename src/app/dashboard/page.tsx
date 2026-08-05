"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2Icon, CalendarDaysIcon, UsersIcon, LogOutIcon, CalendarRangeIcon } from "lucide-react";

const roleLabels: Record<string, string> = {
  member: "Membre",
  mentor: "Mentor",
  admin: "Administrateur",
};

export default function DashboardPage() {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    toast.success("Déconnecté");
    router.push("/login");
    router.refresh();
  }

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-accent" />
      </main>
    );
  }

  const user = data?.user;

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-primary/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard" className="font-heading text-lg font-semibold text-accent">
            HashCode Sync
          </Link>
          <nav className="flex items-center gap-1">
            <Button render={<Link href="/dashboard" />} variant="ghost" className="text-accent">
              Dashboard
            </Button>
            <Button render={<Link href="/disponibilites" />} variant="ghost">
              <CalendarRangeIcon />
              Disponibilités
            </Button>
            <Button render={<Link href="/ateliers" />} variant="ghost">
              <CalendarDaysIcon />
              Ateliers
            </Button>
          </nav>
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-none">
                  {user.firstname} {user.lastname}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOutIcon />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold">
              Bonjour {user?.firstname} 👋
            </h1>
            {user && (
              <Badge variant="secondary">
                {roleLabels[user.role as string] ?? "Membre"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Gérez vos disponibilités, retrouvez vos ateliers et restez synchronisé avec la cohorte.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarRangeIcon className="size-4 text-accent" />
                Mes disponibilités
              </CardTitle>
              <CardDescription>
                Indiquez les créneaux où vous êtes disponible chaque semaine.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/disponibilites" />}>
                Renseigner mes disponibilités
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDaysIcon className="size-4 text-accent" />
                Mes ateliers
              </CardTitle>
              <CardDescription>
                Consultez vos ateliers et séances de mentorat à venir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/ateliers" />} variant="outline">
                Voir les ateliers
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
