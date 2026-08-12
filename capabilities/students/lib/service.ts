import { and, desc, eq, isNull } from "drizzle-orm";
import {
  auditLog,
  classEnrolments,
  classes,
  guardians,
  memberships,
  registrationLinks,
  studentApplications,
  students,
  type StudentApplication,
} from "@/lib/db/schema";
import { withTenant, type Tx } from "@/lib/db/tenant";
import {
  assertQuota,
  assertWritable,
  recordUsage,
  QuotaError,
} from "@/lib/billing/quota";

export async function createStudentInTx(
  tx: Tx,
  opts: {
    tenantId: string;
    actorUserId: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    dateOfBirth?: Date | null;
    authUserId?: string | null;
    classId?: string | null;
    guardian?: {
      name: string;
      email?: string | null;
      phone?: string | null;
      relationship?: string;
    } | null;
  },
) {
  await assertWritable(opts.tenantId, opts.actorUserId, tx);
  await assertQuota(opts.tenantId, opts.actorUserId, "students", 1, tx);

  const [student] = await tx
    .insert(students)
    .values({
      tenantId: opts.tenantId,
      fullName: opts.fullName,
      email: opts.email?.toLowerCase() ?? null,
      phone: opts.phone ?? null,
      dateOfBirth: opts.dateOfBirth ?? null,
      authUserId: opts.authUserId ?? null,
      status: "active",
    })
    .returning();

  if (!student) throw new Error("Failed to create student");

  if (opts.guardian?.name) {
    await tx.insert(guardians).values({
      tenantId: opts.tenantId,
      studentId: student.id,
      name: opts.guardian.name,
      email: opts.guardian.email ?? null,
      phone: opts.guardian.phone ?? null,
      relationship: opts.guardian.relationship ?? "guardian",
      isPrimary: true,
      receivesEmail: true,
    });
  }

  if (opts.classId) {
    await tx.insert(classEnrolments).values({
      tenantId: opts.tenantId,
      classId: opts.classId,
      studentId: student.id,
      status: "active",
    });
  }

  if (opts.authUserId) {
    const existing = await tx
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.tenantId, opts.tenantId),
          eq(memberships.authUserId, opts.authUserId),
        ),
      )
      .limit(1);
    if (existing[0]) {
      await tx
        .update(memberships)
        .set({
          role: "student",
          status: "active",
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(memberships.id, existing[0].id));
    } else {
      await tx.insert(memberships).values({
        tenantId: opts.tenantId,
        authUserId: opts.authUserId,
        role: "student",
        isOwner: false,
        status: "active",
      });
    }
  }

  await recordUsage(tx, {
    tenantId: opts.tenantId,
    metric: "students",
    delta: 1,
    reason: "student.created",
  });

  await tx.insert(auditLog).values({
    tenantId: opts.tenantId,
    actorUserId: opts.actorUserId,
    action: "student.created",
    entityType: "student",
    entityId: student.id,
    payload: { email: student.email, fullName: student.fullName },
  });

  return student;
}

export async function approveApplication(opts: {
  tenantId: string;
  actorUserId: string;
  applicationId: string;
}) {
  return withTenant(
    { tenantId: opts.tenantId, userId: opts.actorUserId },
    async (tx) => {
      const rows = await tx
        .select()
        .from(studentApplications)
        .where(
          and(
            eq(studentApplications.id, opts.applicationId),
            eq(studentApplications.tenantId, opts.tenantId),
            isNull(studentApplications.deletedAt),
          ),
        )
        .limit(1);
      const app = rows[0];
      if (!app) throw new Error("Application not found");
      if (app.status !== "pending") throw new Error("Application is not pending");

      try {
        await createStudentInTx(tx, {
          tenantId: opts.tenantId,
          actorUserId: opts.actorUserId,
          fullName: app.fullName,
          email: app.email,
          phone: app.phone,
          dateOfBirth: app.dateOfBirth,
          authUserId: app.authUserId,
          classId: app.requestedClassId,
          guardian: app.guardianName
            ? {
                name: app.guardianName,
                email: app.guardianEmail,
                phone: app.guardianPhone,
                relationship: app.guardianRelationship ?? "guardian",
              }
            : null,
        });
      } catch (err) {
        if (err instanceof QuotaError) throw err;
        throw err;
      }

      await tx
        .update(studentApplications)
        .set({
          status: "approved",
          reviewedByAuthUserId: opts.actorUserId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(studentApplications.id, app.id));

      await tx.insert(auditLog).values({
        tenantId: opts.tenantId,
        actorUserId: opts.actorUserId,
        action: "application.approved",
        entityType: "student_application",
        entityId: app.id,
        payload: { email: app.email },
      });

      return app;
    },
  );
}

export async function rejectApplication(opts: {
  tenantId: string;
  actorUserId: string;
  applicationId: string;
  reason?: string;
}) {
  return withTenant(
    { tenantId: opts.tenantId, userId: opts.actorUserId },
    async (tx) => {
      await tx
        .update(studentApplications)
        .set({
          status: "rejected",
          rejectionReason: opts.reason ?? null,
          reviewedByAuthUserId: opts.actorUserId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(studentApplications.id, opts.applicationId),
            eq(studentApplications.tenantId, opts.tenantId),
            eq(studentApplications.status, "pending"),
          ),
        );
      await tx.insert(auditLog).values({
        tenantId: opts.tenantId,
        actorUserId: opts.actorUserId,
        action: "application.rejected",
        entityType: "student_application",
        entityId: opts.applicationId,
        payload: { reason: opts.reason ?? null },
      });
    },
  );
}

export async function countPendingApplications(
  tenantId: string,
  userId: string,
): Promise<number> {
  return withTenant({ tenantId, userId }, async (tx) => {
    const rows = await tx
      .select({ id: studentApplications.id })
      .from(studentApplications)
      .where(
        and(
          eq(studentApplications.tenantId, tenantId),
          eq(studentApplications.status, "pending"),
          isNull(studentApplications.deletedAt),
        ),
      );
    return rows.length;
  });
}

export async function listPendingApplications(
  tenantId: string,
  userId: string,
): Promise<StudentApplication[]> {
  return withTenant({ tenantId, userId }, async (tx) => {
    return tx
      .select()
      .from(studentApplications)
      .where(
        and(
          eq(studentApplications.tenantId, tenantId),
          eq(studentApplications.status, "pending"),
          isNull(studentApplications.deletedAt),
        ),
      )
      .orderBy(desc(studentApplications.createdAt));
  });
}

export async function listStudents(tenantId: string, userId: string) {
  return withTenant({ tenantId, userId }, async (tx) => {
    return tx
      .select()
      .from(students)
      .where(and(eq(students.tenantId, tenantId), isNull(students.deletedAt)))
      .orderBy(desc(students.createdAt));
  });
}

export async function listClasses(tenantId: string, userId: string) {
  return withTenant({ tenantId, userId }, async (tx) => {
    return tx
      .select()
      .from(classes)
      .where(and(eq(classes.tenantId, tenantId), isNull(classes.deletedAt)))
      .orderBy(desc(classes.createdAt));
  });
}

export async function listRegistrationLinks(tenantId: string, userId: string) {
  return withTenant({ tenantId, userId }, async (tx) => {
    return tx
      .select()
      .from(registrationLinks)
      .where(
        and(
          eq(registrationLinks.tenantId, tenantId),
          isNull(registrationLinks.deletedAt),
        ),
      )
      .orderBy(desc(registrationLinks.createdAt));
  });
}

export { registrationLinks, students, classes, studentApplications };
