import Link from "next/link";
import { requireRole } from "@/lib/tenant/context";
import { ADMIN_ROLES } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import {
  IconUsers,
  IconInbox,
  IconLink,
  IconCap,
  IconUserCog,
  IconChart,
  IconGear,
  IconCard,
} from "@/components/icons";

const quickLinks = [
  { href: "/admin/students", label: "Students", icon: IconUsers, blurb: "Roster & guardians" },
  { href: "/admin/applications", label: "Applications", icon: IconInbox, blurb: "Approve registrations" },
  { href: "/admin/registration-links", label: "Registration links", icon: IconLink, blurb: "Shareable signup links" },
  { href: "/admin/classes", label: "Classes", icon: IconCap, blurb: "Rooms & teachers" },
  { href: "/admin/staff", label: "Staff & invites", icon: IconUserCog, blurb: "Invite teammates" },
  { href: "/admin/reports", label: "Reports & export", icon: IconChart, blurb: "Attendance & data" },
  { href: "/admin/settings", label: "Settings", icon: IconGear, blurb: "Workspace config" },
  { href: "/admin/billing", label: "Billing & usage", icon: IconCard, blurb: "Plan & capacity" },
];

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireRole(slug, ADMIN_ROLES);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            className="text-2xl font-semibold tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-muted">
            Signed in as {ctx.user.email}
            {ctx.membership.isOwner ? (
              <>
                {" "}
                <Badge tone="accent">Owner</Badge>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((q) => (
          <Link
            key={q.href}
            href={`/i/${slug}${q.href}`}
            className="group rounded-2xl border border-ink/10 bg-white p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/12 text-accent">
              <q.icon />
            </div>
            <p className="mt-4 font-semibold text-ink">{q.label}</p>
            <p className="mt-1 text-xs text-muted">{q.blurb}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
