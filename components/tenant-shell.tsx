import Link from "next/link";
import type { MembershipRole } from "@/lib/db/schema";

const linksFor = (slug: string, role: MembershipRole) => {
  const base = `/i/${slug}`;
  if (role === "admin") {
    return [
      { href: `${base}/admin`, label: "Dashboard" },
      { href: `${base}/admin/students`, label: "Students" },
      { href: `${base}/admin/classes`, label: "Classes" },
      { href: `${base}/admin/exams`, label: "Exams" },
      { href: `${base}/admin/applications`, label: "Applications" },
      { href: `${base}/admin/registration-links`, label: "Reg links" },
      { href: `${base}/admin/staff`, label: "Staff" },
      { href: `${base}/admin/settings`, label: "Settings" },
      { href: `${base}/admin/billing`, label: "Billing" },
      { href: `${base}/teacher/attendance`, label: "Attendance" },
    ];
  }
  if (role === "teacher") {
    return [
      { href: `${base}/teacher`, label: "Today" },
      { href: `${base}/teacher/attendance`, label: "Attendance" },
      { href: `${base}/teacher/marks`, label: "Marks" },
    ];
  }
  return [
    { href: `${base}/student`, label: "My learning" },
    { href: `${base}/student/results`, label: "Results" },
  ];
};

export function TenantNav(props: {
  slug: string;
  tenantName: string;
  role: MembershipRole;
  isOwner: boolean;
}) {
  const links = linksFor(props.slug, props.role);
  return (
    <header className="border-b border-ink/10 bg-white/70 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted uppercase">Akura</p>
          <h1 className="text-lg font-semibold text-ink">{props.tenantName}</h1>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink/80 hover:text-accent">
              {l.label}
            </Link>
          ))}
          <span className="text-muted">/{props.slug}</span>
        </nav>
      </div>
    </header>
  );
}

export function ForbiddenPage({ message }: { message?: string }) {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <p className="text-sm font-medium tracking-wide text-danger uppercase">403</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">Access denied</h1>
      <p className="mt-2 text-muted">
        {message ?? "You do not have permission to access this area."}
      </p>
      <Link href="/" className="mt-8 inline-block text-sm text-accent">
        Back to Akura
      </Link>
    </main>
  );
}
