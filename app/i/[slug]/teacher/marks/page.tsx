import Link from "next/link";
import { loadTeacherMarksHome } from "@/capabilities/exams/lib/actions";

export const dynamic = "force-dynamic";

export default async function TeacherMarksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { classes, exams } = await loadTeacherMarksHome(slug);
  const className = new Map(classes.map((c) => [c.id, c.name]));

  return (
    <section className="space-y-6">
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Marks
        </h2>
        <p className="mt-2 text-muted">
          Enter draft scores. An admin publishes when the grid is complete.
        </p>
      </div>

      {exams.length === 0 ? (
        <p className="text-sm text-muted">
          No exams for your classes yet. Ask an admin to create one.
        </p>
      ) : (
        <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
          {exams.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-muted">
                  {className.get(e.classId) ?? "Class"} ·{" "}
                  {e.examDate.toISOString().slice(0, 10)} · {e.status}
                </p>
              </div>
              <Link
                href={`/i/${slug}/teacher/marks/${e.id}`}
                className="text-accent"
              >
                Enter marks
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
