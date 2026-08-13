import { requireRole } from "@/lib/tenant/context";
import { ADMIN_ROLES } from "@/lib/rbac";
import { EXPORT_DATASETS } from "@/lib/export/tenant-csv";
import { Card, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { IconChart } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireRole(slug, ADMIN_ROLES);

  return (
    <section className="space-y-8">
      <PageHeader
        title="Reports & export"
        subtitle="Download institute data as CSV. Full exports are Owner-only and are written to the audit log."
      />

      {ctx.membership.isOwner ? (
        <Card title="Data exports">
          <ul className="divide-y divide-ink/10">
            {EXPORT_DATASETS.map((dataset) => (
              <li
                key={dataset}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <span className="flex items-center gap-2 font-medium capitalize text-ink">
                  <IconChart className="text-muted" />
                  {dataset}
                </span>
                <a
                  className="rounded-lg border border-ink/20 px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent/50 hover:text-accent"
                  href={`/api/export/${dataset}?slug=${encodeURIComponent(slug)}`}
                >
                  Download CSV
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState
          title="Owner-only"
          description="Ask the Owner to export data. You can still open teacher attendance reports from each class."
        />
      )}
    </section>
  );
}
