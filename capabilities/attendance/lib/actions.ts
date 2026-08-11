"use server";

import { z } from "zod";
import { requireRole } from "@/lib/tenant/context";
import { ADMIN_ROLES, TEACHER_ROLES } from "@/lib/rbac";
import {
  buildAttendanceReport,
  getSessionRoster,
  listRecentSessions,
  listTeacherClasses,
  openOrGetTodaySession,
  saveAttendanceMarks,
  type MarkInput,
} from "@/capabilities/attendance/lib/service";

export type AttendanceFormState = { error?: string; ok?: string; sessionId?: string } | null;

export async function loadTeacherAttendanceHome(slug: string) {
  const ctx = await requireRole(slug, TEACHER_ROLES);
  const classList = await listTeacherClasses({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    isAdmin: ctx.membership.role === "admin",
  });
  return { ctx, classes: classList };
}

export async function openTodaySessionAction(
  slug: string,
  classId: string,
): Promise<AttendanceFormState> {
  const ctx = await requireRole(slug, TEACHER_ROLES);
  try {
    const session = await openOrGetTodaySession({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      classId,
    });
    return { ok: "Session ready", sessionId: session.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not open session" };
  }
}

export async function loadSessionPage(slug: string, sessionId: string) {
  const ctx = await requireRole(slug, TEACHER_ROLES);
  const data = await getSessionRoster({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    sessionId,
  });
  return { ctx, ...data };
}

export async function saveMarksAction(
  slug: string,
  sessionId: string,
  payload: {
    marks: MarkInput[];
    editReason?: string;
  },
): Promise<AttendanceFormState> {
  const schema = z.object({
    marks: z.array(
      z.object({
        studentId: z.string().uuid(),
        status: z.enum(["present", "absent", "late"]),
        arrivedAt: z.string().nullable().optional(),
        note: z.string().nullable().optional(),
      }),
    ),
    editReason: z.string().optional(),
  });
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { error: "Invalid marks payload." };

  const ctx = await requireRole(slug, TEACHER_ROLES);
  try {
    await saveAttendanceMarks({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      sessionId,
      marks: parsed.data.marks,
      isAdmin: ctx.membership.role === "admin",
      editReason: parsed.data.editReason,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Save failed" };
  }
  return { ok: "Attendance saved." };
}

export async function loadAttendanceReportPage(
  slug: string,
  classId: string,
  from: string,
  to: string,
) {
  const ctx = await requireRole(slug, TEACHER_ROLES);
  const report = await buildAttendanceReport({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    classId,
    from: new Date(from),
    to: new Date(to),
  });
  const sessions = await listRecentSessions({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    classId,
  });
  return { ctx, report, sessions };
}

export async function loadAdminAttendanceClasses(slug: string) {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  const classList = await listTeacherClasses({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    isAdmin: true,
  });
  return { ctx, classes: classList };
}
