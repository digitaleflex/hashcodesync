"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/notifications";
import {
  LogOutIcon,
  CalendarRangeIcon,
  CalendarDaysIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";

export function AppShell() {
  const router = useRouter();
  const pathname = usePathname();
  const { data } = authClient.useSession();
  const user = data?.user;

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  async function handleSignOut() {
    await authClient.signOut();
    toast.success("Déconnecté");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-primary/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="font-heading text-lg font-semibold text-accent"
        >
          HashCode Sync
        </Link>
        <nav className="flex items-center gap-1">
          <Button
            nativeButton={false}
            render={<Link href="/dashboard" />}
            variant="ghost"
            aria-current={isActive("/dashboard") ? "page" : undefined}
            className={isActive("/dashboard") ? "bg-muted text-accent" : "text-accent"}
          >
            Dashboard
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/disponibilites" />}
            variant="ghost"
            aria-current={isActive("/disponibilites") ? "page" : undefined}
            className={isActive("/disponibilites") ? "bg-muted" : ""}
          >
            <CalendarRangeIcon />
            Disponibilités
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/ateliers" />}
            variant="ghost"
            aria-current={isActive("/ateliers") ? "page" : undefined}
            className={isActive("/ateliers") ? "bg-muted" : ""}
          >
            <CalendarDaysIcon />
            Ateliers
          </Button>
          <Button
            nativeButton={false}
            render={<Link href="/groupes" />}
            variant="ghost"
            aria-current={isActive("/groupes") ? "page" : undefined}
            className={isActive("/groupes") ? "bg-muted" : ""}
          >
            <UsersIcon />
            Groupes
          </Button>
          {(user?.role === "mentor" || user?.role === "admin") && (
            <Button
              nativeButton={false}
              render={<Link href="/mentor" />}
              variant="ghost"
              aria-current={isActive("/mentor") ? "page" : undefined}
              className={isActive("/mentor") ? "bg-muted" : ""}
            >
              <ShieldCheckIcon />
              Mentor
            </Button>
          )}
          {user?.role === "admin" && (
            <Button
              nativeButton={false}
              render={<Link href="/admin" />}
              variant="ghost"
              aria-current={isActive("/admin") ? "page" : undefined}
              className={isActive("/admin") ? "bg-muted" : ""}
            >
              <LayoutDashboardIcon />
              Admin
            </Button>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <NotificationsBell />
          {user && (
            <Link
              href="/profil"
              className="hidden text-right sm:block group"
            >
              <p className="text-sm font-medium leading-none group-hover:text-accent transition-colors">
                {user.firstname} {user.lastname}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
            </Link>
          )}
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOutIcon />
            Déconnexion
          </Button>
        </div>
      </div>
    </header>
  );
}