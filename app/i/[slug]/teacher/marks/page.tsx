import Link from "next/link";
import { loadTeacherMarksHome } from "@/capabilities/exams/lib/actions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "neutral" | "accent" | "success"> = {
  draft: "neutral",
  in_progress: "accent",
  published: "success",
};

export default async function TeacherMarksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { classes, exams } = await loadTeacherMarksHome(slug);
  const className = new Map(classes.map((c) => [c.id, c.name]));

  return (
    <section className="space-y-8">
      <PageHeader
        title="Marks"
        subtitle="Enter draft scores. An admin publishes when the grid is complete."
      />

      {exams.length === 0 ? (
        <EmptyState
          title="No exams for your classes yet"
          description="Ask an admin to create one."
        />
      ) : (
        <ul className="space-y-3">
          {exams.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-4 shadow-xs"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">{e.title}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {className.get(e.classId) ?? "Class"} ·{" "}
                  {e.examDate.toISOString().slice(0, 10)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={statusTone[e.status] ?? "neutral"}>{e.status}</Badge>
                <Link
                  href={`/i/${slug}/teacher/marks/${e.id}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Enter marks →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}