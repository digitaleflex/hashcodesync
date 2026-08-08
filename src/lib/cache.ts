import { NextResponse } from "next/server";

export function withCache(
  data: unknown,
  ttlSeconds: number = 30,
  init?: { status?: number }
) {
  const response = NextResponse.json(data, init);
  response.headers.set(
    "Cache-Control",
    `private, max-age=${Math.max(ttlSeconds, 0)}, stale-while-revalidate=60`
  );
  return response;
}
