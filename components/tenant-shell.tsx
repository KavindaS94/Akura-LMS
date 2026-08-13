"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MembershipRole } from "@/lib/db/schema";
import {
  IconDashboard,
  IconUsers,
  IconCap,
  IconBook,
  IconClipboard,
  IconInbox,
  IconLink,
  IconUserCog,
  IconChart,
  IconGear,
  IconCard,
  IconCheck,
  IconCalendar,
  IconPencil,
  IconTrophy,
  IconHome,
  IconSignOut,
} from "./icons";

type NavLink = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const linksFor = (slug: string, role: MembershipRole): NavLink[] => {
  const base = `/i/${slug}`;
  if (role === "admin") {
    return [
      { href: `${base}/admin`, label: "Dashboard", icon: IconDashboard },
      { href: `${base}/admin/students`, label: "Students", icon: IconUsers },
      { href: `${base}/admin/classes`, label: "Classes", icon: IconCap },
      { href: `${base}/admin/courses`, label: "Courses", icon: IconBook },
      { href: `${base}/admin/exams`, label: "Exams", icon: IconClipboard },
      { href: `${base}/admin/applications`, label: "Applications", icon: IconInbox },
      { href: `${base}/admin/registration-links`, label: "Registration links", icon: IconLink },
      { href: `${base}/admin/staff`, label: "Staff & invites", icon: IconUserCog },
      { href: `${base}/admin/reports`, label: "Reports", icon: IconChart },
      { href: `${base}/admin/settings`, label: "Settings", icon: IconGear },
      { href: `${base}/admin/billing`, label: "Billing", icon: IconCard },
      { href: `${base}/teacher/attendance`, label: "Attendance", icon: IconCheck },
    ];
  }
  if (role === "teacher") {
    return [
      { href: `${base}/teacher`, label: "Today", icon: IconCalendar },
      { href: `${base}/teacher/attendance`, label: "Attendance", icon: IconCheck },
      { href: `${base}/teacher/marks`, label: "Marks", icon: IconPencil },
      { href: `${base}/teacher/course-editor`, label: "Courses", icon: IconBook },
    ];
  }
  return [
    { href: `${base}/student`, label: "My learning", icon: IconHome },
    { href: `${base}/student/courses`, label: "Courses", icon: IconBook },
    { href: `${base}/student/results`, label: "Results", icon: IconTrophy },
  ];
};

const roleLabel: Record<MembershipRole, string> = {
  admin: "Institute Admin",
  teacher: "Teacher",
  student: "Student",
};

function NavLinkItem({ link, active }: { link: NavLink; active: boolean }) {
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-accent/12 text-accent"
          : "text-ink/70 hover:bg-ink/5 hover:text-ink"
      }`}
    >
      <link.icon className={active ? "text-accent" : "text-muted group-hover:text-ink/70"} />
      {link.label}
    </Link>
  );
}

export function TenantShell(props: {
  slug: string;
  tenantName: string;
  role: MembershipRole;
  isOwner: boolean;
  userEmail?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const links = linksFor(props.slug, props.role);

  const isActive = (href: string) =>
    href === pathname || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink/10 bg-white lg:flex">
        <div className="flex items-center gap-3 border-b border-ink/10 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            {props.tenantName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{props.tenantName}</p>
            <p className="text-xs text-muted">Akura workspace</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {links.map((l) => (
            <NavLinkItem key={l.href} link={l} active={isActive(l.href)} />
          ))}
        </nav>

        <div className="border-t border-ink/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/8 text-xs font-semibold text-ink/70">
              {props.userEmail?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink">{roleLabel[props.role]}</p>
              {props.isOwner ? (
                <p className="text-[10px] font-medium text-accent">Owner</p>
              ) : (
                <p className="text-[10px] text-muted">/i/{props.slug}</p>
              )}
            </div>
            <form action="/logout" method="post" title="Sign out">
              <button
                type="submit"
                className="rounded-md p-1.5 text-muted transition-colors hover:bg-danger/8 hover:text-danger"
              >
                <IconSignOut />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-ink/10 bg-surface/80 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
              {props.tenantName.charAt(0).toUpperCase()}
            </div>
            <p className="truncate text-sm font-semibold text-ink">{props.tenantName}</p>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive(l.href)
                    ? "bg-accent/12 text-accent"
                    : "text-ink/70 hover:bg-ink/5"
                }`}
              >
                <l.icon />
                {l.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-8 lg:px-10 lg:py-8">{props.children}</main>
      </div>
    </div>
  );
}

export function ForbiddenPage({ message }: { message?: string }) {
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <IconSignOut />
      </div>
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
