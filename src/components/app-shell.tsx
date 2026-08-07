"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/notifications";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LogOutIcon,
  CalendarRangeIcon,
  CalendarDaysIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  UsersIcon,
  MenuIcon,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon, match: "/dashboard" },
  { href: "/disponibilites", label: "Disponibilités", icon: CalendarRangeIcon, match: "/disponibilites" },
  { href: "/ateliers", label: "Ateliers", icon: CalendarDaysIcon, match: "/ateliers" },
  { href: "/groupes", label: "Groupes", icon: UsersIcon, match: "/groupes" },
];

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

  const roleNav =
    user?.role === "mentor" || user?.role === "admin"
      ? [...NAV_ITEMS, { href: "/mentor", label: "Mentor", icon: ShieldCheckIcon, match: "/mentor" }]
      : NAV_ITEMS;
  const adminNav =
    user?.role === "admin"
      ? [...roleNav, { href: "/admin", label: "Admin", icon: LayoutDashboardIcon, match: "/admin" }]
      : roleNav;

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-primary/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href="/dashboard"
          className="font-heading text-lg font-semibold text-accent"
        >
          HashCode Sync
        </Link>

        {/* Navigation bureau (md+) */}
        <nav className="hidden items-center gap-1 md:flex">
          {adminNav.map((item) => {
            const active = isActive(item.match);
            return (
              <Button
                key={item.href}
                nativeButton={false}
                render={<Link href={item.href} />}
                variant="ghost"
                aria-current={active ? "page" : undefined}
                className={active ? "bg-muted" : ""}
              >
                <item.icon />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <NotificationsBell />
          {user && (
            <Link
              href="/profil"
              className="group hidden text-right sm:block"
            >
              <p className="text-sm font-medium leading-none group-hover:text-accent transition-colors">
                {user.firstname} {user.lastname}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
            </Link>
          )}
          <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={handleSignOut}>
            <LogOutIcon />
            Déconnexion
          </Button>

          {/* Menu mobile */}
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu">
                  <MenuIcon />
                </Button>
              }
            />
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle className="text-accent">HashCode Sync</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-2">
                {adminNav.map((item) => {
                  const active = isActive(item.match);
                  return (
                    <SheetClose
                      key={item.href}
                      render={
                        <Button
                          nativeButton={false}
                          render={<Link href={item.href} />}
                          variant="ghost"
                          className={`justify-start ${active ? "bg-muted" : ""}`}
                        >
                          <item.icon />
                          {item.label}
                        </Button>
                      }
                    />
                  );
                })}
              </nav>
              <div className="mt-4 border-t pt-4 sm:hidden">
                <Button variant="outline" className="w-full" onClick={handleSignOut}>
                  <LogOutIcon />
                  Déconnexion
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}