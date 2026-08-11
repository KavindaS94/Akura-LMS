import { NextResponse } from "next/server";
import { z } from "zod";
import {
  confirmBankTransferById,
  BillingError,
} from "@/capabilities/billing/lib/service";

export const runtime = "nodejs";

function authorized(req: Request): boolean {
  const secret =
    process.env.BANK_OPS_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

const bodySchema = z.object({
  transferId: z.string().uuid(),
  confirmedBy: z.string().min(1).optional(),
});

/** Ops confirmation for bank transfers (Bearer BANK_OPS_SECRET or CRON_SECRET). */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const result = await confirmBankTransferById({
      transferId: parsed.data.transferId,
      confirmedBy: parsed.data.confirmedBy ?? "ops",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status = err instanceof BillingError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
