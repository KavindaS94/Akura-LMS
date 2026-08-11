import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  auditLog,
  bankTransfers,
  payments,
  plans,
  subscriptions,
} from "@/lib/db/schema";
import { db } from "@/lib/db";
import { rowsOf } from "@/lib/db/result";
import { withTenant, type Tx } from "@/lib/db/tenant";
import {
  formatPayHereAmount,
  generatePayHereCheckoutHash,
  isPayHereConfigured,
  payHereCheckoutUrl,
  payHereRecurrence,
  verifyPayHereNotification,
} from "@/lib/billing/payhere";
import {
  mapPayHereStatusCode,
  nextPeriodEnd,
  shouldEnterDormant,
  statusAfterGraceExpired,
  statusAfterPaymentFailure,
  statusAfterSuccessfulPayment,
  statusAfterTrialExpired,
} from "@/lib/billing/transitions";

type Cycle = "monthly" | "yearly";

export class BillingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingError";
  }
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export async function listActivePlans(opts: {
  tenantId: string;
  userId: string;
}) {
  return withTenant(opts, async (tx) => {
    return tx.select().from(plans).where(eq(plans.isActive, true));
  });
}

export async function createPayHereCheckout(opts: {
  tenantId: string;
  userId: string;
  slug: string;
  planKey: string;
  billingCycle: Cycle;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
}) {
  if (!isPayHereConfigured()) {
    throw new BillingError("PayHere is not configured.");
  }
  if (opts.planKey === "free") {
    throw new BillingError("Use Downgrade to Free instead of checkout.");
  }

  const merchantId = process.env.PAYHERE_MERCHANT_ID!;
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET!;

  return withTenant(
    { tenantId: opts.tenantId, userId: opts.userId },
    async (tx) => {
      const [plan] = await tx
        .select()
        .from(plans)
        .where(and(eq(plans.key, opts.planKey), eq(plans.isActive, true)))
        .limit(1);
      if (!plan) throw new BillingError("Plan not found.");

      const amountMinor = Number(plan.prices?.[opts.billingCycle] ?? 0);
      if (!amountMinor || amountMinor <= 0) {
        throw new BillingError("Plan has no price for that billing cycle.");
      }

      const [sub] = await tx
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, opts.tenantId),
            inArray(subscriptions.status, [
              "trialing",
              "active",
              "past_due",
              "free",
              "read_only",
            ]),
          ),
        )
        .limit(1);
      if (!sub) throw new BillingError("No subscription found.");

      const orderId = `akura_${opts.tenantId.slice(0, 8)}_${randomUUID().slice(0, 8)}`;

      const [payment] = await tx
        .insert(payments)
        .values({
          tenantId: opts.tenantId,
          subscriptionId: sub.id,
          orderId,
          method: "payhere",
          status: "pending",
          planKey: opts.planKey,
          billingCycle: opts.billingCycle,
          amountMinor,
          currency: "LKR",
          createdByAuthUserId: opts.userId,
        })
        .returning();

      await tx.insert(auditLog).values({
        tenantId: opts.tenantId,
        actorUserId: opts.userId,
        action: "billing.checkout_started",
        entityType: "payment",
        entityId: payment!.id,
        payload: { orderId, planKey: opts.planKey, billingCycle: opts.billingCycle },
      });

      const amount = formatPayHereAmount(amountMinor);
      const hash = generatePayHereCheckoutHash({
        merchantId,
        orderId,
        amountMinor,
        currency: "LKR",
        merchantSecret,
      });

      const fields: Record<string, string> = {
        merchant_id: merchantId,
        return_url: `${siteUrl()}/i/${opts.slug}/admin/billing?paid=1`,
        cancel_url: `${siteUrl()}/i/${opts.slug}/admin/billing?canceled=1`,
        notify_url: `${siteUrl()}/api/webhooks/payhere`,
        order_id: orderId,
        items: `Akura ${plan.name} (${opts.billingCycle})`,
        currency: "LKR",
        amount,
        first_name: opts.customer.firstName,
        last_name: opts.customer.lastName,
        email: opts.customer.email,
        phone: opts.customer.phone ?? "0000000000",
        address: "Colombo",
        city: "Colombo",
        country: "Sri Lanka",
        hash,
        recurrence: payHereRecurrence(opts.billingCycle),
        duration: "Forever",
        custom_1: opts.tenantId,
        custom_2: `${opts.planKey}|${opts.billingCycle}`,
      };

      return {
        checkoutUrl: payHereCheckoutUrl(),
        fields,
        orderId,
        paymentId: payment!.id,
      };
    },
  );
}

export async function submitBankTransfer(opts: {
  tenantId: string;
  userId: string;
  planKey: string;
  billingCycle: Cycle;
  reference: string;
  note?: string;
}) {
  if (opts.planKey === "free") {
    throw new BillingError("Bank transfer is for paid plans only.");
  }
  const ref = opts.reference.trim();
  if (ref.length < 4) throw new BillingError("Enter a bank transfer reference.");

  return withTenant(
    { tenantId: opts.tenantId, userId: opts.userId },
    async (tx) => {
      const [plan] = await tx
        .select()
        .from(plans)
        .where(eq(plans.key, opts.planKey))
        .limit(1);
      if (!plan) throw new BillingError("Plan not found.");
      const amountMinor = Number(plan.prices?.[opts.billingCycle] ?? 0);
      if (!amountMinor) throw new BillingError("Invalid plan price.");

      const [sub] = await tx
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, opts.tenantId),
            inArray(subscriptions.status, [
              "trialing",
              "active",
              "past_due",
              "free",
              "read_only",
              "dormant",
            ]),
          ),
        )
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      if (!sub) throw new BillingError("No subscription found.");

      const orderId = `bank_${opts.tenantId.slice(0, 8)}_${randomUUID().slice(0, 8)}`;
      const [payment] = await tx
        .insert(payments)
        .values({
          tenantId: opts.tenantId,
          subscriptionId: sub.id,
          orderId,
          method: "bank",
          status: "pending",
          planKey: opts.planKey,
          billingCycle: opts.billingCycle,
          amountMinor,
          currency: "LKR",
          createdByAuthUserId: opts.userId,
        })
        .returning();

      const [transfer] = await tx
        .insert(bankTransfers)
        .values({
          tenantId: opts.tenantId,
          paymentId: payment!.id,
          reference: ref,
          note: opts.note?.trim() || null,
          status: "pending",
          createdByAuthUserId: opts.userId,
        })
        .returning();

      await tx.insert(auditLog).values({
        tenantId: opts.tenantId,
        actorUserId: opts.userId,
        action: "billing.bank_transfer_submitted",
        entityType: "bank_transfer",
        entityId: transfer!.id,
        payload: { reference: ref, planKey: opts.planKey },
      });

      return { paymentId: payment!.id, transferId: transfer!.id };
    },
  );
}

async function activateSubscription(
  tx: Tx,
  opts: {
    tenantId: string;
    subscriptionId: string;
    planKey: string;
    billingCycle: Cycle;
    provider: string;
    providerSubscriptionId?: string | null;
    actorUserId?: string | null;
  },
) {
  const now = new Date();
  const periodEnd = nextPeriodEnd(now, opts.billingCycle);
  await tx
    .update(subscriptions)
    .set({
      status: statusAfterSuccessfulPayment("past_due"),
      planKey: opts.planKey,
      billingCycle: opts.billingCycle,
      provider: opts.provider,
      providerSubscriptionId: opts.providerSubscriptionId ?? null,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      graceEndsAt: null,
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      updatedAt: now,
    })
    .where(
      and(
        eq(subscriptions.id, opts.subscriptionId),
        eq(subscriptions.tenantId, opts.tenantId),
      ),
    );

  await tx.insert(auditLog).values({
    tenantId: opts.tenantId,
    actorUserId: opts.actorUserId ?? null,
    action: "billing.subscription_activated",
    entityType: "subscription",
    entityId: opts.subscriptionId,
    payload: {
      planKey: opts.planKey,
      billingCycle: opts.billingCycle,
      provider: opts.provider,
    },
  });
}

export async function applySuccessfulPayment(opts: {
  tenantId: string;
  paymentId: string;
  providerPaymentId?: string | null;
  providerSubscriptionId?: string | null;
  rawPayload?: Record<string, unknown>;
  actorUserId?: string | null;
}) {
  return withTenant(
    { tenantId: opts.tenantId, userId: opts.actorUserId ?? "system" },
    async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.id, opts.paymentId),
            eq(payments.tenantId, opts.tenantId),
          ),
        )
        .limit(1);
      if (!payment) throw new BillingError("Payment not found.");
      if (payment.status === "paid") return { alreadyPaid: true as const };

      await tx
        .update(payments)
        .set({
          status: "paid",
          providerPaymentId: opts.providerPaymentId ?? payment.providerPaymentId,
          providerSubscriptionId:
            opts.providerSubscriptionId ?? payment.providerSubscriptionId,
          rawPayload: opts.rawPayload ?? payment.rawPayload,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      if (payment.method === "bank") {
        await tx
          .update(bankTransfers)
          .set({
            status: "confirmed",
            confirmedAt: new Date(),
            confirmedBy: opts.actorUserId ?? "ops",
            updatedAt: new Date(),
          })
          .where(eq(bankTransfers.paymentId, payment.id));
      }

      const subId = payment.subscriptionId;
      if (subId) {
        await activateSubscription(tx, {
          tenantId: opts.tenantId,
          subscriptionId: subId,
          planKey: payment.planKey,
          billingCycle: payment.billingCycle as Cycle,
          provider: payment.method === "payhere" ? "payhere" : "bank",
          providerSubscriptionId: opts.providerSubscriptionId,
          actorUserId: opts.actorUserId,
        });
      }

      return { alreadyPaid: false as const };
    },
  );
}

export async function handlePayHereNotify(form: Record<string, string>) {
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  if (!merchantSecret || !merchantId) {
    throw new BillingError("PayHere not configured");
  }

  const orderId = form.order_id;
  const statusCode = form.status_code;
  const md5sig = form.md5sig;
  if (!orderId || !statusCode || !md5sig) {
    throw new BillingError("Missing PayHere fields");
  }

  const ok = verifyPayHereNotification({
    merchantId: form.merchant_id || merchantId,
    orderId,
    payhereAmount: form.payhere_amount,
    payhereCurrency: form.payhere_currency,
    statusCode,
    md5sig,
    merchantSecret,
  });
  if (!ok) throw new BillingError("Invalid PayHere signature");

  const found = await db.execute(
    sql`SELECT * FROM app_find_payment_by_order_id(${orderId})`,
  );
  const payment = rowsOf<{
    id: string;
    tenant_id: string;
    subscription_id: string | null;
    status: string;
    plan_key: string;
    billing_cycle: Cycle;
  }>(found)[0];
  if (!payment) throw new BillingError("Unknown order_id");

  const mapped = mapPayHereStatusCode(Number(statusCode));
  const recStatus = form.item_rec_status;

  if (mapped === "paid") {
    await applySuccessfulPayment({
      tenantId: payment.tenant_id,
      paymentId: payment.id,
      providerPaymentId: form.payment_id ?? null,
      providerSubscriptionId: form.subscription_id ?? form.payment_id ?? null,
      rawPayload: form,
    });
    return { ok: true, action: "activated" as const };
  }

  // Recurring failure on an existing subscription
  if (
    payment.subscription_id &&
    (recStatus === "-2" || recStatus === "-3" || mapped === "failed")
  ) {
    await withTenant(
      { tenantId: payment.tenant_id, userId: "system" },
      async (tx) => {
        const fail = statusAfterPaymentFailure();
        await tx
          .update(subscriptions)
          .set({
            status: fail.status,
            graceEndsAt: fail.graceEndsAt,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, payment.subscription_id!));

        await tx
          .update(payments)
          .set({
            status: mapped === "canceled" ? "canceled" : "failed",
            rawPayload: form,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));

        await tx.insert(auditLog).values({
          tenantId: payment.tenant_id,
          actorUserId: "system",
          action: "billing.payment_failed",
          entityType: "payment",
          entityId: payment.id,
          payload: form,
        });
      },
    );
    return { ok: true, action: "past_due" as const };
  }

  await withTenant(
    { tenantId: payment.tenant_id, userId: "system" },
    async (tx) => {
      await tx
        .update(payments)
        .set({
          status:
            mapped === "canceled"
              ? "canceled"
              : mapped === "charged_back"
                ? "charged_back"
                : mapped === "pending"
                  ? "pending"
                  : "failed",
          rawPayload: form,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));
    },
  );

  return { ok: true, action: "recorded" as const };
}

export async function confirmBankTransferById(opts: {
  transferId: string;
  confirmedBy: string;
}) {
  const found = await db.execute(
    sql`SELECT * FROM app_find_bank_transfer(${opts.transferId}::uuid)`,
  );
  const transfer = rowsOf<{
    id: string;
    tenant_id: string;
    payment_id: string;
    status: string;
  }>(found)[0];
  if (!transfer) throw new BillingError("Transfer not found");
  if (transfer.status === "confirmed") return { already: true };

  await applySuccessfulPayment({
    tenantId: transfer.tenant_id,
    paymentId: transfer.payment_id,
    actorUserId: opts.confirmedBy,
  });
  return { already: false };
}

export async function setCancelAtPeriodEnd(opts: {
  tenantId: string;
  userId: string;
  cancel: boolean;
}) {
  return withTenant(opts, async (tx) => {
    const [sub] = await tx
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.tenantId, opts.tenantId),
          inArray(subscriptions.status, ["active", "past_due", "trialing"]),
        ),
      )
      .limit(1);
    if (!sub) throw new BillingError("No cancellable subscription.");
    await tx
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: opts.cancel, updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));
    await tx.insert(auditLog).values({
      tenantId: opts.tenantId,
      actorUserId: opts.userId,
      action: opts.cancel
        ? "billing.cancel_at_period_end"
        : "billing.resume_subscription",
      entityType: "subscription",
      entityId: sub.id,
      payload: {},
    });
  });
}

export async function downgradeToFree(opts: {
  tenantId: string;
  userId: string;
}) {
  return withTenant(opts, async (tx) => {
    const [sub] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, opts.tenantId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    if (!sub) throw new BillingError("No subscription.");
    await tx
      .update(subscriptions)
      .set({
        status: "free",
        planKey: "free",
        provider: "none",
        providerSubscriptionId: null,
        cancelAtPeriodEnd: false,
        graceEndsAt: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));
    await tx.insert(auditLog).values({
      tenantId: opts.tenantId,
      actorUserId: opts.userId,
      action: "billing.downgraded_free",
      entityType: "subscription",
      entityId: sub.id,
      payload: {},
    });
  });
}

export async function runBillingLifecycle(limit = 100) {
  const result = await db.execute(
    sql`SELECT * FROM app_list_subscriptions_for_lifecycle(${limit})`,
  );
  const rows = rowsOf<{
    id: string;
    tenant_id: string;
    plan_key: string;
    status: string;
    trial_ends_at: Date | null;
    grace_ends_at: Date | null;
    current_period_end: Date | null;
    cancel_at_period_end: boolean;
    read_only_since: Date | null;
  }>(result);

  const summary = { trialExpired: 0, graceExpired: 0, dormant: 0, canceled: 0 };

  for (const row of rows) {
    const now = new Date();
    await withTenant(
      { tenantId: row.tenant_id, userId: "system" },
      async (tx) => {
        if (
          row.status === "trialing" &&
          row.trial_ends_at &&
          new Date(row.trial_ends_at) < now
        ) {
          const next = statusAfterTrialExpired();
          await tx
            .update(subscriptions)
            .set({
              status: next.status,
              graceEndsAt: next.graceEndsAt,
              updatedAt: now,
            })
            .where(eq(subscriptions.id, row.id));
          summary.trialExpired += 1;
          return;
        }

        if (
          row.status === "past_due" &&
          row.grace_ends_at &&
          new Date(row.grace_ends_at) < now
        ) {
          await tx
            .update(subscriptions)
            .set({
              status: statusAfterGraceExpired(),
              updatedAt: now,
            })
            .where(eq(subscriptions.id, row.id));
          summary.graceExpired += 1;
          return;
        }

        if (
          row.status === "read_only" &&
          row.read_only_since &&
          shouldEnterDormant(new Date(row.read_only_since), now)
        ) {
          await tx
            .update(subscriptions)
            .set({ status: "dormant", updatedAt: now })
            .where(eq(subscriptions.id, row.id));
          summary.dormant += 1;
          return;
        }

        if (
          row.status === "active" &&
          row.cancel_at_period_end &&
          row.current_period_end &&
          new Date(row.current_period_end) < now
        ) {
          await tx
            .update(subscriptions)
            .set({
              status: "free",
              planKey: "free",
              cancelAtPeriodEnd: false,
              provider: "none",
              providerSubscriptionId: null,
              updatedAt: now,
            })
            .where(eq(subscriptions.id, row.id));
          summary.canceled += 1;
        }
      },
    );
  }

  return summary;
}

export async function listRecentPayments(opts: {
  tenantId: string;
  userId: string;
}) {
  return withTenant(opts, async (tx) => {
    return tx
      .select()
      .from(payments)
      .where(eq(payments.tenantId, opts.tenantId))
      .orderBy(desc(payments.createdAt))
      .limit(20);
  });
}

export function bankTransferInstructions() {
  return {
    bankName: process.env.BANK_TRANSFER_BANK_NAME ?? "Commercial Bank of Ceylon",
    accountName: process.env.BANK_TRANSFER_ACCOUNT_NAME ?? "Elgiriya Innovations",
    accountNumber: process.env.BANK_TRANSFER_ACCOUNT_NUMBER ?? "—",
    branch: process.env.BANK_TRANSFER_BRANCH ?? "Colombo",
  };
}
