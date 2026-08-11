import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/middleware";

function isPublic(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/accept-invite") ||
    pathname.startsWith("/pending-approval") ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/r/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/qr")
  );
}

export default async function middleware(req: NextRequest) {
  if (req.headers.has("next-action") || req.headers.has("Next-Action")) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  const { response, user } = await updateSession(req);

  if (!isPublic(pathname) && !user) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const requestHeaders = new Headers(req.headers);
  const match = pathname.match(/^\/i\/([^/]+)/);
  if (match?.[1]) {
    requestHeaders.set("x-akura-tenant-slug", decodeURIComponent(match[1]));
  }

  const next = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.cookies.getAll().forEach((c) => {
    next.cookies.set(c);
  });

  return next;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
