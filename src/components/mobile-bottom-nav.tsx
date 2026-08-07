"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
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
  MoreHorizontalIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: string;
};

const PRIMARY_TABS: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboardIcon, match: "/dashboard" },
  { href: "/disponibilites", label: "Dispo", icon: CalendarRangeIcon, match: "/disponibilites" },
  { href: "/ateliers", label: "Ateliers", icon: CalendarDaysIcon, match: "/ateliers" },
];

export function MobileBottomNav({ userRole }: { userRole?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  const secondary: NavItem[] = [
    { href: "/profil", label: "Profil", icon: UserIcon, match: "/profil" },
    { href: "/groupes", label: "Groupes", icon: UsersIcon, match: "/groupes" },
  ];
  if (userRole === "mentor" || userRole === "admin") {
    secondary.push({ href: "/mentor", label: "Mentorat", icon: ShieldCheckIcon, match: "/mentor" });
  }
  if (userRole === "admin") {
    secondary.push({ href: "/admin", label: "Admin", icon: LayoutDashboardIcon, match: "/admin" });
  }

  async function handleSignOut() {
    await authClient.signOut();
    toast.success("Déconnecté");
    router.push("/login");
    router.refresh();
  }

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="grid h-14 grid-cols-5 items-stretch">
        {PRIMARY_TABS.map((item) => {
          const active = isActive(item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <item.icon
                className={active ? "size-5 text-accent" : "size-5 text-muted-foreground"}
              />
              <span className={active ? "text-accent" : "text-muted-foreground"}>{item.label}</span>
            </Link>
          );
        })}

        {/* Onglet Plus */}
        <Sheet>
          <SheetTrigger
            render={
              <button
                type="button"
                className="flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Plus d'options"
              >
                <MoreHorizontalIcon className="size-5" />
                <span>Plus</span>
              </button>
            }
          />
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle className="text-accent">Plus d&apos;options</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-2">
              {secondary.map((item) => {
                const active = isActive(item.match);
                return (
                  <SheetClose
                    key={item.href}
                    render={
                      <Button
                        nativeButton={false}
                        render={<Link href={item.href} />}
                        variant="ghost"
                        className={`justify-start text-base ${active ? "bg-muted" : ""}`}
                      >
                        <item.icon />
                        {item.label}
                      </Button>
                    }
                  />
                );
              })}
              <Button
                variant="outline"
                className="justify-start text-base"
                onClick={() => void handleSignOut()}
              >
                <LogOutIcon />
                Déconnexion
              </Button>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Onglet Profil */}
        {(() => {
          const active = isActive("/profil");
          return (
            <Link
              href="/profil"
              aria-current={active ? "page" : undefined}
              className="flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <UserIcon className={active ? "size-5 text-accent" : "size-5 text-muted-foreground"} />
              <span className={active ? "text-accent" : "text-muted-foreground"}>Profil</span>
            </Link>
          );
        })()}
      </div>
    </nav>
  );
}