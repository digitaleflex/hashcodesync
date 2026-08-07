import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/disponibilites",
  "/ateliers",
  "/groupes",
  "/admin",
  "/mentor",
  "/profil",
];

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some(
    (route) => pathname.startsWith(route)
  );

  if (isProtected && !sessionCookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
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
