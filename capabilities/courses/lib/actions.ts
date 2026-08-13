"use server";

import { z } from "zod";
import { requireRole } from "@/lib/tenant/context";
import { TEACHER_ROLES, STUDENT_ROLES } from "@/lib/rbac";
import {
  addModule,
  addResource,
  createCourse,
  findStudentByAuthUser,
  getCourseEditor,
  getStudentCourseView,
  listCoursesForEditor,
  listEditorClasses,
  listPublishedCoursesForStudent,
  publishCourse,
  updateModuleDrip,
  CourseError,
} from "@/capabilities/courses/lib/service";

export type CourseFormState = { error?: string; ok?: string; id?: string } | null;

export async function loadCoursesEditorHome(slug: string) {
  const ctx = await requireRole(slug, TEACHER_ROLES);
  const isAdmin = ctx.membership.role === "admin";
  const [courseList, classList] = await Promise.all([
    listCoursesForEditor({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      isAdmin,
    }),
    listEditorClasses({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      isAdmin,
    }),
  ]);
  return { ctx, courses: courseList, classes: classList, isAdmin };
}

export async function loadCourseEditorPage(slug: string, courseId: string) {
  const ctx = await requireRole(slug, TEACHER_ROLES);
  const isAdmin = ctx.membership.role === "admin";
  const data = await getCourseEditor({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    courseId,
    isAdmin,
  });
  return { ctx, isAdmin, ...data };
}

export async function createCourseAction(
  slug: string,
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const schema = z.object({
    classId: z.string().uuid(),
    title: z.string().trim().min(2),
    description: z.string().optional(),
  });
  const parsed = schema.safeParse({
    classId: formData.get("classId"),
    title: formData.get("title"),
    description: formData.get("description") || "",
  });
  if (!parsed.success) return { error: "Check course details." };

  const ctx = await requireRole(slug, TEACHER_ROLES);
  try {
    const course = await createCourse({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      classId: parsed.data.classId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      isAdmin: ctx.membership.role === "admin",
    });
    return { ok: "Course created.", id: course.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
}

export async function publishCourseAction(
  slug: string,
  courseId: string,
  status: "draft" | "published",
): Promise<CourseFormState> {
  const parsed = z
    .object({
      courseId: z.string().uuid(),
      status: z.enum(["draft", "published"]),
    })
    .safeParse({ courseId, status });
  if (!parsed.success) return { error: "Invalid course or status." };

  const ctx = await requireRole(slug, TEACHER_ROLES);
  try {
    await publishCourse({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      courseId: parsed.data.courseId,
      isAdmin: ctx.membership.role === "admin",
      status: parsed.data.status,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
  return { ok: status === "published" ? "Published." : "Moved to draft." };
}

export async function addModuleAction(
  slug: string,
  courseId: string,
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const schema = z.object({
    title: z.string().trim().min(2),
    availableAt: z.string().optional(),
  });
  const parsed = schema.safeParse({
    title: formData.get("title"),
    availableAt: formData.get("availableAt") || "",
  });
  if (!parsed.success) return { error: "Enter a module title." };

  const ctx = await requireRole(slug, TEACHER_ROLES);
  try {
    await addModule({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      courseId,
      title: parsed.data.title,
      isAdmin: ctx.membership.role === "admin",
      availableAt: parsed.data.availableAt
        ? new Date(parsed.data.availableAt)
        : null,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
  return { ok: "Module added." };
}

export async function updateModuleDripAction(
  slug: string,
  moduleId: string,
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const schema = z.object({
    dripEnabled: z.string().optional(),
    availableAt: z.string().optional(),
  });
  const parsed = schema.safeParse({
    dripEnabled: formData.get("dripEnabled") || "",
    availableAt: formData.get("availableAt") || "",
  });
  if (!parsed.success) return { error: "Invalid drip settings." };

  const ctx = await requireRole(slug, TEACHER_ROLES);
  try {
    await updateModuleDrip({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      moduleId,
      dripEnabled: parsed.data.dripEnabled === "on",
      availableAt: parsed.data.availableAt
        ? new Date(parsed.data.availableAt)
        : null,
      isAdmin: ctx.membership.role === "admin",
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
  return { ok: "Drip updated." };
}

export async function addTextOrLinkResourceAction(
  slug: string,
  moduleId: string,
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const schema = z.object({
    title: z.string().trim().min(2),
    type: z.enum(["text", "link"]),
    body: z.string().optional(),
    externalUrl: z.string().url().optional().or(z.literal("")),
  });
  const parsed = schema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    body: formData.get("body") || "",
    externalUrl: formData.get("externalUrl") || "",
  });
  if (!parsed.success) return { error: "Check resource details." };

  const ctx = await requireRole(slug, TEACHER_ROLES);
  try {
    await addResource({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      moduleId,
      title: parsed.data.title,
      type: parsed.data.type,
      body: parsed.data.type === "text" ? parsed.data.body || null : null,
      externalUrl:
        parsed.data.type === "link" ? parsed.data.externalUrl || null : null,
      isAdmin: ctx.membership.role === "admin",
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed" };
  }
  return { ok: "Resource added." };
}

export async function loadStudentCoursesPage(slug: string) {
  const ctx = await requireRole(slug, STUDENT_ROLES);
  const student = await findStudentByAuthUser({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    authUserId: ctx.user.id,
  });
  if (!student) {
    return { ctx, courses: [], error: "No student profile linked." };
  }
  const courseList = await listPublishedCoursesForStudent({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    studentId: student.id,
  });
  return { ctx, courses: courseList, studentId: student.id };
}

export async function loadStudentCoursePage(slug: string, courseId: string) {
  const ctx = await requireRole(slug, STUDENT_ROLES);
  const student = await findStudentByAuthUser({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    authUserId: ctx.user.id,
  });
  if (!student) throw new CourseError("No student profile linked.");
  const data = await getStudentCourseView({
    tenantId: ctx.tenantId,
    userId: ctx.user.id,
    courseId,
    studentId: student.id,
  });
  return { ctx, studentId: student.id, ...data };
}
