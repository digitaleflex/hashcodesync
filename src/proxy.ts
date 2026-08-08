import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const protectedRoutes = [
  "/dashboard",
  "/disponibilites",
  "/ateliers",
  "/groupes",
  "/profil",
];

const roleRestricted: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/admin/groupes", roles: ["admin", "mentor"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/mentor", roles: ["admin", "mentor"] },
];

const SESSION_TTL_MS = 5 * 60 * 1000;

interface CachedSession {
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
  expiresAt: number;
}

const sessionCache = new Map<string, CachedSession>();

async function getCachedSession(headers: Headers) {
  const cookie = headers.get("cookie") ?? "";
  const cached = sessionCache.get(cookie);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.session;
  }
  const session = await auth.api.getSession({ headers });
  sessionCache.set(cookie, { session, expiresAt: Date.now() + SESSION_TTL_MS });
  return session;
}

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isRoleRestricted = roleRestricted.some((r) =>
    pathname.startsWith(r.prefix)
  );

  if ((isProtected || isRoleRestricted) && !sessionCookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isRoleRestricted && sessionCookie) {
    const session = await getCachedSession(request.headers);
    const required = roleRestricted.find((r) => pathname.startsWith(r.prefix));
    if (
      !session?.user ||
      (required && !required.roles.includes(session.user.role))
    ) {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
  }

  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/disponibilites/:path*",
    "/ateliers/:path*",
    "/groupes/:path*",
    "/admin/:path*",
    "/mentor/:path*",
    "/profil/:path*",
    "/login",
    "/register",
  ],
};