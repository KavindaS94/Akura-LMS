import { loadClassesPage } from "@/capabilities/students/lib/actions";
import { AssignTeacherForm, CreateClassForm } from "@/components/people-forms";

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
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Classes
        </h2>
        <CreateClassForm slug={slug} />
      </div>
      <ul className="divide-y divide-ink/10 border border-ink/10">
        {classes.map((c) => (
          <li key={c.id} className="px-3 py-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span>
                {c.name}
                {c.academicYear ? ` · ${c.academicYear}` : ""}
              </span>
              <span className="font-mono text-xs text-muted">
                {c.teacherAuthUserId ?? "No teacher"}
              </span>
            </div>
            <AssignTeacherForm slug={slug} classId={c.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
