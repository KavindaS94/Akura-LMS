import Link from "next/link";
import { loadStudentsPage } from "@/capabilities/students/lib/actions";
import { CreateStudentForm, ImportCsvForm } from "@/components/people-forms";

export const dynamic = "force-dynamic";

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { students, classes } = await loadStudentsPage(slug);

  return (
    <section className="space-y-10">
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Students
        </h2>
        <p className="mt-2 text-muted">
          Roster seats are consumed on create/approve — not on pending applications.{" "}
          <Link href={`/i/${slug}/admin/applications`} className="text-accent">
            Approval queue
          </Link>
        </p>
        <CreateStudentForm slug={slug} classes={classes} />
      </div>

      <div>
        <h3 className="text-lg font-semibold">CSV import</h3>
        <ImportCsvForm slug={slug} />
      </div>

      <div>
        <h3 className="text-lg font-semibold">Roster ({students.length})</h3>
        <ul className="mt-3 divide-y divide-ink/10 border border-ink/10">
          {students.map((s) => (
            <li key={s.id} className="flex justify-between gap-2 px-3 py-2 text-sm">
              <span>{s.fullName}</span>
              <span className="text-muted">{s.email ?? "—"}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
