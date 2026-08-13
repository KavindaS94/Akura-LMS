"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import {
  auditLog,
  classes,
  registrationLinks,
  students,
} from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { rowsOf } from "@/lib/db/result";
import { requireRole } from "@/lib/tenant/context";
import { ADMIN_ROLES } from "@/lib/rbac";
import { getSessionUser } from "@/lib/auth/session";
import {
  approveApplication,
  createStudentInTx,
  listClasses,
  listPendingApplications,
  listRegistrationLinks,
  listStudents,
  rejectApplication,
} from "@/capabilities/students/lib/service";
import {
  assertQuota,
  getCurrentSubscription,
  getUsageSnapshot,
  QuotaError,
} from "@/lib/billing/quota";

export type PeopleFormState = {
  error?: string;
  ok?: string;
  csvErrors?: string[];
  inviteUrl?: string;
  joinUrl?: string;
} | null;

export async function loadStudentsPage(slug: string) {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  const [rows, classRows] = await Promise.all([
    listStudents(ctx.tenantId, ctx.user.id),
    listClasses(ctx.tenantId, ctx.user.id),
  ]);
  return { ctx, students: rows, classes: classRows };
}

export async function createStudentAction(
  slug: string,
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  const schema = z.object({
    fullName: z.string().trim().min(2),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    classId: z.string().uuid().optional().or(z.literal("")),
    guardianName: z.string().optional(),
    guardianEmail: z.string().email().optional().or(z.literal("")),
    guardianPhone: z.string().optional(),
  });
  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || "",
    classId: formData.get("classId") || "",
    guardianName: formData.get("guardianName") || "",
    guardianEmail: formData.get("guardianEmail") || "",
    guardianPhone: formData.get("guardianPhone") || "",
  });
  if (!parsed.success) return { error: "Check student details." };

  const ctx = await requireRole(slug, ADMIN_ROLES);
  try {
    await withTenant(
      { tenantId: ctx.tenantId, userId: ctx.user.id },
      async (tx) => {
        await createStudentInTx(tx, {
          tenantId: ctx.tenantId,
          actorUserId: ctx.user.id,
          fullName: parsed.data.fullName,
          email: parsed.data.email || null,
          phone: parsed.data.phone || null,
          classId: parsed.data.classId || null,
          guardian: parsed.data.guardianName
            ? {
                name: parsed.data.guardianName,
                email: parsed.data.guardianEmail || null,
                phone: parsed.data.guardianPhone || null,
              }
            : null,
        });
      },
    );
  } catch (err) {
    if (err instanceof QuotaError) {
      return {
        error: `You're at ${err.used} of ${err.limit} students — upgrade to add more.`,
      };
    }
    return { error: err instanceof Error ? err.message : "Could not create student." };
  }
  return { ok: "Student added." };
}

export async function importStudentsCsvAction(
  slug: string,
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  const file = formData.get("csv");
  if (!(file instanceof File)) return { error: "Upload a CSV file." };
  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { error: "CSV needs a header and at least one row." };

  const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("full_name");
  const emailIdx = header.indexOf("email");
  const phoneIdx = header.indexOf("phone");
  if (nameIdx < 0) return { error: "CSV must include full_name column." };

  const errors: string[] = [];
  let created = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",").map((c) => c.trim());
    const fullName = cols[nameIdx] ?? "";
    const email = emailIdx >= 0 ? cols[emailIdx] : "";
    const phone = phoneIdx >= 0 ? cols[phoneIdx] : "";
    if (!fullName) {
      errors.push(`Row ${i + 1}: full_name required`);
      continue;
    }
    try {
      await withTenant(
        { tenantId: ctx.tenantId, userId: ctx.user.id },
        async (tx) => {
          await createStudentInTx(tx, {
            tenantId: ctx.tenantId,
            actorUserId: ctx.user.id,
            fullName,
            email: email || null,
            phone: phone || null,
          });
        },
      );
      created += 1;
    } catch (err) {
      if (err instanceof QuotaError) {
        errors.push(
          `Row ${i + 1}: at capacity (${err.used}/${err.limit}). Remaining rows skipped.`,
        );
        break;
      }
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  return {
    ok: `Imported ${created} student(s).`,
    csvErrors: errors.length ? errors : undefined,
  };
}

export async function createClassAction(
  slug: string,
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  const schema = z.object({
    name: z.string().trim().min(2),
    academicYear: z.string().optional(),
    teacherAuthUserId: z.string().trim().optional().or(z.literal("")),
  });
  const parsed = schema.safeParse({
    name: formData.get("name"),
    academicYear: formData.get("academicYear") || "",
    teacherAuthUserId: formData.get("teacherAuthUserId") || "",
  });
  if (!parsed.success) return { error: "Enter a class name." };
  const ctx = await requireRole(slug, ADMIN_ROLES);
  await withTenant({ tenantId: ctx.tenantId, userId: ctx.user.id }, async (tx) => {
    const [created] = await tx
      .insert(classes)
      .values({
        tenantId: ctx.tenantId,
        name: parsed.data.name,
        academicYear: parsed.data.academicYear || null,
        teacherAuthUserId: parsed.data.teacherAuthUserId || null,
      })
      .returning();
    await tx.insert(auditLog).values({
      tenantId: ctx.tenantId,
      actorUserId: ctx.user.id,
      action: "class.created",
      entityType: "class",
      entityId: created!.id,
      payload: { name: parsed.data.name },
    });
  });
  return { ok: "Class created." };
}

export async function assignClassTeacherAction(
  slug: string,
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  const schema = z.object({
    classId: z.string().uuid(),
    teacherAuthUserId: z.string().trim().min(1),
  });
  const parsed = schema.safeParse({
    classId: formData.get("classId"),
    teacherAuthUserId: formData.get("teacherAuthUserId"),
  });
  if (!parsed.success) return { error: "Class and teacher id required." };
  const ctx = await requireRole(slug, ADMIN_ROLES);
  await withTenant({ tenantId: ctx.tenantId, userId: ctx.user.id }, async (tx) => {
    await tx
      .update(classes)
      .set({
        teacherAuthUserId: parsed.data.teacherAuthUserId,
        updatedAt: new Date(),
      })
      .where(
        and(eq(classes.id, parsed.data.classId), eq(classes.tenantId, ctx.tenantId)),
      );
    await tx.insert(auditLog).values({
      tenantId: ctx.tenantId,
      actorUserId: ctx.user.id,
      action: "class.teacher_assigned",
      entityType: "class",
      entityId: parsed.data.classId,
      payload: { teacherAuthUserId: parsed.data.teacherAuthUserId },
    });
  });
  return { ok: "Teacher assigned." };
}

export async function createRegistrationLinkAction(
  slug: string,
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  const schema = z.object({
    label: z.string().trim().min(2),
    joinSlug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional()
      .or(z.literal("")),
    classId: z.string().uuid().optional().or(z.literal("")),
    collectGuardian: z.string().optional(),
  });
  const parsed = schema.safeParse({
    label: formData.get("label"),
    joinSlug: formData.get("joinSlug") || "",
    classId: formData.get("classId") || "",
    collectGuardian: formData.get("collectGuardian") || "",
  });
  if (!parsed.success) return { error: "Check link details." };

  const ctx = await requireRole(slug, ADMIN_ROLES);
  const token = randomBytes(24).toString("hex");
  await withTenant({ tenantId: ctx.tenantId, userId: ctx.user.id }, async (tx) => {
    await tx.insert(registrationLinks).values({
      tenantId: ctx.tenantId,
      token,
      slug: parsed.data.joinSlug || null,
      label: parsed.data.label,
      classId: parsed.data.classId || null,
      requiresApproval: true,
      collectGuardian: parsed.data.collectGuardian === "on",
      isActive: true,
    });
    await tx.insert(auditLog).values({
      tenantId: ctx.tenantId,
      actorUserId: ctx.user.id,
      action: "registration_link.created",
      entityType: "registration_link",
      entityId: token,
      payload: { label: parsed.data.label },
    });
  });

  return {
    ok: "Registration link created.",
    inviteUrl: `/r/${token}`,
    joinUrl: parsed.data.joinSlug ? `/join/${parsed.data.joinSlug}` : undefined,
  };
}

export async function loadApplicationsPage(slug: string) {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  const [pending, subscription, usage] = await Promise.all([
    listPendingApplications(ctx.tenantId, ctx.user.id),
    getCurrentSubscription(ctx.tenantId, ctx.user.id),
    getUsageSnapshot(ctx.tenantId, ctx.user.id),
  ]);
  return { ctx, pending, subscription, usage };
}

export async function approveApplicationAction(
  slug: string,
  applicationId: string,
): Promise<PeopleFormState> {
  const parsed = z.string().uuid().safeParse(applicationId);
  if (!parsed.success) return { error: "Invalid application id." };

  const ctx = await requireRole(slug, ADMIN_ROLES);
  try {
    await approveApplication({
      tenantId: ctx.tenantId,
      actorUserId: ctx.user.id,
      applicationId: parsed.data,
    });
  } catch (err) {
    if (err instanceof QuotaError) {
      const pending = await listPendingApplications(ctx.tenantId, ctx.user.id);
      return {
        error: `You're at ${err.used} of ${err.limit} — upgrade to approve these ${pending.length}.`,
      };
    }
    return { error: err instanceof Error ? err.message : "Approve failed." };
  }
  return { ok: "Application approved. Seat consumed." };
}

export async function rejectApplicationAction(
  slug: string,
  applicationId: string,
): Promise<PeopleFormState> {
  const parsed = z.string().uuid().safeParse(applicationId);
  if (!parsed.success) return { error: "Invalid application id." };

  const ctx = await requireRole(slug, ADMIN_ROLES);
  await rejectApplication({
    tenantId: ctx.tenantId,
    actorUserId: ctx.user.id,
    applicationId: parsed.data,
    reason: "Not admitted",
  });
  return { ok: "Application rejected." };
}

export async function loadRegistrationLinksPage(slug: string) {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  const [links, classRows] = await Promise.all([
    listRegistrationLinks(ctx.tenantId, ctx.user.id),
    listClasses(ctx.tenantId, ctx.user.id),
  ]);
  return { ctx, links, classes: classRows };
}

export async function submitPublicApplicationAction(
  _prev: PeopleFormState,
  formData: FormData,
): Promise<PeopleFormState> {
  const schema = z.object({
    token: z.string().min(10),
    fullName: z.string().trim().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    dateOfBirth: z.string().optional(),
    password: z.string().min(8),
    guardianName: z.string().optional(),
    guardianEmail: z.string().email().optional().or(z.literal("")),
    guardianPhone: z.string().optional(),
    src: z.string().optional(),
  });
  const parsed = schema.safeParse({
    token: formData.get("token"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || "",
    dateOfBirth: formData.get("dateOfBirth") || "",
    password: formData.get("password"),
    guardianName: formData.get("guardianName") || "",
    guardianEmail: formData.get("guardianEmail") || "",
    guardianPhone: formData.get("guardianPhone") || "",
    src: formData.get("src") || "",
  });
  if (!parsed.success) return { error: "Check the form and try again." };

  const linkRow = z.object({
    id: z.string().uuid(),
    collect_guardian: z.boolean(),
  });
  const linkRes = await db.execute(
    sql`SELECT id, collect_guardian FROM app_resolve_registration_link(${parsed.data.token})`,
  );
  const link = linkRow.safeParse(rowsOf(linkRes)[0]);
  if (!link.success) return { error: "Registration link not found." };

  if (link.data.collect_guardian && !parsed.data.guardianName) {
    return { error: "Guardian name is required." };
  }

  let user = await getSessionUser();
  if (!user) {
    const signUp = await auth.signUp.email({
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.fullName,
    });
    if (signUp.error) {
      const signIn = await auth.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (signIn.error) {
        return { error: "Could not create or sign in to that email." };
      }
    } else {
      await auth.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });
    }
    user = await getSessionUser();
  }
  if (!user) return { error: "Authentication failed." };

  if (user.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
    return { error: "Use the email address you signed up with." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  try {
    await db.execute(
      sql`SELECT app_submit_student_application(
        ${link.data.id}::uuid,
        ${user.id},
        ${parsed.data.fullName},
        ${parsed.data.email},
        ${parsed.data.phone || null},
        ${parsed.data.dateOfBirth || null}::date,
        NULL::uuid,
        ${parsed.data.guardianName || null},
        ${parsed.data.guardianEmail || null},
        ${parsed.data.guardianPhone || null},
        ${"guardian"},
        ${parsed.data.src || null},
        ${ip}
      )`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("link_")) return { error: "This registration link is not available." };
    return { error: "Could not submit application." };
  }

  // Pending applications consume no seat — explicit check unused here
  void assertQuota;
  void students;

  redirect("/pending-approval");
}

export async function loadClassesPage(slug: string) {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  const classRows = await listClasses(ctx.tenantId, ctx.user.id);
  return { ctx, classes: classRows };
}
