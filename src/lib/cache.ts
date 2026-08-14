import { NextResponse } from "next/server";
import { REFERENCE_TIMEZONE } from "@/lib/timezone";

// Cache-Control « private, no-cache » pour les réponses lourdes (routes API
// encore en dépendance). Conservé pour compat tant que les routes utilisent
// withCache ; préférer noStore / schedulingCacheKey pour les nouvelles routes.
export function withCache(
  data: unknown,
  _ttlSeconds: number = 30,
  init?: { status?: number }
) {
  const response = NextResponse.json(data, init);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, max-age=0, must-revalidate"
  );
  return response;
}

export function noStore(
  data: unknown,
  init?: { status?: number }
) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export interface SchedulingCacheKeyArgs {
  windowHours: number;
  groupId: string | null;
  activityId: string | null;
  smooth: boolean;
}

// Clé de cache partagée du calcul de scheduling : doit couvrir TOUS les
// paramètres qui modifient le payload (fenêtre, périmètre, lissage, fuseau).
export function schedulingCacheKey(args: SchedulingCacheKeyArgs) {
  return [
    args.windowHours,
    args.groupId ?? "",
    args.activityId ?? "",
    args.smooth ? "1" : "0",
    REFERENCE_TIMEZONE,
  ].join("|");
}
