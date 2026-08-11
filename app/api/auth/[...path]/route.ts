import { NextResponse } from "next/server";

/**
 * Neon Auth catch-all removed. Supabase Auth uses cookie sessions via
 * @supabase/ssr — no Better Auth HTTP handler on this path.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Use Supabase Auth. See /login and /auth/callback." },
    { status: 410 },
  );
}

export async function POST() {
  return GET();
}
