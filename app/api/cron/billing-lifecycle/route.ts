import { NextResponse } from "next/server";
import { runBillingLifecycle } from "@/capabilities/billing/lib/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runBillingLifecycle();
  return NextResponse.json({ ok: true, ...summary });
}

export async function POST(req: Request) {
  return GET(req);
}
