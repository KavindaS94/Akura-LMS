import { loadBillingPage } from "@/lib/settings/actions";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { ctx, subscription, usage } = await loadBillingPage(slug);

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
            ? "Owner view — PayHere checkout arrives in Phase 9."
            : "Admins can view usage; only the Owner manages billing."}
        </p>
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
              <dt className="text-muted">Currency</dt>
              <dd>{subscription.currency}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted">No subscription found.</p>
        )}
      </div>

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
    </section>
  );
}
