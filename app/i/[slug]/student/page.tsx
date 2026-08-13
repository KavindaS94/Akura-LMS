import Link from "next/link";
import { requireRole } from "@/lib/tenant/context";
import { STUDENT_ROLES } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { IconBook, IconTrophy } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function StudentHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireRole(slug, STUDENT_ROLES);

  return (
    <section className="space-y-8">
      <PageHeader title="My learning" subtitle={`Welcome, ${ctx.user.email}.`} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/i/${slug}/student/courses`}
          className="group rounded-2xl border border-ink/10 bg-white p-6 shadow-xs transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/12 text-accent">
            <IconBook />
          </div>
          <p className="mt-4 font-semibold text-ink">Courses</p>
          <p className="mt-1 text-sm text-muted">Published content for your classes.</p>
        </Link>
        <Link
          href={`/i/${slug}/student/results`}
          className="group rounded-2xl border border-ink/10 bg-white p-6 shadow-xs transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/12 text-success">
            <IconTrophy />
          </div>
          <p className="mt-4 font-semibold text-ink">Results</p>
          <p className="mt-1 text-sm text-muted">Published marks and report cards.</p>
        </Link>
      </div>
    </section>
  );
}