import Link from "next/link";
import { loadAttendanceReportPage } from "@/capabilities/attendance/lib/actions";
import { AttendanceReportTools } from "@/components/attendance-report-tools";
import { PageHeader } from "@/components/ui/page-header";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default async function AttendanceReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; classId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { slug, classId } = await params;
  const sp = await searchParams;
  const range = {
    from: sp.from ?? defaultRange().from,
    to: sp.to ?? defaultRange().to,
  };
  const { report, sessions } = await loadAttendanceReportPage(
    slug,
    classId,
    range.from,
    range.to,
  );

  return (
    <section className="space-y-8 print:space-y-3">
      <div className="print:hidden">
        <Link href={`/i/${slug}/teacher/attendance`} className="text-sm text-accent hover:underline">
          ← Attendance
        </Link>
      </div>

      <PageHeader
        title="Class report"
        subtitle={
          <>
            {range.from} → {range.to} · {report.sessions.length} session(s) · eligibility{" "}
            <strong className="text-ink">{report.eligibilityPct}%</strong>
          </>
        }
        action={
          <AttendanceReportTools
            className={classId}
            eligibilityPct={report.eligibilityPct}
            rows={report.students.map((s) => ({
              name: s.student.fullName,
              present: s.present,
              absent: s.absent,
              late: s.late,
              percentage: s.percentage,
              longestAbsenceStreak: s.longestAbsenceStreak,
              eligible: s.eligible,
            }))}
          />
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="text-sm">
          <span className="font-medium text-ink">From</span>
          <input
            type="date"
            name="from"
            defaultValue={range.from}
            className="mt-1 block rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium text-ink">To</span>
          <input
            type="date"
            name="to"
            defaultValue={range.to}
            className="mt-1 block rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>
        <Button type="submit" variant="ghost" size="sm">
          Update range
        </Button>
      </form>

      <Table
        headers={["Student", "Present", "Absent", "Late", "%", "Absence streak", "Eligible"]}
      >
        {report.students.map((s) => (
          <tr key={s.student.id} className="transition-colors hover:bg-surface/60">
            <td className="px-4 py-3 font-medium text-ink">{s.student.fullName}</td>
            <td className="px-4 py-3">{s.present}</td>
            <td className="px-4 py-3">{s.absent}</td>
            <td className="px-4 py-3">{s.late}</td>
            <td className="px-4 py-3">{s.percentage}</td>
            <td className="px-4 py-3">{s.longestAbsenceStreak}</td>
            <td className="px-4 py-3">
              <Badge tone={s.eligible ? "success" : "danger"}>
                {s.eligible ? "Yes" : "No"}
              </Badge>
            </td>
          </tr>
        ))}
      </Table>

      {report.students[0] ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-ink">
            Calendar (first student sample)
          </h3>
          <ul className="grid gap-1 text-xs sm:grid-cols-2 md:grid-cols-3">
            {report.students[0].calendar.map((d) => (
              <li key={d.date} className="rounded-lg border border-ink/10 px-2 py-1 text-muted">
                {d.date}: {d.status}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="print:hidden">
        <h3 className="text-lg font-semibold text-ink">Recent sessions</h3>
        <ul className="mt-3 space-y-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-ink/10 bg-white px-4 py-3 text-sm shadow-xs"
            >
              <span className="font-medium text-ink">
                {s.sessionDate.toISOString().slice(0, 10)}
              </span>
              <Link
                href={`/i/${slug}/teacher/attendance/${s.id}`}
                className="font-medium text-accent hover:underline"
              >
                Open · {s.status} →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}