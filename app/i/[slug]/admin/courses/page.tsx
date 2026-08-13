import Link from "next/link";
import { loadCoursesEditorHome } from "@/capabilities/courses/lib/actions";
import { CreateCourseForm } from "@/components/course-editor";
import { Card, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "neutral" | "success"> = {
  draft: "neutral",
  published: "success",
};

export default async function AdminCoursesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { courses, classes } = await loadCoursesEditorHome(slug);

  return (
    <section className="space-y-8">
      <PageHeader
        title="Courses"
        subtitle="Build Course → Module → Resource content for a class."
      />

      <Card title="Create a course">
        <CreateCourseForm
          slug={slug}
          classes={classes.map((c) => ({ id: c.id, name: c.name }))}
          editorBase={`/i/${slug}/admin/courses`}
        />
      </Card>

      {courses.length === 0 ? (
        <EmptyState title="No courses yet" description="Create your first course above." />
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
                <Badge tone={statusTone[course.status] ?? "neutral"}>{course.status}</Badge>
                <Link
                  href={`/i/${slug}/admin/courses/${course.id}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Edit →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
