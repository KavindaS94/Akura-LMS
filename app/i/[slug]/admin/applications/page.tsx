import { loadApplicationsPage } from "@/capabilities/students/lib/actions";
import { ApplicationActions } from "@/components/application-actions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const atCapacity = pending.length > 0 && used >= limit;

  return (
    <section className="space-y-8">
      <PageHeader
        title="Applications"
        subtitle={
          <>
            Pending applications do not use seats. Seats used:{" "}
            <strong className="text-ink">{used}</strong> / {limit}.
          </>
        }
      />

      {atCapacity ? (
        <Badge tone="danger">
          You&apos;re at {used} of {limit} — upgrade to approve these {pending.length}.
        </Badge>
      ) : null}

      {pending.length === 0 ? (
        <EmptyState
          title="No pending applications"
          description="New applications from your registration links will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {pending.map((app) => (
            <li
              key={app.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-4 shadow-xs"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">{app.fullName}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {app.email} · {app.phone ?? "no phone"}
                  {app.src ? (
                    <Badge tone="neutral" className="ml-2">
                      src: {app.src}
                    </Badge>
                  ) : null}
                </p>
              </div>
              <ApplicationActions slug={slug} applicationId={app.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
