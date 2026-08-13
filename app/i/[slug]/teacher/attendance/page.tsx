import Link from "next/link";
import { loadTeacherAttendanceHome } from "@/capabilities/attendance/lib/actions";
import { OpenSessionButton } from "@/components/open-session-button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function TeacherAttendanceIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { classes } = await loadTeacherAttendanceHome(slug);

  return (
    <section className="space-y-8">
      <PageHeader
        title="Attendance"
        subtitle="Open today's session, tap absentees, save. Drafts stay on this device if the connection drops."
      />

      {classes.length === 0 ? (
        <EmptyState
          title="No classes assigned"
          description="Ask an admin to set your auth user id on a class."
        />
      ) : (
        <ul className="space-y-3">
          {classes.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-4 shadow-xs"
            >
              <div>
                <p className="font-semibold text-ink">{c.name}</p>
                {c.academicYear ? (
                  <p className="mt-0.5 text-sm text-muted">{c.academicYear}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <OpenSessionButton slug={slug} classId={c.id} />
                <Link
                  href={`/i/${slug}/teacher/attendance/report/${c.id}`}
                  className="inline-flex items-center rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-ink/30"
                >
                  Report
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
