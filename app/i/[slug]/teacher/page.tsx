import Link from "next/link";
import { requireRole } from "@/lib/tenant/context";
import { TEACHER_ROLES } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function TeacherHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireRole(slug, TEACHER_ROLES);

  return (
    <section className="space-y-8">
      <PageHeader title="Today" subtitle={`Hello ${ctx.user.email}.`} />
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/i/${slug}/teacher/attendance`}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent/90 hover:shadow"
        >
          Mark attendance
        </Link>
        <Link
          href={`/i/${slug}/teacher/marks`}
          className="inline-flex items-center gap-2 rounded-lg border border-ink/15 bg-white px-5 py-2.5 text-sm font-medium text-ink shadow-sm transition-colors hover:border-ink/30"
        >
          Enter marks
        </Link>
        <Link
          href={`/i/${slug}/teacher/course-editor`}
          className="inline-flex items-center gap-2 rounded-lg border border-ink/15 bg-white px-5 py-2.5 text-sm font-medium text-ink shadow-sm transition-colors hover:border-ink/30"
        >
          Edit courses
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Attendance", "Open a session, mark, save."],
          ["Marks", "Draft scores until an admin publishes."],
          ["Courses", "Modules & resources for your classes."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border border-ink/10 bg-white p-5 shadow-xs">
            <Badge tone="accent">{title}</Badge>
            <p className="mt-3 text-sm text-muted">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}