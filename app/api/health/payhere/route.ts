import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { TenantError } from "@/lib/tenant/resolve";
import { isPayHereConfigured, payHereCheckoutUrl } from "@/lib/billing/payhere";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

function describeSecret(value: string | undefined): Check {
  if (!value) {
    return {
      name: "PAYHERE_MERCHANT_SECRET",
      ok: false,
      detail: "Not set.",
    };
  }
  if (/your-|changeme|placeholder/i.test(value)) {
    return {
      name: "PAYHERE_MERCHANT_SECRET",
      ok: false,
      detail: "Still a placeholder value.",
    };
  }
  return {
    name: "PAYHERE_MERCHANT_SECRET",
    ok: true,
    detail: `Set (${value.length} characters).`,
  };
}

function describeMerchantId(value: string | undefined): Check {
  if (!value) {
    return { name: "PAYHERE_MERCHANT_ID", ok: false, detail: "Not set." };
  }
  if (!/^\d+$/.test(value)) {
    return {
      name: "PAYHERE_MERCHANT_ID",
      ok: false,
      detail: "Should be numeric — check you copied the Merchant ID, not an App ID.",
    };
  }
  return {
    name: "PAYHERE_MERCHANT_ID",
    ok: true,
    detail: `Set (${value.length} digits).`,
  };
}

function describeSiteUrl(value: string | undefined): Check {
  if (!value) {
    return {
      name: "NEXT_PUBLIC_SITE_URL",
      ok: false,
      detail: "Not set — notify_url cannot be built.",
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return {
      name: "NEXT_PUBLIC_SITE_URL",
      ok: false,
      detail: "Not a valid absolute URL.",
    };
  }
  const isLocal =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname.endsWith(".local");
  if (isLocal) {
    return {
      name: "NEXT_PUBLIC_SITE_URL",
      ok: false,
      detail:
        "Points at localhost — PayHere cannot reach notify_url, so payments will stay pending. Use a public tunnel (e.g. ngrok) or your deployed domain.",
    };
  }
  if (parsed.protocol !== "https:") {
    return {
      name: "NEXT_PUBLIC_SITE_URL",
      ok: false,
      detail: "Should be https:// for PayHere callbacks.",
    };
  }
  return { name: "NEXT_PUBLIC_SITE_URL", ok: true, detail: value };
}

/**
 * Owner-only PayHere configuration diagnostics. Query: ?slug=
 * Never returns secret values — only whether they are present and well-formed.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  try {
    const tenantCtx = await getTenantContext(slug);
    if (!tenantCtx.membership.isOwner) {
      return NextResponse.json(
        { error: "Only the Owner can view billing configuration." },
        { status: 403 },
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const sandbox = process.env.PAYHERE_SANDBOX !== "false";

    const checks: Check[] = [
      describeMerchantId(process.env.PAYHERE_MERCHANT_ID),
      describeSecret(process.env.PAYHERE_MERCHANT_SECRET),
      describeSiteUrl(siteUrl),
      {
        name: "PAYHERE_SANDBOX",
        ok: true,
        detail: sandbox
          ? "Sandbox mode — use sandbox.payhere.lk credentials and test cards."
          : "Live mode — real charges will be made.",
      },
    ];

    const notifyUrl = siteUrl ? `${siteUrl.replace(/\/$/, "")}/api/webhooks/payhere` : null;

    return NextResponse.json(
      {
        configured: isPayHereConfigured(),
        checkoutUrl: payHereCheckoutUrl(),
        notifyUrl,
        allChecksPassed: checks.every((c) => c.ok),
        checks,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    if (err instanceof TenantError && err.code === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Check failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
