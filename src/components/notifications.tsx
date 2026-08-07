"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BellIcon,
  CheckCheckIcon,
  Loader2Icon,
  CalendarPlusIcon,
  PencilLineIcon,
  CalendarX2Icon,
  UserPlusIcon,
  InboxIcon,
} from "lucide-react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: string;
};

const TYPE_ICON: Record<string, typeof BellIcon> = {
  new_workshop: CalendarPlusIcon,
  workshop_update: PencilLineIcon,
  workshop_cancelled: CalendarX2Icon,
  participant_joined: UserPlusIcon,
};

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

export function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const d = await res.json();
      setItems(d.notifications);
      setUnread(d.unread);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "POST" });
    setItems((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      return next;
    });
    setUnread((u) => Math.max(0, u - 1));
  }

  async function markAllRead() {
    setBusy(true);
    const res = await fetch("/api/notifications/read-all", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } else {
      toast.error("Impossible de marquer comme lu");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <BellIcon />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription>
            {unread > 0
              ? `${unread} non lue${unread > 1 ? "s" : ""}`
              : "Aucune notification non lue."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <InboxIcon className="size-8" />
              <p className="text-sm">Aucune notification.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={markAllRead} disabled={unread === 0 || busy}>
                  {busy ? <Loader2Icon className="animate-spin" /> : <CheckCheckIcon />}
                  Tout marquer lu
                </Button>
              </div>
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {items.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? BellIcon;
                  return (
                    <li key={n.id} className="flex gap-3 py-2.5">
                      <span
                        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                          n.read ? "bg-muted text-muted-foreground" : "bg-accent/15 text-accent"
                        }`}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {n.title}
                          {!n.read && <span className="ml-2 inline-block size-1.5 rounded-full bg-accent align-middle" />}
                        </p>
                        {n.message && (
                          <p className="truncate text-xs text-muted-foreground">{n.message}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/70">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                      {!n.read && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => markRead(n.id)}
                          aria-label="Marquer comme lu"
                        >
                          <CheckCheckIcon className="size-3" />
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}