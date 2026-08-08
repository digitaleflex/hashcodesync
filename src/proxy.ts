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

// Routes nécessitant un rôle précis : vérification de session + rôle côté
// serveur dans le proxy (défense en profondeur, l'authzone reste dans les pages).
const roleRestricted: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/mentor", roles: ["admin", "mentor"] },
];

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
    // Validation réelle de la session + rôle (pas seulement la présence du cookie).
    const session = await auth.api.getSession({
      headers: new Headers(request.headers),
    });
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