import Link from "next/link";
import { loadAdminExamsPage } from "@/capabilities/exams/lib/actions";
import { CreateExamForm } from "@/components/exam-forms";

export const dynamic = "force-dynamic";

export default async function AdminExamsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { classes, exams } = await loadAdminExamsPage(slug);
  const className = new Map(classes.map((c) => [c.id, c.name]));

  return (
    <section className="space-y-8">
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Exams
        </h2>
        <p className="mt-2 text-muted">
          Create exams, enter marks with teachers, then publish when ready.
        </p>
        <CreateExamForm
          slug={slug}
          classes={classes.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>

      <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
        {exams.length === 0 ? (
          <li className="px-3 py-3 text-sm text-muted">No exams yet.</li>
        ) : (
          exams.map((e) => (
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
                href={`/i/${slug}/admin/exams/${e.id}`}
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
