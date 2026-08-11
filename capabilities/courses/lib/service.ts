import { and, asc, eq, isNull, sql } from "drizzle-orm";
import {
  auditLog,
  classEnrolments,
  classes,
  courses,
  modules,
  resourceViews,
  resources,
  students,
  type ModuleRow,
  type ResourceRow,
  type ResourceType,
} from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { assertQuota, assertWritable, recordUsage } from "@/lib/billing/quota";
import { getSetting } from "@/lib/settings";

export class CourseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourseError";
  }
}

export function isModuleUnlocked(
  mod: Pick<ModuleRow, "dripEnabled" | "availableAt">,
  now = new Date(),
): boolean {
  if (!mod.dripEnabled) return true;
  if (!mod.availableAt) return true;
  return now.getTime() >= mod.availableAt.getTime();
}

async function assertCanEditClass(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  opts: {
    tenantId: string;
    userId: string;
    classId: string;
    isAdmin: boolean;
  },
) {
  const rows = await tx
    .select()
    .from(classes)
    .where(
      and(
        eq(classes.id, opts.classId),
        eq(classes.tenantId, opts.tenantId),
        isNull(classes.deletedAt),
      ),
    )
    .limit(1);
  const klass = rows[0];
  if (!klass) throw new CourseError("Class not found");
  if (!opts.isAdmin && klass.teacherAuthUserId !== opts.userId) {
    throw new CourseError("You are not the teacher for this class.");
  }
  return klass;
}

export async function createCourse(opts: {
  tenantId: string;
  userId: string;
  classId: string;
  title: string;
  description?: string | null;
  isAdmin: boolean;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    await assertWritable(opts.tenantId, opts.userId, tx);
    await assertCanEditClass(tx, opts);

    const [row] = await tx
      .insert(courses)
      .values({
        tenantId: opts.tenantId,
        classId: opts.classId,
        title: opts.title,
        description: opts.description ?? null,
        status: "draft",
      })
      .returning();
    if (!row) throw new CourseError("Could not create course");

    await tx.insert(auditLog).values({
      tenantId: opts.tenantId,
      actorUserId: opts.userId,
      action: "course.created",
      entityType: "course",
      entityId: row.id,
      payload: { classId: opts.classId },
    });
    return row;
  });
}

export async function listCoursesForEditor(opts: {
  tenantId: string;
  userId: string;
  isAdmin: boolean;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    if (opts.isAdmin) {
      return tx
        .select({ course: courses, className: classes.name })
        .from(courses)
        .innerJoin(classes, eq(courses.classId, classes.id))
        .where(and(eq(courses.tenantId, opts.tenantId), isNull(courses.deletedAt)))
        .orderBy(asc(classes.name), asc(courses.title));
    }
    return tx
      .select({ course: courses, className: classes.name })
      .from(courses)
      .innerJoin(classes, eq(courses.classId, classes.id))
      .where(
        and(
          eq(courses.tenantId, opts.tenantId),
          eq(classes.teacherAuthUserId, opts.userId),
          isNull(courses.deletedAt),
        ),
      )
      .orderBy(asc(courses.title));
  });
}

export async function getCourseEditor(opts: {
  tenantId: string;
  userId: string;
  courseId: string;
  isAdmin: boolean;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    const courseRows = await tx
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.id, opts.courseId),
          eq(courses.tenantId, opts.tenantId),
          isNull(courses.deletedAt),
        ),
      )
      .limit(1);
    const course = courseRows[0];
    if (!course) throw new CourseError("Course not found");
    await assertCanEditClass(tx, {
      tenantId: opts.tenantId,
      userId: opts.userId,
      classId: course.classId,
      isAdmin: opts.isAdmin,
    });

    const moduleRows = await tx
      .select()
      .from(modules)
      .where(and(eq(modules.courseId, course.id), isNull(modules.deletedAt)))
      .orderBy(asc(modules.position), asc(modules.createdAt));

    const resourceRows =
      moduleRows.length === 0
        ? []
        : await tx
            .select()
            .from(resources)
            .where(
              and(
                eq(resources.tenantId, opts.tenantId),
                isNull(resources.deletedAt),
                sql`${resources.moduleId} IN (${sql.join(
                  moduleRows.map((m) => sql`${m.id}::uuid`),
                  sql`, `,
                )})`,
              ),
            )
            .orderBy(asc(resources.position));

    const byModule = new Map<string, ResourceRow[]>();
    for (const r of resourceRows) {
      const list = byModule.get(r.moduleId) ?? [];
      list.push(r);
      byModule.set(r.moduleId, list);
    }

    return {
      course,
      modules: moduleRows.map((m) => ({
        module: m,
        resources: byModule.get(m.id) ?? [],
      })),
    };
  });
}

export async function publishCourse(opts: {
  tenantId: string;
  userId: string;
  courseId: string;
  isAdmin: boolean;
  status: "draft" | "published";
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    await assertWritable(opts.tenantId, opts.userId, tx);
    const courseRows = await tx
      .select()
      .from(courses)
      .where(and(eq(courses.id, opts.courseId), eq(courses.tenantId, opts.tenantId)))
      .limit(1);
    const course = courseRows[0];
    if (!course) throw new CourseError("Course not found");
    await assertCanEditClass(tx, {
      tenantId: opts.tenantId,
      userId: opts.userId,
      classId: course.classId,
      isAdmin: opts.isAdmin,
    });

    await tx
      .update(courses)
      .set({ status: opts.status, updatedAt: new Date() })
      .where(eq(courses.id, course.id));

    await tx.insert(auditLog).values({
      tenantId: opts.tenantId,
      actorUserId: opts.userId,
      action: opts.status === "published" ? "course.published" : "course.unpublished",
      entityType: "course",
      entityId: course.id,
      payload: {},
    });
  });
}

export async function addModule(opts: {
  tenantId: string;
  userId: string;
  courseId: string;
  title: string;
  isAdmin: boolean;
  availableAt?: Date | null;
}) {
  const dripDefault = await getSetting<boolean>(
    opts.tenantId,
    opts.userId,
    "courses.drip_enabled_default",
  );

  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    await assertWritable(opts.tenantId, opts.userId, tx);
    const courseRows = await tx
      .select()
      .from(courses)
      .where(and(eq(courses.id, opts.courseId), isNull(courses.deletedAt)))
      .limit(1);
    const course = courseRows[0];
    if (!course) throw new CourseError("Course not found");
    await assertCanEditClass(tx, {
      tenantId: opts.tenantId,
      userId: opts.userId,
      classId: course.classId,
      isAdmin: opts.isAdmin,
    });

    const existing = await tx
      .select({ position: modules.position })
      .from(modules)
      .where(and(eq(modules.courseId, course.id), isNull(modules.deletedAt)))
      .orderBy(asc(modules.position));
    const nextPos =
      existing.length === 0 ? 0 : (existing[existing.length - 1]?.position ?? 0) + 1;

    const dripEnabled = Boolean(dripDefault);
    const [row] = await tx
      .insert(modules)
      .values({
        tenantId: opts.tenantId,
        courseId: course.id,
        title: opts.title,
        position: nextPos,
        dripEnabled,
        availableAt: dripEnabled ? (opts.availableAt ?? null) : null,
      })
      .returning();
    if (!row) throw new CourseError("Could not create module");
    return row;
  });
}

export async function updateModuleDrip(opts: {
  tenantId: string;
  userId: string;
  moduleId: string;
  dripEnabled: boolean;
  availableAt: Date | null;
  isAdmin: boolean;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    await assertWritable(opts.tenantId, opts.userId, tx);
    const modRows = await tx
      .select({ module: modules, course: courses })
      .from(modules)
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .where(and(eq(modules.id, opts.moduleId), isNull(modules.deletedAt)))
      .limit(1);
    const row = modRows[0];
    if (!row) throw new CourseError("Module not found");
    await assertCanEditClass(tx, {
      tenantId: opts.tenantId,
      userId: opts.userId,
      classId: row.course.classId,
      isAdmin: opts.isAdmin,
    });

    await tx
      .update(modules)
      .set({
        dripEnabled: opts.dripEnabled,
        availableAt: opts.dripEnabled ? opts.availableAt : null,
        updatedAt: new Date(),
      })
      .where(eq(modules.id, opts.moduleId));
  });
}

export async function addResource(opts: {
  tenantId: string;
  userId: string;
  moduleId: string;
  title: string;
  type: ResourceType;
  body?: string | null;
  externalUrl?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  isAdmin: boolean;
  /** When true, quota already checked and usage should be recorded */
  recordStorageBytes?: number;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    await assertWritable(opts.tenantId, opts.userId, tx);
    const modRows = await tx
      .select({ module: modules, course: courses })
      .from(modules)
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .where(and(eq(modules.id, opts.moduleId), isNull(modules.deletedAt)))
      .limit(1);
    const row = modRows[0];
    if (!row) throw new CourseError("Module not found");
    await assertCanEditClass(tx, {
      tenantId: opts.tenantId,
      userId: opts.userId,
      classId: row.course.classId,
      isAdmin: opts.isAdmin,
    });

    if (opts.recordStorageBytes && opts.recordStorageBytes > 0) {
      await assertQuota(
        opts.tenantId,
        opts.userId,
        "storage_bytes",
        opts.recordStorageBytes,
        tx,
      );
    }

    const existing = await tx
      .select({ position: resources.position })
      .from(resources)
      .where(and(eq(resources.moduleId, opts.moduleId), isNull(resources.deletedAt)))
      .orderBy(asc(resources.position));
    const nextPos =
      existing.length === 0 ? 0 : (existing[existing.length - 1]?.position ?? 0) + 1;

    const [created] = await tx
      .insert(resources)
      .values({
        tenantId: opts.tenantId,
        moduleId: opts.moduleId,
        title: opts.title,
        type: opts.type,
        position: nextPos,
        body: opts.body ?? null,
        externalUrl: opts.externalUrl ?? null,
        storageKey: opts.storageKey ?? null,
        mimeType: opts.mimeType ?? null,
        sizeBytes: opts.sizeBytes ?? null,
      })
      .returning();
    if (!created) throw new CourseError("Could not create resource");

    if (opts.recordStorageBytes && opts.recordStorageBytes > 0) {
      await recordUsage(tx, {
        tenantId: opts.tenantId,
        metric: "storage_bytes",
        delta: opts.recordStorageBytes,
        reason: "resource.upload",
      });
    }

    return created;
  });
}

/** Assert storage quota inside a tenant transaction (for upload route). */
export async function assertStorageQuota(opts: {
  tenantId: string;
  userId: string;
  bytes: number;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    await assertWritable(opts.tenantId, opts.userId, tx);
    await assertQuota(opts.tenantId, opts.userId, "storage_bytes", opts.bytes, tx);
  });
}

export async function listPublishedCoursesForStudent(opts: {
  tenantId: string;
  userId: string;
  studentId: string;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    return tx
      .select({ course: courses, className: classes.name })
      .from(courses)
      .innerJoin(classes, eq(courses.classId, classes.id))
      .innerJoin(
        classEnrolments,
        and(
          eq(classEnrolments.classId, courses.classId),
          eq(classEnrolments.studentId, opts.studentId),
          eq(classEnrolments.status, "active"),
          isNull(classEnrolments.deletedAt),
        ),
      )
      .where(
        and(
          eq(courses.tenantId, opts.tenantId),
          eq(courses.status, "published"),
          isNull(courses.deletedAt),
        ),
      )
      .orderBy(asc(courses.title));
  });
}

export async function getStudentCourseView(opts: {
  tenantId: string;
  userId: string;
  courseId: string;
  studentId: string;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    const courseRows = await tx
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.id, opts.courseId),
          eq(courses.tenantId, opts.tenantId),
          eq(courses.status, "published"),
          isNull(courses.deletedAt),
        ),
      )
      .limit(1);
    const course = courseRows[0];
    if (!course) throw new CourseError("Course not found");

    const enrolled = await tx
      .select()
      .from(classEnrolments)
      .where(
        and(
          eq(classEnrolments.classId, course.classId),
          eq(classEnrolments.studentId, opts.studentId),
          eq(classEnrolments.status, "active"),
          isNull(classEnrolments.deletedAt),
        ),
      )
      .limit(1);
    if (!enrolled[0]) throw new CourseError("Not enrolled in this course's class");

    const moduleRows = await tx
      .select()
      .from(modules)
      .where(and(eq(modules.courseId, course.id), isNull(modules.deletedAt)))
      .orderBy(asc(modules.position));

    const now = new Date();
    const unlockedIds = moduleRows
      .filter((m) => isModuleUnlocked(m, now))
      .map((m) => m.id);

    const resourceRows =
      unlockedIds.length === 0
        ? []
        : await tx
            .select()
            .from(resources)
            .where(
              and(
                isNull(resources.deletedAt),
                sql`${resources.moduleId} IN (${sql.join(
                  unlockedIds.map((id) => sql`${id}::uuid`),
                  sql`, `,
                )})`,
              ),
            )
            .orderBy(asc(resources.position));

    const byModule = new Map<string, ResourceRow[]>();
    for (const r of resourceRows) {
      const list = byModule.get(r.moduleId) ?? [];
      list.push(r);
      byModule.set(r.moduleId, list);
    }

    return {
      course,
      modules: moduleRows.map((m) => {
        const unlocked = isModuleUnlocked(m, now);
        return {
          module: m,
          unlocked,
          resources: unlocked ? (byModule.get(m.id) ?? []) : [],
        };
      }),
    };
  });
}

export async function authorizeResourceDownload(opts: {
  tenantId: string;
  userId: string;
  resourceId: string;
  isAdmin: boolean;
  isTeacher: boolean;
  studentId?: string | null;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
    const rows = await tx
      .select({
        resource: resources,
        module: modules,
        course: courses,
        classRow: classes,
      })
      .from(resources)
      .innerJoin(modules, eq(resources.moduleId, modules.id))
      .innerJoin(courses, eq(modules.courseId, courses.id))
      .innerJoin(classes, eq(courses.classId, classes.id))
      .where(
        and(
          eq(resources.id, opts.resourceId),
          eq(resources.tenantId, opts.tenantId),
          isNull(resources.deletedAt),
          isNull(modules.deletedAt),
          isNull(courses.deletedAt),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) throw new CourseError("Resource not found");
    if (row.resource.type !== "file" || !row.resource.storageKey) {
      throw new CourseError("Not a downloadable file");
    }

    if (opts.isAdmin) return row;
    if (opts.isTeacher && row.classRow.teacherAuthUserId === opts.userId) return row;

    if (opts.studentId) {
      if (row.course.status !== "published") throw new CourseError("Course not published");
      if (!isModuleUnlocked(row.module)) throw new CourseError("Module is locked");
      const enrolled = await tx
        .select()
        .from(classEnrolments)
        .where(
          and(
            eq(classEnrolments.classId, row.course.classId),
            eq(classEnrolments.studentId, opts.studentId),
            eq(classEnrolments.status, "active"),
            isNull(classEnrolments.deletedAt),
          ),
        )
        .limit(1);
      if (!enrolled[0]) throw new CourseError("Not enrolled");

      const existing = await tx
        .select()
        .from(resourceViews)
        .where(
          and(
            eq(resourceViews.resourceId, row.resource.id),
            eq(resourceViews.studentId, opts.studentId),
          ),
        )
        .limit(1);
      if (!existing[0]) {
        await tx.insert(resourceViews).values({
          tenantId: opts.tenantId,
          resourceId: row.resource.id,
          studentId: opts.studentId,
        });
      }
      return row;
    }

    throw new CourseError("Forbidden");
  });
}

export async function findStudentByAuthUser(opts: {
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

export async function listEditorClasses(opts: {
  tenantId: string;
  userId: string;
  isAdmin: boolean;
}) {
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, async (tx) => {
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
  });
}
