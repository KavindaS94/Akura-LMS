import Link from "next/link";
import { requireRole } from "@/lib/tenant/context";
import { ADMIN_ROLES } from "@/lib/rbac";
import { EXPORT_DATASETS } from "@/lib/export/tenant-csv";

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
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Reports & export
        </h2>
        <p className="mt-2 text-muted">
          Download institute data as CSV. Full exports are Owner-only and are
          written to the audit log.
        </p>
      </div>

      {ctx.membership.isOwner ? (
        <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
          {EXPORT_DATASETS.map((dataset) => (
            <li
              key={dataset}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span className="capitalize">{dataset}</span>
              <a
                className="text-accent"
                href={`/api/export/${dataset}?slug=${encodeURIComponent(slug)}`}
              >
                Download CSV
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          Ask the Owner to export data. You can still open teacher attendance
          reports from each class.
        </p>
      )}

      <p className="text-sm text-muted">
        <Link href={`/i/${slug}/admin`} className="text-accent">
          ← Admin home
        </Link>
      </p>
    </section>
  );
}
