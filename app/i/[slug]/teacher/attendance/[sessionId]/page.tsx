import Link from "next/link";
import { loadSessionPage } from "@/capabilities/attendance/lib/actions";
import { AttendanceMarker } from "@/components/attendance-marker";

export const dynamic = "force-dynamic";

export default async function TeacherSessionPage({
  params,
}: {
  params: Promise<{ slug: string; sessionId: string }>;
}) {
  const { slug, sessionId } = await params;
  const { ctx, session, roster, locked } = await loadSessionPage(slug, sessionId);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href={`/i/${slug}/teacher/attendance`}
            className="text-sm text-accent"
          >
            ← Classes
          </Link>
          <h2
            className="mt-2 text-2xl font-semibold"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Mark attendance
          </h2>
          <p className="mt-1 text-sm text-muted">
            {session.sessionDate.toISOString().slice(0, 10)}
            {locked ? " · Locked" : " · Open"}
            {ctx.membership.role === "admin" && locked
              ? " — admin edit requires a reason"
              : ""}
          </p>
        </div>
      </div>

      <AttendanceMarker
        slug={slug}
        sessionId={session.id}
        roster={roster.map((r) => ({
          student: { id: r.student.id, fullName: r.student.fullName },
          effectiveStatus: r.effectiveStatus,
          mark: r.mark
            ? { arrivedAt: r.mark.arrivedAt, note: r.mark.note }
            : null,
        }))}
        isAdmin={ctx.membership.role === "admin"}
        locked={locked}
      />
    </section>
  );
}
