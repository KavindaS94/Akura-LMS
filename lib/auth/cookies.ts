/**
 * Cookie policy for Akura sessions (§4.4).
 * `__Host-` prefix forbids a Domain attribute — shared parent DNS
 * (.elgiriya.com) must never receive app cookies.
 * A `__Host-` cookie is only honored by browsers when it is Secure,
 * has Path=/, and has no Domain.
 */
export const sessionCookieName = "__Host-sb-auth-token";

export const sessionCookieOptions = {
  name: sessionCookieName,
  // Never set — __Host- forbids Domain; parent .elgiriya.com must not see cookies
  domain: undefined as undefined,
  path: "/",
  sameSite: "lax" as const,
  secure: true,
  httpOnly: true,
};
