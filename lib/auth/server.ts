import { createNeonAuth } from "@neondatabase/auth/next/server";
import { sessionCookiePolicy } from "./cookies";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    // Never set domain — required for __Host- compatible cookies on a shared parent DNS zone
    domain: sessionCookiePolicy.domain,
    sameSite: sessionCookiePolicy.sameSite,
  },
});
