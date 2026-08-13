import Link from "next/link";
import { loadStudentsPage } from "@/capabilities/students/lib/actions";
import { CreateStudentForm, ImportCsvForm } from "@/components/people-forms";
import { Card, EmptyState } from "@/components/ui/card";
import { Table } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { students, classes } = await loadStudentsPage(slug);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            className="text-2xl font-semibold tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Students
          </h2>
          <p className="mt-1 text-sm text-muted">
            Roster seats are consumed on create/approve — not on pending applications.{" "}
            <Link href={`/i/${slug}/admin/applications`} className="text-accent hover:underline">
              Approval queue
            </Link>
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Add a student"
          description="Add a student and their guardian (optional) directly to the roster."
        >
          <CreateStudentForm slug={slug} classes={classes} />
        </Card>
        <Card
          title="CSV import"
          description="Columns: full_name, email, phone"
        >
          <ImportCsvForm slug={slug} />
        </Card>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-ink">
          Roster <span className="text-sm font-normal text-muted">({students.length})</span>
        </h3>
        {students.length === 0 ? (
          <EmptyState
            title="No students yet"
            description="Add your first student above, or publish a registration link for families to join."
          />
        ) : (
          <Table headers={["Name", "Email"]}>
            {students.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-surface/60">
                <td className="px-4 py-3 font-medium text-ink">{s.fullName}</td>
                <td className="px-4 py-3 text-muted">{s.email ?? "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </section>
  );
}
