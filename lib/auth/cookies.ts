/**
 * Cookie policy for Akura sessions (§4.4).
 * Never set Domain — shared parent DNS (.elgiriya.com) must not receive app cookies.
 * Prefer Secure, HttpOnly, SameSite=Lax, Path=/ when setting auth cookies.
 */
export const sessionCookieOptions = {
  // Never set — __Host- forbids Domain; parent .elgiriya.com must not see cookies
  domain: undefined as undefined,
  path: "/",
  sameSite: "lax" as const,
  secure: true,
  httpOnly: true,
};
