import Link from "next/link";
import { loadStudentCoursesPage } from "@/capabilities/courses/lib/actions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function StudentCoursesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { courses, error } = await loadStudentCoursesPage(slug);

  return (
    <section className="space-y-8">
      <PageHeader title="Courses" subtitle="Published courses for your classes." />

      {error ? <Alert tone="error">{error}</Alert> : null}

      {courses.length === 0 && !error ? (
        <EmptyState
          title="No courses yet"
          description="Courses will appear here once published by your institute."
        />
      ) : (
        <ul className="space-y-3">
          {courses.map(({ course, className }) => (
            <li
              key={course.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-4 shadow-xs"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">{course.title}</p>
                <p className="mt-0.5 text-sm text-muted">{className}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="success">Published</Badge>
                <Link
                  href={`/i/${slug}/student/courses/${course.id}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Open →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}