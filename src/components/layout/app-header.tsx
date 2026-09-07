"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/notifications";
import { LogoSymbol } from "@/components/ui/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOutIcon, UserIcon, LayoutDashboardIcon, GraduationCapIcon, ShieldCheckIcon } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  member: "Membre",
  mentor: "Mentor",
  admin: "Administrateur",
};

const SPACE_LABELS: Record<string, { label: string; href: string; icon: typeof LayoutDashboardIcon }> = {
  member: { label: "Espace Membre", href: "/dashboard", icon: LayoutDashboardIcon },
  mentor: { label: "Espace Mentor", href: "/mentor", icon: GraduationCapIcon },
  admin: { label: "Espace Admin", href: "/admin", icon: ShieldCheckIcon },
};

function getCurrentSpace(pathname: string, role?: string): "member" | "mentor" | "admin" {
  if (pathname.startsWith("/admin") && role === "admin") return "admin";
  if (pathname.startsWith("/mentor") && (role === "mentor" || role === "admin")) return "mentor";
  return "member";
}

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { data } = authClient.useSession();
  const user = data?.user;
  const role = user?.role as string | undefined;
  const space = getCurrentSpace(pathname, role);
  const spaceInfo = SPACE_LABELS[space];

  const availableSpaces: Array<"member" | "mentor" | "admin"> = ["member"];
  if (role === "mentor" || role === "admin") availableSpaces.push("mentor");
  if (role === "admin") availableSpaces.push("admin");

  const initial = (user?.firstname?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  async function handleSignOut() {
    await authClient.signOut();
    toast.success("Déconnecté");
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0B1023]">
      <div className="mx-auto flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 text-white">
            <LogoSymbol size={22} />
            <span className="hidden sm:inline font-heading text-[15px] font-semibold tracking-tight">
              HashCode Sync
            </span>
          </Link>
          <span className="hidden sm:block h-4 w-px bg-white/10" aria-hidden />
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/10">
            <spaceInfo.icon className="size-3.5" />
            {spaceInfo.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Space switcher — visible si plusieurs espaces */}
          {availableSpaces.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-white/10">
              {availableSpaces.map((s) => {
                const info = SPACE_LABELS[s];
                const active = space === s;
                return (
                  <Link
                    key={s}
                    href={info.href as any}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active ? "bg-white text-[#0B1023]" : "text-[#A7B0C2] hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <info.icon className="size-3.5" />
                    <span className="hidden lg:inline">{info.label.replace("Espace ", "")}</span>
                  </Link>
                );
              })}
            </div>
          )}

          <NotificationsBell />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-9 gap-2 pl-1 pr-2 text-sm font-medium text-[#A7B0C2] hover:bg-white/[0.04] hover:text-white"
                  aria-label="Menu utilisateur"
                >
                  <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                    {initial}
                  </div>
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {user?.firstname} {user?.lastname?.[0] ?? ""}
                  </span>
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
                  {role && <p className="text-xs text-primary">{ROLE_LABELS[role] ?? role}</p>}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profil")}>
                <UserIcon className="size-4 mr-2" />
                Mon profil
              </DropdownMenuItem>
              {/* Raccourcis espaces dans le menu mobile */}
              {availableSpaces.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  {availableSpaces.map((s) => {
                    const info = SPACE_LABELS[s];
                    return (
                      <DropdownMenuItem key={s} onClick={() => router.push(info.href as any)}>
                        <info.icon className="size-4 mr-2" />
                        {info.label}
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void handleSignOut()}
                className="text-destructive focus:text-destructive"
              >
                <LogOutIcon className="size-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
