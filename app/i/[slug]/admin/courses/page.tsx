import Link from "next/link";
import { loadCoursesEditorHome } from "@/capabilities/courses/lib/actions";
import { CreateCourseForm } from "@/components/course-editor";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { courses, classes } = await loadCoursesEditorHome(slug);

  return (
    <section className="space-y-8">
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Courses
        </h2>
        <p className="mt-2 text-muted">
          Build Course → Module → Resource content for a class.
        </p>
        <CreateCourseForm
          slug={slug}
          classes={classes.map((c) => ({ id: c.id, name: c.name }))}
          editorBase={`/i/${slug}/admin/courses`}
        />
      </div>
      <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
        {courses.length === 0 ? (
          <li className="px-3 py-3 text-sm text-muted">No courses yet.</li>
        ) : (
          courses.map(({ course, className }) => (
            <li
              key={course.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{course.title}</p>
                <p className="text-xs text-muted">
                  {className} · {course.status}
                </p>
              </div>
              <Link href={`/i/${slug}/admin/courses/${course.id}`} className="text-accent">
                Edit
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
