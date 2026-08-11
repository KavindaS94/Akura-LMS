import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness — process is up (no DB). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "akura",
    time: new Date().toISOString(),
  });
}
