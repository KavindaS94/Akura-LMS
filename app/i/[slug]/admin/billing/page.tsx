import { loadBillingPage } from "@/lib/settings/actions";
import {
  bankTransferInstructions,
  listRecentPayments,
} from "@/capabilities/billing/lib/service";
import { isPayHereConfigured } from "@/lib/billing/payhere";
import { OwnerBillingPanel } from "@/components/billing-owner-panel";
import { getSetting } from "@/lib/settings";

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
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Billing & usage
        </h2>
        <p className="mt-2 text-muted">
          {ctx.membership.isOwner
            ? "Manage your plan with PayHere or bank transfer."
            : "Admins can view usage; only the Owner manages billing."}
        </p>
        {q.paid ? (
          <p className="mt-2 text-sm text-success">
            Payment received — activation may take a moment via PayHere notify.
          </p>
        ) : null}
        {q.canceled ? (
          <p className="mt-2 text-sm text-muted">Checkout canceled.</p>
        ) : null}
      </div>

      <div className="rounded-md border border-ink/10 bg-white p-4">
        <h3 className="font-semibold">Plan</h3>
        {subscription ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Name</dt>
              <dd>{subscription.planName}</dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              <dd>{subscription.status}</dd>
            </div>
            <div>
              <dt className="text-muted">Trial ends</dt>
              <dd>
                {subscription.trialEndsAt
                  ? subscription.trialEndsAt.toISOString().slice(0, 10)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Period end</dt>
              <dd>
                {subscription.currentPeriodEnd
                  ? subscription.currentPeriodEnd.toISOString().slice(0, 10)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Provider</dt>
              <dd>{subscription.provider}</dd>
            </div>
            <div>
              <dt className="text-muted">Currency</dt>
              <dd>{subscription.currency}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted">No subscription found.</p>
        )}
      </div>

      {showUsage ? (
        <div>
          <h3 className="font-semibold">Live usage</h3>
          <ul className="mt-3 divide-y divide-ink/10 border border-ink/10">
            {metrics.map((metric) => {
              const used = usage[metric] ?? 0;
              const limit = subscription?.planLimits?.[metric] ?? 0;
              return (
                <li
                  key={metric}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span>{metric}</span>
                  <span>
                    {used} / {limit}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted">Usage is hidden for non-owners.</p>
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
        <div>
          <h3 className="font-semibold">Recent payments</h3>
          <ul className="mt-3 divide-y divide-ink/10 border border-ink/10 text-sm">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <span>
                  {p.method} · {p.planKey} · {p.billingCycle}
                </span>
                <span className="text-muted">
                  {p.status} · {(p.amountMinor / 100).toFixed(2)} {p.currency}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
