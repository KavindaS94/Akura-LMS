import Link from "next/link";
import { loadTeacherAttendanceHome } from "@/capabilities/attendance/lib/actions";
import { OpenSessionButton } from "@/components/open-session-button";

export const dynamic = "force-dynamic";

export default async function TeacherAttendanceIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { classes } = await loadTeacherAttendanceHome(slug);

  return (
    <section className="space-y-6">
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Attendance
        </h2>
        <p className="mt-2 text-muted">
          Open today&apos;s session, tap absentees, save. Drafts stay on this device if
          the connection drops.
        </p>
      </div>

      {classes.length === 0 ? (
        <p className="text-sm text-muted">
          No classes assigned. Ask an admin to set your auth user id on a class.
        </p>
      ) : (
        <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
          {classes.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-3"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                {c.academicYear ? (
                  <p className="text-xs text-muted">{c.academicYear}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <OpenSessionButton slug={slug} classId={c.id} />
                <Link
                  href={`/i/${slug}/teacher/attendance/report/${c.id}`}
                  className="rounded-md border border-ink/20 px-3 py-2 text-sm"
                >
                  Report
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
