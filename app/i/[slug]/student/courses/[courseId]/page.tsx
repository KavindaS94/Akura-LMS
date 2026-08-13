import Link from "next/link";
import { loadStudentCoursePage } from "@/capabilities/courses/lib/actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function StudentCourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string; courseId: string }>;
}) {
  const { slug, courseId } = await params;
  const { course, modules } = await loadStudentCoursePage(slug, courseId);

  return (
    <section className="space-y-8">
      <div>
        <Link href={`/i/${slug}/student/courses`} className="text-sm text-accent hover:underline">
          ← Courses
        </Link>
        <h2
          className="mt-2 text-2xl font-semibold tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {course.title}
        </h2>
        {course.description ? (
          <p className="mt-2 text-muted">{course.description}</p>
        ) : null}
      </div>

      {modules.length === 0 ? (
        <p className="text-sm text-muted">No modules published yet.</p>
      ) : (
        <div className="space-y-4">
          {modules.map(({ module: mod, unlocked, resources }) => (
            <Card
              key={mod.id}
              title={mod.title}
              action={
                unlocked ? (
                  <Badge tone="success">Available</Badge>
                ) : (
                  <Badge tone="warning">Locked</Badge>
                )
              }
            >
              {!unlocked ? (
                <p className="text-sm text-muted">
                  Locked until{" "}
                  {mod.availableAt
                    ? mod.availableAt.toISOString().replace("T", " ").slice(0, 16)
                    : "scheduled"}{" "}
                  UTC
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {resources.map((r) => (
                    <li key={r.id} className="rounded-lg bg-surface/60 px-3 py-2">
                      {r.type === "file" ? (
                        <a
                          className="font-medium text-accent hover:underline"
                          href={`/api/resources/${r.id}/download?slug=${encodeURIComponent(slug)}`}
                        >
                          {r.title} (download)
                        </a>
                      ) : r.type === "link" ? (
                        <a
                          className="font-medium text-accent hover:underline"
                          href={r.externalUrl ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {r.title}
                        </a>
                      ) : (
                        <div>
                          <p className="font-medium text-ink">{r.title}</p>
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
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}