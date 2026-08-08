"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/notifications";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { LogoSymbol } from "@/components/ui/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboardIcon,
  CalendarRangeIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  UsersIcon,
  LogOutIcon,
  UserIcon,
  MenuIcon,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon, match: "/dashboard" },
  { href: "/disponibilites", label: "Disponibilités", icon: CalendarRangeIcon, match: "/disponibilites" },
  { href: "/ateliers", label: "Ateliers", icon: CalendarDaysIcon, match: "/ateliers" },
  { href: "/groupes", label: "Groupes", icon: UsersIcon, match: "/groupes" },
  { href: "/mentor", label: "Mentorat", icon: ShieldCheckIcon, match: "/mentor" },
];

export function AppShell() {
  const router = useRouter();
  const pathname = usePathname();
  const { data } = authClient.useSession();
  const user = data?.user;

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  const roleNav =
    user?.role === "mentor" || user?.role === "admin"
      ? NAV_ITEMS
      : NAV_ITEMS.filter((item) => item.match !== "/mentor");

  const showAdmin = user?.role === "admin";

  async function handleSignOut() {
    await authClient.signOut();
    toast.success("Déconnecté");
    router.push("/login");
  }

  const initial = (user?.firstname?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0B1023]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {}
          <Link href="/dashboard" className="flex items-center gap-2.5 text-white">
            <LogoSymbol size={24} />
            <span className="font-heading text-lg font-semibold tracking-tight">HashCode Sync</span>
          </Link>

          {}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Navigation principale">
            {roleNav.map((item) => {
              const active = isActive(item.match);
              return (
                <Button
                  key={item.href}
                  nativeButton={false}
                  render={<Link href={item.href} />}
                  variant="ghost"
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "h-9 gap-2 px-3 text-sm font-medium",
                    active
                      ? "bg-white/[0.06] text-white"
                      : "text-[#A7B0C2] hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Button>
              );
            })}
            {showAdmin && (
              <Button
                nativeButton={false}
                render={<Link href="/admin" />}
                variant="ghost"
                aria-current={isActive("/admin") ? "page" : undefined}
                className={cn(
                  "h-9 gap-2 px-3 text-sm font-medium",
                  isActive("/admin")
                    ? "bg-white/[0.06] text-white"
                    : "text-[#A7B0C2] hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <ShieldCheckIcon className="size-4" />
                Administration
              </Button>
            )}
          </nav>

          {}
          <div className="flex items-center gap-2">
            <NotificationsBell />

            {}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-9 gap-2 pl-1 pr-2 text-sm font-medium text-[#A7B0C2] hover:bg-white/[0.04] hover:text-white"
                  >
                    <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                      {initial}
                    </div>
                    <span className="hidden sm:inline max-w-[120px] truncate">
                      {user?.firstname} {user?.lastname?.[0] ?? ""}
                    </span>
                    <svg
                      className="size-3.5 text-[#A7B0C2]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user?.firstname} {user?.lastname}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    {showAdmin && (
                      <p className="text-xs text-primary">Administrateur</p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => router.push("/profil")}
                >
                  <UserIcon className="size-4 mr-2" />
                  Mon profil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => void handleSignOut()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOutIcon className="size-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {}
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden text-[#A7B0C2] hover:bg-white/[0.04] hover:text-white"
                    aria-label="Menu"
                  >
                    <MenuIcon className="size-5" />
                  </Button>
                }
              />
              <SheetContent side="left" className="w-72 bg-[#0B1023] border-white/[0.08] p-0">
                <SheetHeader className="border-b border-white/[0.08] px-4 py-4">
                  <SheetTitle className="flex items-center gap-2 text-white">
                    <LogoSymbol size={20} />
                    <span className="font-heading font-semibold">HashCode Sync</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-2" aria-label="Navigation mobile">
                  {roleNav.map((item) => {
                    const active = isActive(item.match);
                    return (
                      <Button
                        key={item.href}
                        nativeButton={false}
                        render={<Link href={item.href} />}
                        variant="ghost"
                        className={cn(
                          "justify-start gap-2 h-10",
                          active
                            ? "bg-white/[0.06] text-white"
                            : "text-[#A7B0C2] hover:bg-white/[0.04] hover:text-white"
                        )}
                      >
                        <item.icon className="size-4" />
                        {item.label}
                      </Button>
                    );
                  })}
                  {showAdmin && (
                    <Button
                      nativeButton={false}
                      render={<Link href="/admin" />}
                      variant="ghost"
                      className={cn(
                        "justify-start gap-2 h-10",
                        isActive("/admin")
                          ? "bg-white/[0.06] text-white"
                          : "text-[#A7B0C2] hover:bg-white/[0.04] hover:text-white"
                      )}
                    >
                      <ShieldCheckIcon className="size-4" />
                      Administration
                    </Button>
                  )}
                  <div className="my-2 border-t border-white/[0.08]" />
                  <Button
                    nativeButton={false}
                    render={<Link href="/profil" />}
                    variant="ghost"
                    className="justify-start gap-2 h-10 text-[#A7B0C2] hover:bg-white/[0.04] hover:text-white"
                  >
                    <UserIcon className="size-4" />
                    Mon profil
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-2 h-10 text-destructive hover:text-destructive"
                    onClick={() => void handleSignOut()}
                  >
                    <LogOutIcon className="size-4" />
                    Déconnexion
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <MobileBottomNav userRole={user?.role} />
    </>
  );
}
