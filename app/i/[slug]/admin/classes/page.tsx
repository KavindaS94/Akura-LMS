import { loadClassesPage } from "@/capabilities/students/lib/actions";
import { AssignTeacherForm, CreateClassForm } from "@/components/people-forms";
import { Card, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ClassesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { classes } = await loadClassesPage(slug);

  return (
    <section className="space-y-8">
      <PageHeader title="Classes" subtitle="Create classes and assign their teachers." />

      <Card title="Create a class" description="A class groups students for attendance and exams.">
        <CreateClassForm slug={slug} />
      </Card>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-ink">
          All classes{" "}
          <span className="text-sm font-normal text-muted">({classes.length})</span>
        </h3>
        {classes.length === 0 ? (
          <EmptyState
            title="No classes yet"
            description="Create your first class to start tracking attendance."
          />
        ) : (
          <ul className="space-y-3">
            {classes.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-ink/10 bg-white p-4 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">
                      {c.name}
                      {c.academicYear ? (
                        <span className="ml-2 font-normal text-muted">· {c.academicYear}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {c.teacherAuthUserId ? (
                        <>
                          Teacher <code className="text-ink/70">{c.teacherAuthUserId}</code>
                        </>
                      ) : (
                        <Badge tone="warning">No teacher assigned</Badge>
                      )}
                    </p>
                  </div>
                </div>
                <AssignTeacherForm slug={slug} classId={c.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
