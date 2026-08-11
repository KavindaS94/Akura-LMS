import { auth } from "@/lib/auth/server";

export async function getSessionUser() {
  const result = await auth.getSession();

  // Neon Auth may return { data, error } or a session-shaped object
  const payload = (result && typeof result === "object" && "data" in result
    ? (result as { data: unknown }).data
    : result) as {
    user?: { id?: string; email?: string; name?: string | null };
    session?: { user?: { id?: string; email?: string; name?: string | null } };
  } | null;

  const user = payload?.user ?? payload?.session?.user;
  if (!user?.id || !user.email) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
  };
}
