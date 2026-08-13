import { loadStudentResultsPage } from "@/capabilities/exams/lib/actions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function StudentResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { results, error, studentId } = await loadStudentResultsPage(slug);

  return (
    <section className="space-y-8">
      <PageHeader title="Results" subtitle="Published marks only." />

      {error ? <Alert tone="error">{error}</Alert> : null}

      {results.length === 0 && !error ? (
        <EmptyState
          title="No published results yet"
          description="Your institute will publish results here, and guardians receive them by email."
        />
      ) : (
        <ul className="space-y-3">
          {results.map((r) => (
            <li
              key={r.examId}
              className="rounded-xl border border-ink/10 bg-white p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">{r.title}</p>
                <Badge tone="success">
                  {r.score}/{r.maxMarks}
                  {r.percentage !== null ? ` · ${r.percentage}%` : ""}
                  {r.letter ? ` · ${r.letter}` : ""}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                {r.className} · {r.examDate.toISOString().slice(0, 10)}
                {r.showRank && r.rank != null ? ` · Rank ${r.rank}` : ""}
              </p>
              {studentId ? (
                <a
                  className="mt-3 inline-block rounded-lg border border-ink/20 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent"
                  href={`/api/report-card?slug=${encodeURIComponent(slug)}&examId=${r.examId}&studentId=${studentId}`}
                >
                  Download report card
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}