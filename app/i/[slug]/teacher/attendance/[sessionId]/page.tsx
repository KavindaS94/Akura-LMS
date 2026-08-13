import Link from "next/link";
import { loadSessionPage } from "@/capabilities/attendance/lib/actions";
import { AttendanceMarker } from "@/components/attendance-marker";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function TeacherSessionPage({
  params,
}: {
  params: Promise<{ slug: string; sessionId: string }>;
}) {
  const { slug, sessionId } = await params;
  const { ctx, session, roster, locked } = await loadSessionPage(slug, sessionId);

  return (
    <section className="space-y-8">
      <div>
        <Link
          href={`/i/${slug}/teacher/attendance`}
          className="text-sm text-accent hover:underline"
        >
          ← Classes
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2
            className="text-2xl font-semibold tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Mark attendance
          </h2>
          <Badge tone={locked ? "neutral" : "success"}>{locked ? "Locked" : "Open"}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          {session.sessionDate.toISOString().slice(0, 10)}
          {ctx.membership.role === "admin" && locked
            ? " — admin edit requires a reason"
            : ""}
        </p>
      </div>

      <Card
        title={`${roster.length} students`}
        description="Tap a student to change their status."
      >
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
      </Card>
    </section>
  );
}