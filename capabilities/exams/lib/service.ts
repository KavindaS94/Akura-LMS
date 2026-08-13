import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import {
  attendance,
  auditLog,
  classEnrolments,
  classSessions,
  classes,
  events,
  exams,
  marks,
  students,
  type Exam,
} from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { assertWritable } from "@/lib/billing/quota";
import { getSetting } from "@/lib/settings";
import {
  competitionRanks,
  letterFromPercent,
  percentage,
} from "@/capabilities/exams/lib/grades";

export class ExamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExamError";
  }
}

function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function createExam(opts: {
  tenantId: string;
  userId: string;
  classId: string;
  title: string;
  examDate: Date;
  maxMarks: number;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    await assertWritable(opts.tenantId, opts.userId, tx);
    if (opts.maxMarks <= 0) throw new ExamError("max_marks must be greater than 0");

    const [row] = await tx
      .insert(exams)
      .values({
        tenantId: opts.tenantId,
        classId: opts.classId,
        title: opts.title,
        examDate: opts.examDate,
        maxMarks: String(opts.maxMarks),
        status: "draft",
      })
      .returning();
    if (!row) throw new ExamError("Could not create exam");

    await tx.insert(auditLog).values({
      tenantId: opts.tenantId,
      actorUserId: opts.userId,
      action: "exam.created",
      entityType: "exam",
      entityId: row.id,
      payload: { classId: opts.classId, title: opts.title },
    });

    return row;
  });
}

export async function listExamsForClass(opts: {
  tenantId: string;
  userId: string;
  classId: string;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    return tx
      .select()
      .from(exams)
      .where(
        and(
          eq(exams.tenantId, opts.tenantId),
          eq(exams.classId, opts.classId),
          isNull(exams.deletedAt),
        ),
      )
      .orderBy(desc(exams.examDate), desc(exams.createdAt));
  });
}

export async function listExamsForTeacher(opts: {
  tenantId: string;
  userId: string;
  isAdmin: boolean;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    const classFilter = opts.isAdmin
      ? and(eq(classes.tenantId, opts.tenantId), isNull(classes.deletedAt))
      : and(
          eq(classes.tenantId, opts.tenantId),
          eq(classes.teacherAuthUserId, opts.userId),
          isNull(classes.deletedAt),
        );

    const classRows = await tx.select().from(classes).where(classFilter).orderBy(asc(classes.name));
    const classIds = classRows.map((c) => c.id);
    if (classIds.length === 0) return { classes: classRows, exams: [] as Exam[] };

    const examRows = await tx
      .select()
      .from(exams)
      .where(
        and(
          eq(exams.tenantId, opts.tenantId),
          isNull(exams.deletedAt),
          sql`${exams.classId} IN (${sql.join(
            classIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})`,
        ),
      )
      .orderBy(desc(exams.examDate), desc(exams.createdAt));

    return { classes: classRows, exams: examRows };
  });
}

export async function getExamGrid(opts: {
  tenantId: string;
  userId: string;
  examId: string;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    const examRows = await tx
      .select()
      .from(exams)
      .where(
        and(
          eq(exams.id, opts.examId),
          eq(exams.tenantId, opts.tenantId),
          isNull(exams.deletedAt),
        ),
      )
      .limit(1);
    const exam = examRows[0];
    if (!exam) throw new ExamError("Exam not found");

    const enrolled = await tx
      .select({ student: students })
      .from(classEnrolments)
      .innerJoin(students, eq(classEnrolments.studentId, students.id))
      .where(
        and(
          eq(classEnrolments.classId, exam.classId),
          eq(classEnrolments.status, "active"),
          isNull(classEnrolments.deletedAt),
          isNull(students.deletedAt),
          eq(students.status, "active"),
        ),
      )
      .orderBy(asc(students.fullName));

    const markRows = await tx
      .select()
      .from(marks)
      .where(eq(marks.examId, exam.id));
    const byStudent = new Map(markRows.map((m) => [m.studentId, m]));

    const maxMarks = num(exam.maxMarks) ?? 0;

    return {
      exam,
      maxMarks,
      roster: enrolled.map(({ student }) => {
        const mark = byStudent.get(student.id) ?? null;
        const score = mark ? num(mark.score) : null;
        return {
          student,
          mark,
          score,
          percentage: score === null ? null : percentage(score, maxMarks),
        };
      }),
    };
  });
}

export type MarkScoreInput = { studentId: string; score: number | null };

export async function saveExamMarks(opts: {
  tenantId: string;
  userId: string;
  examId: string;
  scores: MarkScoreInput[];
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    await assertWritable(opts.tenantId, opts.userId, tx);

    const examRows = await tx
      .select()
      .from(exams)
      .where(
        and(
          eq(exams.id, opts.examId),
          eq(exams.tenantId, opts.tenantId),
          isNull(exams.deletedAt),
        ),
      )
      .limit(1);
    const exam = examRows[0];
    if (!exam) throw new ExamError("Exam not found");
    if (exam.status === "published") {
      throw new ExamError("Published exams cannot be edited. Create a new exam to correct.");
    }

    const maxMarks = num(exam.maxMarks) ?? 0;
    const now = new Date();

    for (const row of opts.scores) {
      if (row.score !== null) {
        if (row.score < 0 || row.score > maxMarks) {
          throw new ExamError(`Score must be between 0 and ${maxMarks}`);
        }
      }

      const existing = await tx
        .select()
        .from(marks)
        .where(and(eq(marks.examId, exam.id), eq(marks.studentId, row.studentId)))
        .limit(1);

      if (existing[0]) {
        await tx
          .update(marks)
          .set({
            score: row.score === null ? null : String(row.score),
            rank: null,
            letter: null,
            updatedAt: now,
          })
          .where(eq(marks.id, existing[0].id));
      } else {
        await tx.insert(marks).values({
          tenantId: opts.tenantId,
          examId: exam.id,
          studentId: row.studentId,
          score: row.score === null ? null : String(row.score),
        });
      }
    }

    await tx.insert(auditLog).values({
      tenantId: opts.tenantId,
      actorUserId: opts.userId,
      action: "exam.marks_saved",
      entityType: "exam",
      entityId: exam.id,
      payload: { count: opts.scores.length },
    });

    return { examId: exam.id };
  });
}

export async function publishExam(opts: {
  tenantId: string;
  userId: string;
  examId: string;
  /** Must be admin — teachers cannot publish */
  isAdmin: boolean;
}) {
  if (!opts.isAdmin) {
    throw new ExamError("Only an institute admin can publish marks.");
  }

  const gradeScale = await getSetting<string>(
    opts.tenantId,
    opts.userId,
    "exams.default_grade_scale",
  );

  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    await assertWritable(opts.tenantId, opts.userId, tx);

    const examRows = await tx
      .select()
      .from(exams)
      .where(
        and(
          eq(exams.id, opts.examId),
          eq(exams.tenantId, opts.tenantId),
          isNull(exams.deletedAt),
        ),
      )
      .limit(1);
    const exam = examRows[0];
    if (!exam) throw new ExamError("Exam not found");
    if (exam.status === "published") throw new ExamError("Exam is already published");

    const enrolled = await tx
      .select({ studentId: classEnrolments.studentId })
      .from(classEnrolments)
      .innerJoin(students, eq(classEnrolments.studentId, students.id))
      .where(
        and(
          eq(classEnrolments.classId, exam.classId),
          eq(classEnrolments.status, "active"),
          isNull(classEnrolments.deletedAt),
          isNull(students.deletedAt),
          eq(students.status, "active"),
        ),
      );

    const markRows = await tx.select().from(marks).where(eq(marks.examId, exam.id));
    const byStudent = new Map(markRows.map((m) => [m.studentId, m]));

    for (const { studentId } of enrolled) {
      const m = byStudent.get(studentId);
      if (!m || num(m.score) === null) {
        throw new ExamError(
          "Every enrolled student needs a numeric score before publish (use 0 for absent).",
        );
      }
    }

    const maxMarks = num(exam.maxMarks) ?? 0;

    const scored = enrolled.map(({ studentId }) => {
      const score = num(byStudent.get(studentId)!.score)!;
      return { studentId, score, markId: byStudent.get(studentId)!.id };
    });
    scored.sort((a, b) => b.score - a.score);
    const ranks = competitionRanks(scored.map((s) => s.score));

    const now = new Date();
    for (let i = 0; i < scored.length; i++) {
      const row = scored[i]!;
      const pct = percentage(row.score, maxMarks);
      // Only the built-in "letter" scale is implemented. An unknown scale
      // stores no letter rather than silently applying the wrong one.
      const letter =
        !gradeScale || gradeScale === "letter" ? letterFromPercent(pct) : null;

      await tx
        .update(marks)
        .set({
          rank: ranks[i]!,
          letter,
          updatedAt: now,
        })
        .where(eq(marks.id, row.markId));
    }

    await tx
      .update(exams)
      .set({
        status: "published",
        publishedAt: now,
        publishedBy: opts.userId,
        updatedAt: now,
      })
      .where(eq(exams.id, exam.id));

    await tx.insert(events).values({
      tenantId: opts.tenantId,
      type: "exams.published",
      payload: {
        examId: exam.id,
        classId: exam.classId,
        publishedBy: opts.userId,
        studentCount: scored.length,
      },
    });

    await tx.insert(auditLog).values({
      tenantId: opts.tenantId,
      actorUserId: opts.userId,
      action: "exam.published",
      entityType: "exam",
      entityId: exam.id,
      payload: { studentCount: scored.length },
    });

    return { examId: exam.id, studentCount: scored.length };
  });
}

/** Student-facing: published marks only for the linked student record. */
export async function listPublishedResultsForStudent(opts: {
  tenantId: string;
  userId: string;
  studentId: string;
}) {
  const showRank = await getSetting<boolean>(
    opts.tenantId,
    opts.userId,
    "exams.class_rank_visible",
  );

  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    const rows = await tx
      .select({
        exam: exams,
        mark: marks,
        className: classes.name,
      })
      .from(marks)
      .innerJoin(exams, eq(marks.examId, exams.id))
      .innerJoin(classes, eq(exams.classId, classes.id))
      .where(
        and(
          eq(marks.studentId, opts.studentId),
          eq(marks.tenantId, opts.tenantId),
          eq(exams.status, "published"),
          isNull(exams.deletedAt),
        ),
      )
      .orderBy(desc(exams.examDate));

    return rows.map((r) => {
      const maxMarks = num(r.exam.maxMarks) ?? 0;
      const score = num(r.mark.score);
      return {
        examId: r.exam.id,
        title: r.exam.title,
        examDate: r.exam.examDate,
        className: r.className,
        maxMarks,
        score,
        percentage: score === null ? null : percentage(score, maxMarks),
        letter: r.mark.letter,
        rank: showRank ? r.mark.rank : null,
        showRank: Boolean(showRank),
      };
    });
  });
}

export async function findStudentIdForAuthUser(opts: {
  tenantId: string;
  userId: string;
  authUserId: string;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    const rows = await tx
      .select()
      .from(students)
      .where(
        and(
          eq(students.tenantId, opts.tenantId),
          eq(students.authUserId, opts.authUserId),
          isNull(students.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  });
}

/** Attendance % for a student in a class (no capability import). */
export async function attendancePercentForStudent(opts: {
  tenantId: string;
  userId: string;
  classId: string;
  studentId: string;
}): Promise<number | null> {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    const sessions = await tx
      .select()
      .from(classSessions)
      .where(
        and(
          eq(classSessions.classId, opts.classId),
          eq(classSessions.tenantId, opts.tenantId),
          isNull(classSessions.deletedAt),
        ),
      );
    if (sessions.length === 0) return null;

    const sessionIds = sessions.map((s) => s.id);
    const markRows = await tx
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.studentId, opts.studentId),
          sql`${attendance.sessionId} IN (${sql.join(
            sessionIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )})`,
        ),
      );
    const bySession = new Map(markRows.map((m) => [m.sessionId, m.status]));

    let attended = 0;
    for (const s of sessions) {
      const status = bySession.get(s.id) ?? "present";
      if (status === "present" || status === "late") attended += 1;
    }
    return Math.round((attended / sessions.length) * 1000) / 10;
  });
}

export async function getReportCardData(opts: {
  tenantId: string;
  userId: string;
  examId: string;
  studentId: string;
}) {
  const showRank = await getSetting<boolean>(
    opts.tenantId,
    opts.userId,
    "exams.class_rank_visible",
  );
  const includeAttendance = await getSetting<boolean>(
    opts.tenantId,
    opts.userId,
    "reports.include_attendance_on_report_card",
  );

  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    const examRows = await tx
      .select()
      .from(exams)
      .where(
        and(
          eq(exams.id, opts.examId),
          eq(exams.tenantId, opts.tenantId),
          eq(exams.status, "published"),
          isNull(exams.deletedAt),
        ),
      )
      .limit(1);
    const exam = examRows[0];
    if (!exam) throw new ExamError("Published exam not found");

    const studentRows = await tx
      .select()
      .from(students)
      .where(and(eq(students.id, opts.studentId), eq(students.tenantId, opts.tenantId)))
      .limit(1);
    const student = studentRows[0];
    if (!student) throw new ExamError("Student not found");

    const classRows = await tx
      .select()
      .from(classes)
      .where(eq(classes.id, exam.classId))
      .limit(1);
    const klass = classRows[0];

    const markRows = await tx
      .select()
      .from(marks)
      .where(and(eq(marks.examId, exam.id), eq(marks.studentId, opts.studentId)))
      .limit(1);
    const mark = markRows[0];
    if (!mark || num(mark.score) === null) throw new ExamError("Mark not found");

    const maxMarks = num(exam.maxMarks) ?? 0;
    const score = num(mark.score)!;
    const pct = percentage(score, maxMarks);

    return {
      exam,
      student,
      className: klass?.name ?? "",
      score,
      maxMarks,
      percentage: pct,
      letter: mark.letter,
      rank: showRank ? mark.rank : null,
      showRank: Boolean(showRank),
      includeAttendance: Boolean(includeAttendance),
      classId: exam.classId,
    };
  });
}
