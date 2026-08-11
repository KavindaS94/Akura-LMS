import { and, asc, eq, isNull } from "drizzle-orm";
import {
  attendance,
  auditLog,
  classSessions,
  classes,
  exams,
  guardians,
  marks,
  students,
} from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { toCsv } from "@/lib/export/csv";

export type ExportDataset = "students" | "guardians" | "attendance" | "marks";

export const EXPORT_DATASETS: ExportDataset[] = [
  "students",
  "guardians",
  "attendance",
  "marks",
];

export async function buildTenantCsvExport(opts: {
  tenantId: string;
  userId: string;
  dataset: ExportDataset;
}): Promise<{ filename: string; csv: string }> {
  return withTenant(
    { tenantId: opts.tenantId, userId: opts.userId },
    async (tx) => {
      await tx.insert(auditLog).values({
        tenantId: opts.tenantId,
        actorUserId: opts.userId,
        action: "export.csv",
        entityType: "export",
        entityId: opts.dataset,
        payload: { dataset: opts.dataset },
      });

      if (opts.dataset === "students") {
        const rows = await tx
          .select({
            id: students.id,
            fullName: students.fullName,
            email: students.email,
            phone: students.phone,
            status: students.status,
            dateOfBirth: students.dateOfBirth,
          })
          .from(students)
          .where(
            and(
              eq(students.tenantId, opts.tenantId),
              isNull(students.deletedAt),
            ),
          )
          .orderBy(asc(students.fullName));
        return {
          filename: "students.csv",
          csv: toCsv(
            ["id", "full_name", "email", "phone", "status", "date_of_birth"],
            rows.map((r) => [
              r.id,
              r.fullName,
              r.email,
              r.phone,
              r.status,
              r.dateOfBirth ? String(r.dateOfBirth).slice(0, 10) : "",
            ]),
          ),
        };
      }

      if (opts.dataset === "guardians") {
        const rows = await tx
          .select({
            id: guardians.id,
            studentId: guardians.studentId,
            studentName: students.fullName,
            name: guardians.name,
            email: guardians.email,
            phone: guardians.phone,
            relationship: guardians.relationship,
            receivesEmail: guardians.receivesEmail,
            emailStatus: guardians.emailStatus,
          })
          .from(guardians)
          .innerJoin(students, eq(guardians.studentId, students.id))
          .where(
            and(
              eq(guardians.tenantId, opts.tenantId),
              isNull(guardians.deletedAt),
            ),
          )
          .orderBy(asc(students.fullName));
        return {
          filename: "guardians.csv",
          csv: toCsv(
            [
              "id",
              "student_id",
              "student_name",
              "name",
              "email",
              "phone",
              "relationship",
              "receives_email",
              "email_status",
            ],
            rows.map((r) => [
              r.id,
              r.studentId,
              r.studentName,
              r.name,
              r.email,
              r.phone,
              r.relationship,
              r.receivesEmail,
              r.emailStatus,
            ]),
          ),
        };
      }

      if (opts.dataset === "attendance") {
        const rows = await tx
          .select({
            sessionId: attendance.sessionId,
            sessionDate: classSessions.sessionDate,
            className: classes.name,
            studentId: attendance.studentId,
            studentName: students.fullName,
            status: attendance.status,
          })
          .from(attendance)
          .innerJoin(
            classSessions,
            eq(attendance.sessionId, classSessions.id),
          )
          .innerJoin(classes, eq(classSessions.classId, classes.id))
          .innerJoin(students, eq(attendance.studentId, students.id))
          .where(eq(attendance.tenantId, opts.tenantId))
          .orderBy(asc(classSessions.sessionDate));
        return {
          filename: "attendance.csv",
          csv: toCsv(
            [
              "session_id",
              "session_date",
              "class_name",
              "student_id",
              "student_name",
              "status",
            ],
            rows.map((r) => [
              r.sessionId,
              r.sessionDate ? String(r.sessionDate).slice(0, 10) : "",
              r.className,
              r.studentId,
              r.studentName,
              r.status,
            ]),
          ),
        };
      }

      // marks
      const rows = await tx
        .select({
          examId: marks.examId,
          examTitle: exams.title,
          studentId: marks.studentId,
          studentName: students.fullName,
          score: marks.score,
          rank: marks.rank,
          letter: marks.letter,
          examStatus: exams.status,
        })
        .from(marks)
        .innerJoin(exams, eq(marks.examId, exams.id))
        .innerJoin(students, eq(marks.studentId, students.id))
        .where(eq(marks.tenantId, opts.tenantId))
        .orderBy(asc(exams.title));
      return {
        filename: "marks.csv",
        csv: toCsv(
          [
            "exam_id",
            "exam_title",
            "exam_status",
            "student_id",
            "student_name",
            "score",
            "rank",
            "letter",
          ],
          rows.map((r) => [
            r.examId,
            r.examTitle,
            r.examStatus,
            r.studentId,
            r.studentName,
            r.score,
            r.rank,
            r.letter,
          ]),
        ),
      };
    },
  );
}
