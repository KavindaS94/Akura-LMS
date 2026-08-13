import Link from "next/link";
import { loadExamGridPage } from "@/capabilities/exams/lib/actions";
import { MarksEntryGrid } from "@/components/marks-entry-grid";
import { PublishExamButton } from "@/components/exam-forms";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/i/${slug}/admin/exams`} className="text-sm text-accent hover:underline">
            ← Exams
          </Link>
          <div className="mt-2 flex items-center gap-3">
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
        {!published ? <PublishExamButton slug={slug} examId={exam.id} /> : null}
      </div>

      <Card
        title="Marks entry"
        description={published ? "Published — changes are locked." : "Enter marks below."}
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

      {published ? (
        <Card title="Report cards" description="Download a PDF per student.">
          <ul className="space-y-2 text-sm">
            {roster.map((r) => (
              <li key={r.student.id}>
                <a
                  className="text-accent hover:underline"
                  href={`/api/report-card?slug=${encodeURIComponent(slug)}&examId=${exam.id}&studentId=${r.student.id}`}
                >
                  PDF — {r.student.fullName}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </section>
  );
}
