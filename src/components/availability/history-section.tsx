"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2Icon, HistoryIcon } from "lucide-react";
import type { SlotInput } from "@/components/availability/shared";
import { HistoryWeek } from "@/components/availability/history-item";

type HistoryEntry = {
  id: string;
  weekStart: string;
  validatedAt: string;
  slots: SlotInput[];
};

export function HistorySection() {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: "10" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/availabilities/history?${params}`);
    if (!res.ok) {
      toast.error("Impossible de charger l'historique");
      return false;
    }
    const data = await res.json();
    setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
    setNextCursor(data.nextCursor ?? null);
    setHasMore(Boolean(data.hasMore));
    return true;
  }, []);

  useEffect(() => {
    const init = async () => {
      await load();
      setLoading(false);
    };
    void init();
  }, [load]);

  async function handleMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    await load(nextCursor);
    setLoadingMore(false);
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2Icon className="size-5 animate-spin text-accent" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Aucune semaine validée pour l&apos;instant. Votre historique apparaîtra ici à chaque
          validation.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <HistoryWeek
              key={s.id}
              id={s.id}
              weekStart={s.weekStart}
              validatedAt={s.validatedAt}
              slots={s.slots}
            />
          ))}
        </ul>
      )}

      {!loading && hasMore && (
        <div className="pt-1">
          <Button
            variant="outline"
            className="h-11 w-full sm:h-9 sm:w-auto"
            onClick={() => void handleMore()}
            disabled={loadingMore}
            aria-busy={loadingMore}
          >
            {loadingMore ? <Loader2Icon className="size-4 animate-spin" /> : <HistoryIcon className="size-4" />}
            Charger plus
          </Button>
        </div>
      )}
    </div>
  );
}