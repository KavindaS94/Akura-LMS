import Link from "next/link";
import { loadExamGridPage } from "@/capabilities/exams/lib/actions";
import { MarksEntryGrid } from "@/components/marks-entry-grid";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <section className="space-y-8">
      <div>
        <Link href={`/i/${slug}/teacher/marks`} className="text-sm text-accent hover:underline">
          ← Marks
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2
            className="text-2xl font-semibold tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {exam.title}
          </h2>
          <Badge tone={published ? "success" : "neutral"}>{exam.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          {exam.examDate.toISOString().slice(0, 10)}
        </p>
      </div>

      <Card
        title="Marks entry"
        description={
          published
            ? "Published by an admin — marks are locked."
            : "Draft scores are saved but invisible until published."
        }
      >
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
      </Card>
    </section>
  );
}