import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import {
  attendance,
  attendanceEdits,
  auditLog,
  classEnrolments,
  classSessions,
  classes,
  events,
  students,
  type AttendanceStatus,
  type ClassSession,
} from "@/lib/db/schema";
import { withTenant, type Tx } from "@/lib/db/tenant";
import { getSetting, getSettingInTx } from "@/lib/settings";

export class AttendanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttendanceError";
  }
}

function startOfDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function isSessionLocked(
  tenantId: string,
  userId: string,
  session: ClassSession,
): Promise<boolean> {
  if (session.status === "locked") return true;
  const lockHours = await getSetting<number>(tenantId, userId, "attendance.lock_hours");
  const hours = typeof lockHours === "number" ? lockHours : 48;
  const created = session.createdAt.getTime();
  return Date.now() - created > hours * 60 * 60 * 1000;
}

export async function openOrGetTodaySession(opts: {
  tenantId: string;
  userId: string;
  classId: string;
  startTime?: string | null;
}) {
  // Attendance must never call assertWritable
  return withTenant(
    { tenantId: opts.tenantId, userId: opts.userId },
    async (tx) => {
      const today = startOfDay(new Date());
      const existing = await tx
        .select()
        .from(classSessions)
        .where(
          and(
            eq(classSessions.tenantId, opts.tenantId),
            eq(classSessions.classId, opts.classId),
            eq(classSessions.sessionDate, today),
            opts.startTime
              ? eq(classSessions.startTime, opts.startTime)
              : isNull(classSessions.startTime),
            isNull(classSessions.deletedAt),
          ),
        )
        .limit(1);

      if (existing[0]) return existing[0];

      const [created] = await tx
        .insert(classSessions)
        .values({
          tenantId: opts.tenantId,
          classId: opts.classId,
          teacherAuthUserId: opts.userId,
          sessionDate: today,
          startTime: opts.startTime ?? null,
          status: "open",
        })
        .returning();

      if (!created) throw new AttendanceError("Could not open session");
      return created;
    },
  );
}

export async function getSessionRoster(opts: {
  tenantId: string;
  userId: string;
  sessionId: string;
}) {
  return withTenant(
    { tenantId: opts.tenantId, userId: opts.userId },
    async (tx) => {
      const sessionRows = await tx
        .select()
        .from(classSessions)
        .where(
          and(
            eq(classSessions.id, opts.sessionId),
            eq(classSessions.tenantId, opts.tenantId),
            isNull(classSessions.deletedAt),
          ),
        )
        .limit(1);
      const session = sessionRows[0];
      if (!session) throw new AttendanceError("Session not found");

      const enrolled = await tx
        .select({
          student: students,
          enrolment: classEnrolments,
        })
        .from(classEnrolments)
        .innerJoin(students, eq(classEnrolments.studentId, students.id))
        .where(
          and(
            eq(classEnrolments.classId, session.classId),
            eq(classEnrolments.status, "active"),
            isNull(classEnrolments.deletedAt),
            isNull(students.deletedAt),
            eq(students.status, "active"),
          ),
        )
        .orderBy(asc(students.fullName));

      const marks = await tx
        .select()
        .from(attendance)
        .where(eq(attendance.sessionId, session.id));

      const byStudent = new Map(marks.map((m) => [m.studentId, m]));
      const locked = await isSessionLockedOuter(
        tx,
        opts.tenantId,
        opts.userId,
        session,
      );

      return {
        session,
        locked,
        roster: enrolled.map(({ student }) => ({
          student,
          mark: byStudent.get(student.id) ?? null,
          // Default Present when unmarked — UI shows present until toggled
          effectiveStatus: (byStudent.get(student.id)?.status ??
            "present") as AttendanceStatus,
        })),
      };
    },
  );
}

export type MarkInput = {
  studentId: string;
  status: AttendanceStatus;
  arrivedAt?: string | null;
  note?: string | null;
};

export async function saveAttendanceMarks(opts: {
  tenantId: string;
  userId: string;
  sessionId: string;
  marks: MarkInput[];
  /** Admins may edit locked sessions with a reason */
  isAdmin?: boolean;
  editReason?: string;
}) {
  return withTenant(
    { tenantId: opts.tenantId, userId: opts.userId },
    async (tx) => {
      const sessionRows = await tx
        .select()
        .from(classSessions)
        .where(
          and(
            eq(classSessions.id, opts.sessionId),
            eq(classSessions.tenantId, opts.tenantId),
          ),
        )
        .limit(1);
      const session = sessionRows[0];
      if (!session) throw new AttendanceError("Session not found");

      const locked =
        session.status === "locked" ||
        (await isSessionLockedOuter(tx, opts.tenantId, opts.userId, session));

      if (locked && !opts.isAdmin) {
        throw new AttendanceError(
          "This session is locked. Ask an admin to edit with a reason.",
        );
      }
      if (locked && opts.isAdmin && !opts.editReason?.trim()) {
        throw new AttendanceError("A reason is required to edit locked attendance.");
      }

      const absentIds: string[] = [];
      const now = new Date();

      for (const mark of opts.marks) {
        const existing = await tx
          .select()
          .from(attendance)
          .where(
            and(
              eq(attendance.sessionId, session.id),
              eq(attendance.studentId, mark.studentId),
            ),
          )
          .limit(1);

        const arrivedAt =
          mark.status === "late" && mark.arrivedAt
            ? new Date(mark.arrivedAt)
            : mark.status === "late"
              ? now
              : null;

        if (existing[0]) {
          if (
            locked &&
            opts.isAdmin &&
            (existing[0].status !== mark.status ||
              String(existing[0].arrivedAt ?? "") !== String(arrivedAt ?? ""))
          ) {
            await tx.insert(attendanceEdits).values({
              tenantId: opts.tenantId,
              attendanceId: existing[0].id,
              previousStatus: existing[0].status,
              newStatus: mark.status,
              previousArrivedAt: existing[0].arrivedAt,
              newArrivedAt: arrivedAt,
              reason: opts.editReason!.trim(),
              editedBy: opts.userId,
            });
          }

          await tx
            .update(attendance)
            .set({
              status: mark.status,
              arrivedAt,
              markedAt: now,
              markedBy: opts.userId,
              note: mark.note ?? null,
              updatedAt: now,
            })
            .where(eq(attendance.id, existing[0].id));
        } else {
          await tx.insert(attendance).values({
            tenantId: opts.tenantId,
            sessionId: session.id,
            studentId: mark.studentId,
            status: mark.status,
            arrivedAt,
            markedAt: now,
            markedBy: opts.userId,
            note: mark.note ?? null,
          });
        }

        if (mark.status === "absent") absentIds.push(mark.studentId);
      }

      if (locked && session.status !== "locked") {
        await tx
          .update(classSessions)
          .set({ status: "locked", lockedAt: now, updatedAt: now })
          .where(eq(classSessions.id, session.id));
      }

      await tx.insert(events).values({
        tenantId: opts.tenantId,
        type: "attendance.marked",
        payload: {
          sessionId: session.id,
          classId: session.classId,
          markedBy: opts.userId,
          absentStudentIds: absentIds,
          count: opts.marks.length,
        },
      });

      await tx.insert(auditLog).values({
        tenantId: opts.tenantId,
        actorUserId: opts.userId,
        action: "attendance.marked",
        entityType: "class_session",
        entityId: session.id,
        payload: { marks: opts.marks.length, absences: absentIds.length },
      });

      return { absentIds, sessionId: session.id };
    },
  );
}

async function isSessionLockedOuter(
  tx: Tx,
  tenantId: string,
  userId: string,
  session: ClassSession,
) {
  const raw = await getSettingInTx<number>(tx, tenantId, "attendance.lock_hours");
  const hours = typeof raw === "number" ? raw : Number(raw);
  void userId;
  return Date.now() - session.createdAt.getTime() > hours * 60 * 60 * 1000;
}

export async function listTeacherClasses(opts: {
  tenantId: string;
  userId: string;
  isAdmin: boolean;
}) {
  return withTenant(
    { tenantId: opts.tenantId, userId: opts.userId },
    async (tx) => {
      if (opts.isAdmin) {
        return tx
          .select()
          .from(classes)
          .where(and(eq(classes.tenantId, opts.tenantId), isNull(classes.deletedAt)))
          .orderBy(asc(classes.name));
      }
      return tx
        .select()
        .from(classes)
        .where(
          and(
            eq(classes.tenantId, opts.tenantId),
            eq(classes.teacherAuthUserId, opts.userId),
            isNull(classes.deletedAt),
          ),
        )
        .orderBy(asc(classes.name));
    },
  );
}

export async function buildAttendanceReport(opts: {
  tenantId: string;
  userId: string;
  classId: string;
  from: Date;
  to: Date;
}) {
  return withTenant(
    { tenantId: opts.tenantId, userId: opts.userId },
    async (tx) => {
      const threshold = await getSettingInTx<number>(
        tx,
        opts.tenantId,
        "attendance.eligibility_threshold_pct",
      );
      const eligibilityPct = Number(threshold);

      const sessions = await tx
        .select()
        .from(classSessions)
        .where(
          and(
            eq(classSessions.classId, opts.classId),
            eq(classSessions.tenantId, opts.tenantId),
            gte(classSessions.sessionDate, opts.from),
            lte(classSessions.sessionDate, opts.to),
            isNull(classSessions.deletedAt),
          ),
        )
        .orderBy(asc(classSessions.sessionDate));

      const sessionIds = sessions.map((s) => s.id);
      if (sessionIds.length === 0) {
        return { sessions: [], students: [], eligibilityPct };
      }

      const enrolled = await tx
        .select({ student: students })
        .from(classEnrolments)
        .innerJoin(students, eq(classEnrolments.studentId, students.id))
        .where(
          and(
            eq(classEnrolments.classId, opts.classId),
            eq(classEnrolments.status, "active"),
            isNull(classEnrolments.deletedAt),
            isNull(students.deletedAt),
          ),
        );

      const marks = await tx
        .select()
        .from(attendance)
        .where(
          sql`${attendance.sessionId} IN (${sql.join(
            sessionIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})`,
        );

      const byStudentSession = new Map<string, string>();
      for (const m of marks) {
        byStudentSession.set(`${m.studentId}:${m.sessionId}`, m.status);
      }

      const studentStats = enrolled.map(({ student }) => {
        let present = 0;
        let absent = 0;
        let late = 0;
        let streak = 0;
        let longestAbsence = 0;
        const calendar: { date: string; status: string }[] = [];

        for (const session of sessions) {
          const status =
            byStudentSession.get(`${student.id}:${session.id}`) ?? "present";
          calendar.push({
            date: session.sessionDate.toISOString().slice(0, 10),
            status,
          });
          if (status === "present") {
            present += 1;
            streak = 0;
          } else if (status === "late") {
            late += 1;
            streak = 0;
          } else {
            absent += 1;
            streak += 1;
            longestAbsence = Math.max(longestAbsence, streak);
          }
        }

        const total = sessions.length;
        const attended = present + late;
        const percentage = total === 0 ? 0 : Math.round((attended / total) * 1000) / 10;

        return {
          student,
          present,
          absent,
          late,
          percentage,
          longestAbsenceStreak: longestAbsence,
          eligible: percentage >= eligibilityPct,
          calendar,
        };
      });

      return { sessions, students: studentStats, eligibilityPct };
    },
  );
}

export async function listRecentSessions(opts: {
  tenantId: string;
  userId: string;
  classId: string;
}) {
  return withTenant(
    { tenantId: opts.tenantId, userId: opts.userId },
    async (tx) => {
      return tx
        .select()
        .from(classSessions)
        .where(
          and(
            eq(classSessions.classId, opts.classId),
            eq(classSessions.tenantId, opts.tenantId),
            isNull(classSessions.deletedAt),
          ),
        )
        .orderBy(desc(classSessions.sessionDate), desc(classSessions.createdAt))
        .limit(30);
    },
  );
}
