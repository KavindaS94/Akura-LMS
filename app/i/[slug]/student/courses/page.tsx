import Link from "next/link";
import { loadStudentCoursesPage } from "@/capabilities/courses/lib/actions";

export const dynamic = "force-dynamic";

export default async function StudentCoursesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { courses, error } = await loadStudentCoursesPage(slug);

  return (
    <section className="space-y-6">
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Courses
        </h2>
        <p className="mt-2 text-muted">Published courses for your classes.</p>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
        {courses.length === 0 && !error ? (
          <li className="px-3 py-3 text-sm text-muted">No courses yet.</li>
        ) : (
          courses.map(({ course, className }) => (
            <li
              key={course.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{course.title}</p>
                <p className="text-xs text-muted">{className}</p>
              </div>
              <Link
                href={`/i/${slug}/student/courses/${course.id}`}
                className="text-accent"
              >
                Open
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
