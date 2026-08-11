import { NextResponse } from "next/server";

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
