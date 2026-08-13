import Link from "next/link";
import { loadAdminExamsPage } from "@/capabilities/exams/lib/actions";
import { CreateExamForm } from "@/components/exam-forms";
import { Card, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "neutral" | "accent" | "success" | "warning"> = {
  draft: "neutral",
  published: "success",
  archived: "neutral",
};

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
      <PageHeader
        title="Exams"
        subtitle="Create exams, enter marks with teachers, then publish when ready."
      />

      <Card title="Create an exam">
        <CreateExamForm
          slug={slug}
          classes={classes.map((c) => ({ id: c.id, name: c.name }))}
        />
      </Card>

      {exams.length === 0 ? (
        <EmptyState title="No exams yet" description="Create your first exam above." />
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
                  href={`/i/${slug}/admin/exams/${e.id}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Open →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
