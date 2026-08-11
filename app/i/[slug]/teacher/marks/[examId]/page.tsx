import Link from "next/link";
import { loadExamGridPage } from "@/capabilities/exams/lib/actions";
import { MarksEntryGrid } from "@/components/marks-entry-grid";

export const dynamic = "force-dynamic";

export default async function TeacherExamMarksPage({
  params,
}: {
  params: Promise<{ slug: string; examId: string }>;
}) {
  const { slug, examId } = await params;
  const { exam, maxMarks, roster } = await loadExamGridPage(slug, examId);
  const published = exam.status === "published";

  return (
    <section className="space-y-6">
      <div>
        <Link href={`/i/${slug}/teacher/marks`} className="text-sm text-accent">
          ← Marks
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
    </section>
  );
}
