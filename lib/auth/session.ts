import { createClient } from "@/lib/auth/server";

export async function getSessionUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id || !data.user.email) return null;

  const name =
    (typeof data.user.user_metadata?.name === "string"
      ? data.user.user_metadata.name
      : null) ??
    data.user.email.split("@")[0] ??
    null;

  return {
    id: data.user.id,
    email: data.user.email,
    name,
  };
}
