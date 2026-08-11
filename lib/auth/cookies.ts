/**
 * Cookie policy for Akura (§4.4).
 * Neon Auth SessionCookieConfig does not expose a `__Host-` name prefix.
 * We never set Domain, use SameSite=Lax, and rewrite Set-Cookie on the auth
 * handler toward `__Host-` names with Secure + HttpOnly + Path=/.
 */

export const sessionCookiePolicy = {
  // Never set — __Host- forbids Domain; parent .elgiriya.com must not see cookies
  domain: undefined as string | undefined,
  sameSite: "lax" as const,
};

const HOST_PREFIX = "__Host-";

/** Map Better Auth / Neon cookie base names to __Host- equivalents. */
const RENAME: Record<string, string> = {
  "better-auth.session_token": `${HOST_PREFIX}akura.session_token`,
  "better-auth.session_data": `${HOST_PREFIX}akura.session_data`,
  "__Secure-better-auth.session_token": `${HOST_PREFIX}akura.session_token`,
  "__Secure-better-auth.session_data": `${HOST_PREFIX}akura.session_data`,
};

function rewriteOneSetCookie(header: string): string {
  const nameMatch = header.match(/^([^=]+)=/);
  if (!nameMatch) return header;

  const originalName = nameMatch[1]!.trim();
  const newName = RENAME[originalName] ?? (
    originalName.startsWith(HOST_PREFIX)
      ? originalName
      : originalName.includes("session")
        ? `${HOST_PREFIX}akura.${originalName.replace(/^__Secure-/, "").replace(/^better-auth\./, "")}`
        : originalName
  );

  let next = header.replace(originalName, newName);
  // Strip Domain=...
  next = next.replace(/;\s*Domain=[^;]*/gi, "");
  // Ensure Path=/
  if (!/;\s*Path=/i.test(next)) {
    next += "; Path=/";
  } else {
    next = next.replace(/;\s*Path=[^;]*/i, "; Path=/");
  }
  // Ensure Secure
  if (!/;\s*Secure/i.test(next)) {
    next += "; Secure";
  }
  // Ensure HttpOnly for session tokens
  if (/session_token/i.test(newName) && !/;\s*HttpOnly/i.test(next)) {
    next += "; HttpOnly";
  }
  // SameSite=Lax
  if (/;\s*SameSite=/i.test(next)) {
    next = next.replace(/;\s*SameSite=[^;]*/i, "; SameSite=Lax");
  } else {
    next += "; SameSite=Lax";
  }
  return next;
}

export function enforceHostCookies(response: Response): Response {
  const headers = new Headers(response.headers);
  const getSetCookie = (
    headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie?.();

  if (getSetCookie && getSetCookie.length > 0) {
    headers.delete("set-cookie");
    for (const c of getSetCookie) {
      headers.append("set-cookie", rewriteOneSetCookie(c));
    }
  } else {
    const single = headers.get("set-cookie");
    if (single) {
      headers.delete("set-cookie");
      headers.append("set-cookie", rewriteOneSetCookie(single));
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
