import { loadBillingPage } from "@/lib/settings/actions";
import {
  bankTransferInstructions,
  listRecentPayments,
} from "@/capabilities/billing/lib/service";
import { isPayHereConfigured } from "@/lib/billing/payhere";
import { OwnerBillingPanel } from "@/components/billing-owner-panel";
import { getSetting } from "@/lib/settings";
import { Card, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/feedback";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paid?: string; canceled?: string }>;
}) {
  const { slug } = await params;
  const q = await searchParams;
  const { ctx, subscription, usage } = await loadBillingPage(slug);

  const showUsage =
    ctx.membership.isOwner ||
    (await getSetting<boolean>(
      ctx.tenantId,
      ctx.user.id,
      "billing.show_usage_to_admins",
    ));

  const payments = ctx.membership.isOwner
    ? await listRecentPayments({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
      })
    : [];

  const metrics = ["students", "staff", "storage_bytes", "emails"] as const;

  return (
    <section className="space-y-8">
      <PageHeader
        title="Billing & usage"
        subtitle={
          ctx.membership.isOwner
            ? "Manage your plan with PayHere or bank transfer."
            : "Admins can view usage; only the Owner manages billing."
        }
      />

      {q.paid ? (
        <Alert tone="success">
          Payment received — activation may take a moment via PayHere notify.
        </Alert>
      ) : null}
      {q.canceled ? <Alert tone="info">Checkout canceled.</Alert> : null}

      <Card
        title="Plan"
        action={
          subscription ? <Badge tone={subscription.status === "active" ? "success" : "warning"}>{subscription.status}</Badge> : undefined
        }
      >
        {subscription ? (
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Name", subscription.planName],
              ["Status", subscription.status],
              ["Trial ends", subscription.trialEndsAt ? subscription.trialEndsAt.toISOString().slice(0, 10) : "—"],
              ["Period end", subscription.currentPeriodEnd ? subscription.currentPeriodEnd.toISOString().slice(0, 10) : "—"],
              ["Provider", subscription.provider],
              ["Currency", subscription.currency],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted uppercase">{label}</dt>
                <dd className="mt-0.5 font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted">No subscription found.</p>
        )}
      </Card>

      {showUsage ? (
        <Card title="Live usage">
          <ul className="space-y-4">
            {metrics.map((metric) => {
              const used = usage[metric] ?? 0;
              const limit = subscription?.planLimits?.[metric] ?? 0;
              const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
              return (
                <li key={metric}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{metric.replace("_", " ")}</span>
                    <span className="text-muted">
                      {used} / {limit}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/8">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <EmptyState title="Usage is hidden" description="Usage is hidden for non-owners." />
      )}

      {ctx.membership.isOwner ? (
        <OwnerBillingPanel
          slug={slug}
          cancelAtPeriodEnd={Boolean(subscription?.cancelAtPeriodEnd)}
          payHereReady={isPayHereConfigured()}
          bank={bankTransferInstructions()}
        />
      ) : null}

      {ctx.membership.isOwner && payments.length > 0 ? (
        <Card title="Recent payments">
          <ul className="divide-y divide-ink/10">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="font-medium capitalize text-ink">
                  {p.method} · {p.planKey}
                </span>
                <span className="text-muted">
                  {p.billingCycle} · {p.status} ·{" "}
                  {(p.amountMinor / 100).toFixed(2)} {p.currency}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </section>
  );
}
