import { createBrowserClient } from "@supabase/ssr";
import { sessionCookieOptions } from "@/lib/auth/cookies";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required");
  }
  return createBrowserClient(url, key, {
    cookieOptions: sessionCookieOptions,
  });
}

/** @deprecated use createClient — kept name for gradual migration */
export const authClient = {
  get supabase() {
    return createClient();
  },
};
