import Link from "next/link";
import { loadExamGridPage } from "@/capabilities/exams/lib/actions";
import { MarksEntryGrid } from "@/components/marks-entry-grid";
import { PublishExamButton } from "@/components/exam-forms";

export const dynamic = "force-dynamic";

export default async function AdminExamDetailPage({
  params,
}: {
  params: Promise<{ slug: string; examId: string }>;
}) {
  const { slug, examId } = await params;
  const { exam, maxMarks, roster } = await loadExamGridPage(slug, examId);
  const published = exam.status === "published";

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/i/${slug}/admin/exams`} className="text-sm text-accent">
            ← Exams
          </Link>
          <h2
            className="mt-2 text-2xl font-semibold"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {exam.title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {exam.examDate.toISOString().slice(0, 10)} · {exam.status}
          </p>
        </div>
        {!published ? <PublishExamButton slug={slug} examId={exam.id} /> : null}
      </div>

      <MarksEntryGrid
        slug={slug}
        examId={exam.id}
        maxMarks={maxMarks}
        published={published}
        initial={roster.map((r) => ({
          studentId: r.student.id,
          fullName: r.student.fullName,
          score: r.score,
        }))}
      />

      {published ? (
        <ul className="space-y-2 text-sm">
          <li className="font-medium">Report cards</li>
          {roster.map((r) => (
            <li key={r.student.id}>
              <a
                className="text-accent"
                href={`/api/report-card?slug=${encodeURIComponent(slug)}&examId=${exam.id}&studentId=${r.student.id}`}
              >
                PDF — {r.student.fullName}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
