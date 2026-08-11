import { loadApplicationsPage } from "@/capabilities/students/lib/actions";
import { ApplicationActions } from "@/components/application-actions";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { pending, subscription, usage } = await loadApplicationsPage(slug);
  const used = usage.students ?? 0;
  const limit = subscription?.planLimits?.students ?? 0;

  return (
    <section className="space-y-6">
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Applications
        </h2>
        <p className="mt-2 text-muted">
          Pending applications do not use seats. Seats used: {used} / {limit}.
          {pending.length > 0 && used >= limit
            ? ` You're at ${used} of ${limit} — upgrade to approve these ${pending.length}.`
            : ""}
        </p>
      </div>
      <ul className="space-y-3">
        {pending.length === 0 ? (
          <li className="text-sm text-muted">No pending applications.</li>
        ) : (
          pending.map((app) => (
            <li
              key={app.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ink/10 bg-white px-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{app.fullName}</p>
                <p className="text-muted">
                  {app.email} · {app.phone ?? "no phone"}
                  {app.src ? ` · src=${app.src}` : ""}
                </p>
              </div>
              <ApplicationActions slug={slug} applicationId={app.id} />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
