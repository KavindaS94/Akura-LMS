import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rowsOf } from "@/lib/db/result";

export const runtime = "nodejs";

/**
 * Resend bounce / complaint webhook.
 * Optionally verify with RESEND_WEBHOOK_SECRET (Svix) later; for now accept
 * structured payloads when RESEND_WEBHOOK_SECRET is unset (dev) or when
 * Authorization Bearer matches the secret.
 */
const eventSchema = z.object({
  type: z.string(),
  data: z
    .object({
      email_id: z.string().optional(),
      to: z.array(z.string()).optional(),
      bounce: z
        .object({
          message: z.string().optional(),
        })
        .optional(),
    })
    .passthrough(),
});

function authorized(req: Request): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const type = parsed.data.type.toLowerCase();
  const isBounce =
    type.includes("bounce") ||
    type.includes("failed") ||
    type.includes("complained");

  if (!isBounce) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const emails = parsed.data.data.to ?? [];
  let updated = 0;
  for (const email of emails) {
    const result = await db.execute(
      sql`SELECT app_mark_guardian_email_status(${email}, ${"bounced"}) AS n`,
    );
    updated += Number(rowsOf<{ n: number }>(result)[0]?.n ?? 0);
  }

  return NextResponse.json({ ok: true, updated });
}
