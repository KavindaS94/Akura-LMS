import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sessionCookieOptions } from "@/lib/auth/cookies";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required");
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              // Never set Domain on shared parent DNS (§4.4)
              domain: undefined,
              sameSite: "lax",
              path: "/",
              secure: true,
              httpOnly: true,
            });
          });
        } catch {
          // Called from a Server Component — middleware will refresh sessions.
        }
      },
    },
  });
}

type AuthResult = {
  error: { message: string } | null;
  user?: { id: string; email: string } | null;
};

/**
 * Compatibility shim so existing actions can keep calling auth.signIn.email /
 * auth.signUp.email after leaving Neon Auth.
 */
export const auth = {
  signIn: {
    email: async (opts: {
      email: string;
      password: string;
    }): Promise<AuthResult> => {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: opts.email,
        password: opts.password,
      });
      return {
        error: error ? { message: error.message } : null,
        user: data.user
          ? { id: data.user.id, email: data.user.email ?? opts.email }
          : null,
      };
    },
  },
  signUp: {
    email: async (opts: {
      email: string;
      password: string;
      name?: string;
    }): Promise<AuthResult> => {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signUp({
        email: opts.email,
        password: opts.password,
        options: {
          data: { name: opts.name ?? null },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
        },
      });
      return {
        error: error ? { message: error.message } : null,
        user: data.user
          ? { id: data.user.id, email: data.user.email ?? opts.email }
          : null,
      };
    },
  },
  signOut: async (): Promise<AuthResult> => {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    return { error: error ? { message: error.message } : null };
  },
};
