import { and, eq } from "drizzle-orm";
import {
  plans,
  subscriptions,
  usageCounters,
  usageEvents,
  type QuotaMetric,
  type Subscription,
} from "@/lib/db/schema";
import { withTenant, type Tx } from "@/lib/db/tenant";

export class QuotaError extends Error {
  constructor(
    message: string,
    readonly metric?: QuotaMetric,
    readonly limit?: number,
    readonly used?: number,
  ) {
    super(message);
    this.name = "QuotaError";
  }
}

export class WritableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WritableError";
  }
}

const WRITE_BLOCKED_STATUSES = new Set(["read_only", "dormant"]);

export async function getCurrentSubscription(
  tenantId: string,
  userId: string,
): Promise<(Subscription & { planLimits: Record<string, number>; planName: string }) | null> {
  return withTenant({ tenantId, userId }, async (tx) => {
    const rows = await tx
      .select({
        subscription: subscriptions,
        plan: plans,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planKey, plans.key))
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(5);

    const current = rows.find((r) =>
      ["trialing", "active", "past_due", "free", "read_only"].includes(
        r.subscription.status,
      ),
    );
    if (!current) return null;
    return {
      ...current.subscription,
      planLimits: current.plan.limits ?? {},
      planName: current.plan.name,
    };
  });
}

export async function getUsageSnapshot(tenantId: string, userId: string) {
  return withTenant({ tenantId, userId }, async (tx) => {
    const counters = await tx
      .select()
      .from(usageCounters)
      .where(eq(usageCounters.tenantId, tenantId));
    return Object.fromEntries(counters.map((c) => [c.metric, c.quantity])) as Record<
      string,
      number
    >;
  });
}

/**
 * Blocks mutating product actions when subscription is read_only/dormant.
 * Never use this to block attendance marking.
 */
export async function assertWritable(
  tenantId: string,
  userId: string,
  tx?: Tx,
): Promise<void> {
  const check = async (inner: Tx) => {
    const rows = await inner
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId));
    const current = rows.find((r) =>
      ["trialing", "active", "past_due", "free", "read_only", "dormant"].includes(
        r.status,
      ),
    );
    if (!current) return;
    if (WRITE_BLOCKED_STATUSES.has(current.status)) {
      throw new WritableError(
        `Workspace is ${current.status}. Upgrade or settle billing to make changes.`,
      );
    }
  };
  if (tx) return check(tx);
  return withTenant({ tenantId, userId }, check);
}

export async function assertQuota(
  tenantId: string,
  userId: string,
  metric: QuotaMetric,
  delta: number,
  tx?: Tx,
): Promise<void> {
  const check = async (inner: Tx) => {
    const subRows = await inner
      .select({
        subscription: subscriptions,
        plan: plans,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planKey, plans.key))
      .where(eq(subscriptions.tenantId, tenantId));

    const current = subRows.find((r) =>
      ["trialing", "active", "past_due", "free", "read_only"].includes(
        r.subscription.status,
      ),
    );
    if (!current) throw new QuotaError("No subscription found.");

    const limit = Number(current.plan.limits?.[metric] ?? 0);
    const counter = await inner
      .select()
      .from(usageCounters)
      .where(
        and(eq(usageCounters.tenantId, tenantId), eq(usageCounters.metric, metric)),
      )
      .limit(1);
    const used = Number(counter[0]?.quantity ?? 0);
    if (used + delta > limit) {
      throw new QuotaError(
        `You're at ${used} of ${limit} ${metric}. Upgrade to continue.`,
        metric,
        limit,
        used,
      );
    }
  };
  if (tx) return check(tx);
  return withTenant({ tenantId, userId }, check);
}

/** Increment usage inside an existing tenant transaction after assertQuota. */
export async function recordUsage(
  tx: Tx,
  opts: {
    tenantId: string;
    metric: QuotaMetric;
    delta: number;
    reason?: string;
  },
) {
  const existing = await tx
    .select()
    .from(usageCounters)
    .where(
      and(
        eq(usageCounters.tenantId, opts.tenantId),
        eq(usageCounters.metric, opts.metric),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await tx
      .update(usageCounters)
      .set({
        quantity: existing[0].quantity + opts.delta,
        updatedAt: new Date(),
      })
      .where(eq(usageCounters.id, existing[0].id));
  } else {
    await tx.insert(usageCounters).values({
      tenantId: opts.tenantId,
      metric: opts.metric,
      quantity: opts.delta,
    });
  }

  await tx.insert(usageEvents).values({
    tenantId: opts.tenantId,
    metric: opts.metric,
    delta: opts.delta,
    reason: opts.reason,
  });
}
