import { loadStudentResultsPage } from "@/capabilities/exams/lib/actions";

export const dynamic = "force-dynamic";

export default async function StudentResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { results, error, studentId } = await loadStudentResultsPage(slug);

  return (
    <section className="space-y-6">
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Results
        </h2>
        <p className="mt-2 text-muted">Published marks only.</p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {results.length === 0 && !error ? (
        <p className="text-sm text-muted">No published results yet.</p>
      ) : (
        <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
          {results.map((r) => (
            <li key={r.examId} className="px-3 py-3 text-sm">
              <p className="font-medium">{r.title}</p>
              <p className="text-xs text-muted">
                {r.className} · {r.examDate.toISOString().slice(0, 10)}
              </p>
              <p className="mt-1">
                {r.score}/{r.maxMarks}
                {r.percentage !== null ? ` (${r.percentage}%)` : ""}
                {r.letter ? ` · ${r.letter}` : ""}
                {r.showRank && r.rank != null ? ` · Rank ${r.rank}` : ""}
              </p>
              {studentId ? (
                <a
                  className="mt-1 inline-block text-accent"
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
