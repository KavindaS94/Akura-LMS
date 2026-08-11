import Link from "next/link";
import { loadAttendanceReportPage } from "@/capabilities/attendance/lib/actions";
import { AttendanceReportTools } from "@/components/attendance-report-tools";

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

  const classLabel =
    sessions[0]?.classId === classId ? "Class report" : "Class report";

  return (
    <section className="space-y-6 print:space-y-3">
      <div className="print:hidden">
        <Link href={`/i/${slug}/teacher/attendance`} className="text-sm text-accent">
          ← Attendance
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {classLabel}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {range.from} → {range.to} · {report.sessions.length} session(s) ·
            eligibility {report.eligibilityPct}%
          </p>
        </div>
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
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 print:hidden"
      >
        <label className="text-sm">
          From
          <input
            type="date"
            name="from"
            defaultValue={range.from}
            className="mt-1 block rounded-md border border-ink/15 px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          To
          <input
            type="date"
            name="to"
            defaultValue={range.to}
            className="mt-1 block rounded-md border border-ink/15 px-2 py-1.5"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-ink/20 px-3 py-2 text-sm"
        >
          Update range
        </button>
      </form>

      <div className="overflow-x-auto border border-ink/10 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-ink/10 bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Present</th>
              <th className="px-3 py-2">Absent</th>
              <th className="px-3 py-2">Late</th>
              <th className="px-3 py-2">%</th>
              <th className="px-3 py-2">Absence streak</th>
              <th className="px-3 py-2">Eligible</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {report.students.map((s) => (
              <tr key={s.student.id}>
                <td className="px-3 py-2 font-medium">{s.student.fullName}</td>
                <td className="px-3 py-2">{s.present}</td>
                <td className="px-3 py-2">{s.absent}</td>
                <td className="px-3 py-2">{s.late}</td>
                <td className="px-3 py-2">{s.percentage}</td>
                <td className="px-3 py-2">{s.longestAbsenceStreak}</td>
                <td className="px-3 py-2">
                  {s.eligible ? (
                    <span className="text-success">Yes</span>
                  ) : (
                    <span className="text-danger">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {report.students[0] ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Calendar (first student sample)</h3>
          <p className="text-xs text-muted">
            Full per-student calendars available in CSV via the mark history columns
            in later polish; session list below.
          </p>
          <ul className="grid gap-1 text-xs sm:grid-cols-2 md:grid-cols-3">
            {report.students[0].calendar.map((d) => (
              <li key={d.date} className="rounded border border-ink/10 px-2 py-1">
                {d.date}: {d.status}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="print:hidden">
        <h3 className="text-lg font-semibold">Recent sessions</h3>
        <ul className="mt-2 divide-y divide-ink/10 border border-ink/10 text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex justify-between px-3 py-2">
              <span>{s.sessionDate.toISOString().slice(0, 10)}</span>
              <Link
                href={`/i/${slug}/teacher/attendance/${s.id}`}
                className="text-accent"
              >
                Open · {s.status}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
