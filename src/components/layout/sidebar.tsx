"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  UserIcon,
  LayoutDashboardIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  BookOpenIcon,
  UsersIcon,
  ShieldCheckIcon,
  GraduationCapIcon,
  MailIcon,
  BarChart3Icon,
} from "lucide-react";

import { NAV_ITEMS, SIDEBAR_CONFIG, type SpaceKey } from "./sidebar-config";

const ICON_MAP: Record<string, React.ElementType> = {
  User: UserIcon,
  LayoutDashboard: LayoutDashboardIcon,
  CalendarDays: CalendarDaysIcon,
  CalendarRange: CalendarRangeIcon,
  BookOpen: BookOpenIcon,
  Users: UsersIcon,
  ShieldCheck: ShieldCheckIcon,
  GraduationCap: GraduationCapIcon,
  Mail: MailIcon,
  BarChart3: BarChart3Icon,
  CalendarCheck2: CalendarRangeIcon,
};

export function Sidebar({ className, spaceKey }: { className?: string; spaceKey: SpaceKey }) {
  const pathname = usePathname();
  const config = SIDEBAR_CONFIG[spaceKey];
  if (!config) return null;

  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : pathname === path || pathname.startsWith(path + "/");

  const roleMap: Record<SpaceKey, "member" | "mentor" | "admin"> = {
    member: "member",
    mentor: "mentor",
    admin: "admin",
  };

  const items = NAV_ITEMS.filter((item) => item.roles.includes(roleMap[spaceKey]));

  return (
    <aside
      className={cn(
        "flex w-64 shrink-0 flex-col border-r shadow-sm",
        className
      )}
      aria-label={`Navigation ${config.title}`}
    >
      <div className="px-4 py-4 border-b bg-[var(--card)]">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {(() => {
              const BrandIcon = ICON_MAP[config.brandIcon];
              return BrandIcon ? <BrandIcon className="size-5" /> : null;
            })()}
          </div>
<div>
  <p className="text-xs font-bold tracking-widest uppercase text-primary">{config.title}</p>
  <p className="text-sm font-semibold leading-none text-white/90">{config.subtitle}</p>
</div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{config.description}</p>
      </div>

      <div className="h-px bg-border" />

      <nav className="flex-1 space-y-1 p-2" aria-label="Menu sidebar">
        {items.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = ICON_MAP[item.icon];
          return (
            <Button
              key={item.href}
              nativeButton={false}
              render={<Link href={item.href as Route} />}
              variant="ghost"
              aria-current={active ? "page" : undefined}
              className={cn(
                "h-auto w-full justify-start gap-3 px-3 py-2.5 text-left",
                active
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
              <span className="flex flex-col items-start">
                <span className="text-sm font-medium leading-none">{item.label}</span>
                {item.desc && (
                  <span
                    className={cn(
                      "text-xs leading-none",
                      active ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {item.desc}
                  </span>
                )}
              </span>
            </Button>
          );
        })}
      </nav>

      {config.badge && (
        <div className="border-t p-3">
          <div className="rounded-lg bg-primary/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              {(() => {
                const BadgeIcon = ICON_MAP[config.badge.icon as string];
                return BadgeIcon ? <BadgeIcon className="size-4 text-primary" /> : null;
              })()}
              <span className="font-medium text-primary">{config.badge.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{config.badge.description}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
