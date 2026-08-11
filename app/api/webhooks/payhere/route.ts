import { NextResponse } from "next/server";
import {
  handlePayHereNotify,
  BillingError,
} from "@/capabilities/billing/lib/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  try {
    const result = await handlePayHereNotify(form);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status = err instanceof BillingError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
