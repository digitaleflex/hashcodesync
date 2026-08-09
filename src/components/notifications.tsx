"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  AlertCircleIcon,
  BellIcon,
  CalendarPlusIcon,
  CalendarRangeIcon,
  CalendarX2Icon,
  CheckCheckIcon,
  InboxIcon,
  Loader2Icon,
  PencilLineIcon,
  TrashIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: string;
};

type FilterId = "all" | "unread" | "workshops" | "groups" | "mentorship" | "availability";

// Métadonnées par type : icône, catégorie de filtre et cible de navigation.
// Les cibles restent sur des routes réellement présentes dans le projet.
const TYPE_META: Record<
  string,
  { icon: typeof BellIcon; filter: FilterId; href?: string }
> = {
  new_workshop: { icon: CalendarPlusIcon, filter: "workshops", href: "/ateliers" },
  workshop_update: { icon: PencilLineIcon, filter: "workshops", href: "/ateliers" },
  workshop_cancelled: { icon: CalendarX2Icon, filter: "workshops", href: "/ateliers" },
  participant_joined: { icon: UserPlusIcon, filter: "workshops", href: "/ateliers" },
  group_invite: { icon: UsersIcon, filter: "groups", href: "/groupes" },
  group_request: { icon: UsersIcon, filter: "groups", href: "/groupes" },
  group_joined: { icon: UsersIcon, filter: "groups", href: "/groupes" },
  mentorship_session: { icon: UserPlusIcon, filter: "mentorship", href: "/mentor" },
  mentorship_reminder: { icon: BellIcon, filter: "mentorship", href: "/mentor" },
  availability_reminder: { icon: CalendarRangeIcon, filter: "availability", href: "/disponibilites" },
  availability_validation: { icon: CalendarRangeIcon, filter: "availability", href: "/disponibilites" },
};

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "unread", label: "Non lues" },
  { id: "workshops", label: "Ateliers" },
  { id: "groups", label: "Groupes" },
  { id: "mentorship", label: "Mentorat" },
  { id: "availability", label: "Disponibilités" },
];

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

function unreadLabel(unread: number) {
  if (unread === 0) return "Aucune notification non lue.";
  return `${unread} non lue${unread > 1 ? "s" : ""}`;
}

function matchesFilter(n: NotificationItem, filter: FilterId) {
  if (filter === "all") return true;
  if (filter === "unread") return !n.read;
  return TYPE_META[n.type]?.filter === filter;
}

function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<FilterId>("all");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        setError(true);
        return;
      }
      const d = await res.json();
      setItems(Array.isArray(d.notifications) ? d.notifications : []);
      setUnread(typeof d.unread === "number" ? d.unread : 0);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  async function markRead(id: string) {
    const prevItems = items;
    const prevUnread = unread;
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setItems(prevItems);
      setUnread(prevUnread);
      toast.error("Impossible de marquer comme lue");
    }
  }

  async function deleteNotification(id: string) {
    const prevItems = items;
    const prevUnread = unread;
    const item = items.find((n) => n.id === id);
    setItems((cur) => cur.filter((n) => n.id !== id));
    if (item && !item.read) {
      setUnread((u) => Math.max(0, u - 1));
    }
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setItems(prevItems);
      setUnread(prevUnread);
      toast.error("Impossible de supprimer");
    }
  }

  async function markAllRead() {
    if (unread === 0 || markingAll) return;
    const prevItems = items;
    const prevUnread = unread;
    setMarkingAll(true);
    setItems((cur) => cur.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setItems(prevItems);
      setUnread(prevUnread);
      toast.error("Impossible de marquer comme lu");
    } finally {
      setMarkingAll(false);
    }
  }

  return {
    items,
    unread,
    loading,
    error,
    markingAll,
    filter,
    setFilter,
    markRead,
    markAllRead,
    deleteNotification,
    reload: load,
  };
}

function bellLabel(unread: number) {
  return unread > 0
    ? `Notifications, ${unread} non lue${unread > 1 ? "s" : ""}`
    : "Notifications";
}

function BellBadge({ unread }: { unread: number }) {
  if (unread <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white"
    >
      {unread > 99 ? "99+" : unread}
    </span>
  );
}

// Ligne de notification : cliquable si une cible existe, sinon marquable en lu.
export function NotificationItem({
  notification,
  onOpen,
  onMarkRead,
  onDelete,
}: {
  notification: NotificationItem;
  onOpen: (id: string) => void;
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const meta = TYPE_META[notification.type];
  const Icon = meta?.icon ?? BellIcon;
  const href = meta?.href;
  const unread = !notification.read;

  const body = (
    <>
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          unread ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={unread ? "text-sm font-semibold" : "text-sm font-medium"}>
          {notification.title}
          {unread && (
            <span
              aria-hidden="true"
              className="ml-2 inline-block size-1.5 rounded-full bg-accent align-middle"
            />
          )}
        </p>
        {notification.message && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {notification.message}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/70">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
    </>
  );

  const linkClasses =
    "flex min-w-0 flex-1 items-start gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <li className={cn("rounded-lg", unread && "bg-muted/40")}>
      <div className="flex min-h-11 items-center gap-2 px-2 py-1.5">
        {href ? (
          <Link href={href as Route} onClick={() => onOpen(notification.id)} className={linkClasses}>
            {body}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onOpen(notification.id)}
            className={cn(linkClasses, "text-left")}
          >
            {body}
          </button>
        )}
        {unread && onMarkRead && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onMarkRead(notification.id)}
            aria-label="Marquer comme lue"
            className="shrink-0 max-md:size-11"
          >
            <CheckCheckIcon />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(notification.id)}
            aria-label="Supprimer"
            className="shrink-0 max-md:size-11 text-destructive hover:text-destructive"
          >
            <TrashIcon />
          </Button>
        )}
      </div>
    </li>
  );
}

function SkeletonRows() {
  return (
    <div aria-hidden="true" className="space-y-0.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-2 py-2.5">
          <span className="size-8 shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationList({
  n,
  onOpen,
  variant,
}: {
  n: ReturnType<typeof useNotifications>;
  onOpen: (id: string) => void;
  variant: "popover" | "sheet";
}) {
  const { items, loading, error, filter, setFilter, markRead, deleteNotification, reload } = n;

  const filtered = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [items, filter]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        role="group"
        aria-label="Filtrer les notifications"
        className="flex gap-1 overflow-x-auto border-b px-4 py-2"
      >
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className={cn(
                "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "overflow-y-auto px-2 py-1",
          variant === "popover"
            ? "max-h-[min(24rem,50vh)]"
            : "max-h-[min(28rem,60dvh)]"
        )}
      >
        {loading ? (
          <SkeletonRows />
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <AlertCircleIcon className="size-8" />
            <p className="text-sm">Impossible de charger les notifications.</p>
            <Button variant="outline" size="sm" onClick={() => void reload()}>
              Réessayer
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <InboxIcon className="size-8" />
            <p className="text-sm">
              {items.length === 0
                ? "Aucune notification."
                : "Aucune notification dans ce filtre."}
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((item) => (
              <NotificationItem
                key={item.id}
                notification={item}
                onOpen={onOpen}
                onMarkRead={(id) => void markRead(id)}
                onDelete={(id) => void deleteNotification(id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MarkAllButton({
  unread,
  markingAll,
  onClick,
}: {
  unread: number;
  markingAll: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={unread === 0 || markingAll}
    >
      {markingAll ? <Loader2Icon className="animate-spin" /> : <CheckCheckIcon />}
      Tout marquer lu
    </Button>
  );
}

export function NotificationsBell() {
  const n = useNotifications();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  function openNotification(id: string) {
    void n.markRead(id);
    setPopoverOpen(false);
    setSheetOpen(false);
  }

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="relative hidden md:inline-flex"
              aria-label={bellLabel(n.unread)}
              aria-controls="notifications-popover"
            >
              <BellIcon />
              <BellBadge unread={n.unread} />
            </Button>
          }
        />
        <PopoverContent
          id="notifications-popover"
          align="end"
          className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden p-0"
        >
          <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
            <div>
              <h2 className="font-heading text-base font-medium">Notifications</h2>
              <p className="text-xs text-muted-foreground">{unreadLabel(n.unread)}</p>
            </div>
            <MarkAllButton
              unread={n.unread}
              markingAll={n.markingAll}
              onClick={() => void n.markAllRead()}
            />
          </div>
          <NotificationList n={n} onOpen={openNotification} variant="popover" />
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setPopoverOpen(false);
                setSheetOpen(true);
              }}
            >
              <InboxIcon />
              Tout voir
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="relative md:hidden"
              aria-label={bellLabel(n.unread)}
              aria-controls="notifications-sheet"
            >
              <BellIcon />
              <BellBadge unread={n.unread} />
            </Button>
          }
        />
        <SheetContent
          side="bottom"
          id="notifications-sheet"
          className="mx-auto w-full max-h-[85dvh] gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b p-4 pb-2">
            <div className="flex items-center justify-between gap-2 pr-8">
              <div>
                <SheetTitle>Notifications</SheetTitle>
                <SheetDescription>{unreadLabel(n.unread)}</SheetDescription>
              </div>
              <MarkAllButton
                unread={n.unread}
                markingAll={n.markingAll}
                onClick={() => void n.markAllRead()}
              />
            </div>
          </SheetHeader>
          <NotificationList n={n} onOpen={openNotification} variant="sheet" />
        </SheetContent>
      </Sheet>
    </>
  );
}
