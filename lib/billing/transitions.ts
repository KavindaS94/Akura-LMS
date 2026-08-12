/**
 * Subscription lifecycle helpers (Phase 9).
 * Transitions match docs/superpowers/plans/2026-08-12-akura-phase-9-billing.md
 */

export const GRACE_DAYS = 7;
export const DORMANT_AFTER_READ_ONLY_DAYS = 30;

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "free"
  | "read_only"
  | "dormant";

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function nextPeriodEnd(
  from: Date,
  cycle: "monthly" | "yearly",
): Date {
  const d = new Date(from);
  if (cycle === "yearly") {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
  } else {
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return d;
}

/** After a successful payment (PayHere or confirmed bank). */
export function statusAfterSuccessfulPayment(): "active" {
  return "active";
}

/** Trial expired without payment. */
export function statusAfterTrialExpired(): {
  status: "past_due";
  graceEndsAt: Date;
} {
  const now = new Date();
  return { status: "past_due", graceEndsAt: addDays(now, GRACE_DAYS) };
}

/** Recurring charge failed while active. */
export function statusAfterPaymentFailure(): {
  status: "past_due";
  graceEndsAt: Date;
} {
  const now = new Date();
  return { status: "past_due", graceEndsAt: addDays(now, GRACE_DAYS) };
}

/** Grace window ended. */
export function statusAfterGraceExpired(): "read_only" {
  return "read_only";
}

/** Long-term unpaid after read_only. */
export function shouldEnterDormant(
  readOnlySince: Date,
  now = new Date(),
): boolean {
  return now.getTime() >= addDays(readOnlySince, DORMANT_AFTER_READ_ONLY_DAYS).getTime();
}

export function mapPayHereStatusCode(
  code: number,
): "paid" | "pending" | "canceled" | "failed" | "charged_back" {
  switch (code) {
    case 2:
      return "paid";
    case 0:
      return "pending";
    case -1:
      return "canceled";
    case -3:
      return "charged_back";
    case -2:
    default:
      return "failed";
  }
}
