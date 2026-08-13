import { NextResponse } from "next/server";
import { z } from "zod";
import {
  handlePayHereNotify,
  BillingError,
} from "@/capabilities/billing/lib/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notifySchema = z.object({
  merchant_id: z.string().optional(),
  order_id: z.string().min(1),
  payment_id: z.string().optional(),
  payhere_amount: z.string().optional(),
  payhere_currency: z.string().optional(),
  status_code: z.string().min(1),
  md5sig: z.string().min(1),
  item_rec_status: z.string().optional(),
  subscription_id: z.string().optional(),
});

/** PayHere notify_url — application/x-www-form-urlencoded */
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  let form: Record<string, string> = {};

  try {
    if (contentType.includes("application/json")) {
      form = (await req.json()) as Record<string, string>;
    } else {
      const data = await req.formData();
      data.forEach((value, key) => {
        if (typeof value === "string") form[key] = value;
      });
    }
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = notifySchema.safeParse(form);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid notification payload" }, { status: 400 });
  }

  try {
    const result = await handlePayHereNotify(form);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status = err instanceof BillingError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
