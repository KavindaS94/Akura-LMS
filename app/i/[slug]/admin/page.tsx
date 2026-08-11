import Link from "next/link";
import { requireRole } from "@/lib/tenant/context";
import { ADMIN_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireRole(slug, ADMIN_ROLES);

  return (
    <section>
      <h2
        className="text-2xl font-semibold text-ink"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Admin
      </h2>
      <p className="mt-2 text-muted">
        Signed in as {ctx.user.email}
        {ctx.membership.isOwner ? " · Owner" : ""}.
      </p>
      <ul className="mt-8 space-y-2 text-sm">
        <li>
          <Link className="text-accent" href={`/i/${slug}/admin/students`}>
            Students
          </Link>
        </li>
        <li>
          <Link className="text-accent" href={`/i/${slug}/admin/applications`}>
            Applications
          </Link>
        </li>
        <li>
          <Link className="text-accent" href={`/i/${slug}/admin/registration-links`}>
            Registration links
          </Link>
        </li>
        <li>
          <Link className="text-accent" href={`/i/${slug}/admin/classes`}>
            Classes
          </Link>
        </li>
        <li>
          <Link className="text-accent" href={`/i/${slug}/admin/staff`}>
            Staff & invites
          </Link>
        </li>
        <li>
          <Link className="text-accent" href={`/i/${slug}/admin/settings`}>
            Settings
          </Link>
        </li>
        <li>
          <Link className="text-accent" href={`/i/${slug}/admin/billing`}>
            Billing & usage
          </Link>
        </li>
      </ul>
    </section>
  );
}
