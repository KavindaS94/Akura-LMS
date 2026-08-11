"use server";

import { z } from "zod";
import { requireRole } from "@/lib/tenant/context";
import { ADMIN_ROLES, TEACHER_ROLES, STUDENT_ROLES } from "@/lib/rbac";
import {
  createExam,
  findStudentIdForAuthUser,
  getExamGrid,
  listExamsForClass,
  listExamsForTeacher,
  listPublishedResultsForStudent,
  publishExam,
  saveExamMarks,
  ExamError,
} from "@/capabilities/exams/lib/service";

export type ExamFormState = { error?: string; ok?: string; examId?: string } | null;

export async function loadAdminExamsPage(slug: string) {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  const { classes: classList, exams: examList } = await listExamsForTeacher({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    isAdmin: true,
  });
  return { ctx, classes: classList, exams: examList };
}

export async function loadTeacherMarksHome(slug: string) {
  const ctx = await requireRole(slug, TEACHER_ROLES);
  return listExamsForTeacher({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    isAdmin: ctx.membership.role === "admin",
  }).then((data) => ({ ctx, ...data }));
}

export async function loadExamGridPage(slug: string, examId: string) {
  const ctx = await requireRole(slug, TEACHER_ROLES);
  const grid = await getExamGrid({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    examId,
  });
  return { ctx, ...grid };
}

export async function createExamAction(
  slug: string,
  _prev: ExamFormState,
  formData: FormData,
): Promise<ExamFormState> {
  const schema = z.object({
    classId: z.string().uuid(),
    title: z.string().trim().min(2),
    examDate: z.string().min(1),
    maxMarks: z.coerce.number().positive(),
  });
  const parsed = schema.safeParse({
    classId: formData.get("classId"),
    title: formData.get("title"),
    examDate: formData.get("examDate"),
    maxMarks: formData.get("maxMarks"),
  });
  if (!parsed.success) return { error: "Check exam details." };

  const ctx = await requireRole(slug, ADMIN_ROLES);
  try {
    const exam = await createExam({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      classId: parsed.data.classId,
      title: parsed.data.title,
      examDate: new Date(parsed.data.examDate),
      maxMarks: parsed.data.maxMarks,
    });
    return { ok: "Exam created.", examId: exam.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Create failed" };
  }
}

export async function saveMarksAction(
  slug: string,
  examId: string,
  payload: { scores: { studentId: string; score: number | null }[] },
): Promise<ExamFormState> {
  const schema = z.object({
    scores: z.array(
      z.object({
        studentId: z.string().uuid(),
        score: z.number().nullable(),
      }),
    ),
  });
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { error: "Invalid scores." };

  const ctx = await requireRole(slug, TEACHER_ROLES);
  try {
    await saveExamMarks({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      examId,
      scores: parsed.data.scores,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Save failed" };
  }
  return { ok: "Marks saved." };
}

export async function publishExamAction(
  slug: string,
  examId: string,
): Promise<ExamFormState> {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  try {
    await publishExam({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      examId,
      isAdmin: true,
    });
  } catch (err) {
    if (err instanceof ExamError) return { error: err.message };
    return { error: err instanceof Error ? err.message : "Publish failed" };
  }
  return { ok: "Exam published." };
}

export async function loadStudentResultsPage(slug: string) {
  const ctx = await requireRole(slug, STUDENT_ROLES);
  const student = await findStudentIdForAuthUser({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    authUserId: ctx.user.id,
  });
  if (!student) {
    return { ctx, results: [], error: "No student profile linked to this account." };
  }
  const results = await listPublishedResultsForStudent({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    studentId: student.id,
  });
  return { ctx, results, studentId: student.id };
}

export async function loadExamsForClassAction(slug: string, classId: string) {
  const ctx = await requireRole(slug, TEACHER_ROLES);
  const examList = await listExamsForClass({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    classId,
  });
  return examList;
}
