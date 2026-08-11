import Link from "next/link";
import { loadStudentCoursePage } from "@/capabilities/courses/lib/actions";

export const dynamic = "force-dynamic";

export default async function StudentCourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string; courseId: string }>;
}) {
  const { slug, courseId } = await params;
  const { course, modules } = await loadStudentCoursePage(slug, courseId);

  return (
    <section className="space-y-6">
      <div>
        <Link href={`/i/${slug}/student/courses`} className="text-sm text-accent">
          ← Courses
        </Link>
        <h2
          className="mt-2 text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {course.title}
        </h2>
        {course.description ? (
          <p className="mt-2 text-muted">{course.description}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        {modules.map(({ module: mod, unlocked, resources }) => (
          <article key={mod.id} className="border border-ink/10 bg-white p-4">
            <h3 className="font-medium">{mod.title}</h3>
            {!unlocked ? (
              <p className="mt-1 text-sm text-muted">
                Locked until{" "}
                {mod.availableAt
                  ? mod.availableAt.toISOString().replace("T", " ").slice(0, 16)
                  : "scheduled"}{" "}
                UTC
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {resources.map((r) => (
                  <li key={r.id}>
                    {r.type === "file" ? (
                      <a
                        className="text-accent"
                        href={`/api/resources/${r.id}/download?slug=${encodeURIComponent(slug)}`}
                      >
                        {r.title} (download)
                      </a>
                    ) : r.type === "link" ? (
                      <a
                        className="text-accent"
                        href={r.externalUrl ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {r.title}
                      </a>
                    ) : (
                      <div>
                        <p className="font-medium">{r.title}</p>
                        <p className="mt-1 whitespace-pre-wrap text-muted">{r.body}</p>
                      </div>
                    )}
                  </li>
                ))}
                {resources.length === 0 ? (
                  <li className="text-muted">No resources in this module.</li>
                ) : null}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
