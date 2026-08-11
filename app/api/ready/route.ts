import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Readiness — database reachable. */
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      ok: true,
      db: "up",
      time: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "db_down";
    return NextResponse.json(
      { ok: false, db: "down", error: message },
      { status: 503 },
    );
  }
}
