"use server";

import { z } from "zod";
import { requireRole } from "@/lib/tenant/context";
import { ADMIN_ROLES } from "@/lib/rbac";
import {
  createPayHereCheckout,
  submitBankTransfer,
  setCancelAtPeriodEnd,
  downgradeToFree,
  BillingError,
} from "@/capabilities/billing/lib/service";

export type BillingFormState = {
  error?: string;
  ok?: string;
  checkoutUrl?: string;
  fields?: Record<string, string>;
} | null;

function requireOwner(ctx: { membership: { isOwner: boolean } }) {
  if (!ctx.membership.isOwner) {
    throw new BillingError("Only the Owner can manage billing.");
  }
}

const checkoutSchema = z.object({
  planKey: z.enum(["growth", "scale"]),
  billingCycle: z.enum(["monthly", "yearly"]),
});

export async function startPayHereCheckoutAction(
  slug: string,
  _prev: BillingFormState,
  formData: FormData,
): Promise<BillingFormState> {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  try {
    requireOwner(ctx);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Forbidden" };
  }

  const parsed = checkoutSchema.safeParse({
    planKey: formData.get("planKey"),
    billingCycle: formData.get("billingCycle"),
  });
  if (!parsed.success) return { error: "Choose a plan and billing cycle." };

  const name = ctx.user.name ?? ctx.user.email;
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] || "Owner";
  const lastName = parts.slice(1).join(" ") || "Admin";

  try {
    const checkout = await createPayHereCheckout({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      slug,
      planKey: parsed.data.planKey,
      billingCycle: parsed.data.billingCycle,
      customer: {
        firstName,
        lastName,
        email: ctx.user.email,
        phone: ctx.tenant.billingPhone,
      },
    });
    return {
      ok: "Redirecting to PayHere…",
      checkoutUrl: checkout.checkoutUrl,
      fields: checkout.fields,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not start checkout.",
    };
  }
}

export async function submitBankTransferAction(
  slug: string,
  _prev: BillingFormState,
  formData: FormData,
): Promise<BillingFormState> {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  try {
    requireOwner(ctx);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Forbidden" };
  }

  const parsed = checkoutSchema
    .extend({
      reference: z.string().trim().min(4).max(120),
      note: z.string().trim().max(500).optional(),
    })
    .safeParse({
      planKey: formData.get("planKey"),
      billingCycle: formData.get("billingCycle"),
      reference: formData.get("reference"),
      note: formData.get("note") || undefined,
    });
  if (!parsed.success) return { error: "Check the bank transfer form." };

  try {
    await submitBankTransfer({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      planKey: parsed.data.planKey,
      billingCycle: parsed.data.billingCycle,
      reference: parsed.data.reference,
      note: parsed.data.note,
    });
    return {
      ok: "Transfer submitted. We will activate your plan after confirmation.",
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not submit transfer.",
    };
  }
}

export async function cancelAtPeriodEndAction(
  slug: string,
  cancel: boolean,
): Promise<BillingFormState> {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  try {
    requireOwner(ctx);
    await setCancelAtPeriodEnd({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      cancel,
    });
    return {
      ok: cancel
        ? "Subscription will end at the current period."
        : "Cancellation withdrawn.",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed." };
  }
}

export async function downgradeToFreeAction(
  slug: string,
): Promise<BillingFormState> {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  try {
    requireOwner(ctx);
    await downgradeToFree({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
    });
    return { ok: "Moved to Free plan." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed." };
  }
}
