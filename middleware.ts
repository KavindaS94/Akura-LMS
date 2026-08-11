import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

const neonMiddleware = auth.middleware({
  loginUrl: "/login",
});

function isPublic(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/accept-invite") ||
    pathname.startsWith("/pending-approval") ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/r/") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/qr")
  );
}

export default async function middleware(req: NextRequest) {
  if (req.headers.has("next-action") || req.headers.has("Next-Action")) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const authResponse = await neonMiddleware(req);
  if (authResponse.status >= 300 && authResponse.status < 400) {
    return authResponse;
  }

  const requestHeaders = new Headers(req.headers);
  const match = pathname.match(/^\/i\/([^/]+)/);
  if (match?.[1]) {
    requestHeaders.set("x-akura-tenant-slug", decodeURIComponent(match[1]));
  }

  const next = NextResponse.next({
    request: { headers: requestHeaders },
  });

  authResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      next.headers.append(key, value);
    }
  });

  return next;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
