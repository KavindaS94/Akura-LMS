import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { sql } from "drizzle-orm";
import { withTenant } from "../lib/db/tenant";
import { classes } from "../lib/db/schema";
import { createStudentInTx } from "../capabilities/students/lib/service";
import {
  openOrGetTodaySession,
  saveAttendanceMarks,
  AttendanceError,
} from "../capabilities/attendance/lib/service";
import { WritableError, assertWritable } from "../lib/billing/quota";

neonConfig.webSocketConstructor = ws;

const url =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");

const pool = new Pool({ connectionString: url });
const slug = `p5-${randomUUID().slice(0, 8)}`;
const ownerUser = `owner-${randomUUID()}`;
const teacherUser = `teacher-${randomUUID()}`;

describe("Phase 5 attendance", () => {
  let tenantId = "";
  let classId = "";
  let studentId = "";

  before(async () => {
    const created = await pool.query<{ app_create_tenant_with_owner: string }>(
      `SELECT app_create_tenant_with_owner($1, $2, $3, 'Asia/Colombo') AS app_create_tenant_with_owner`,
      [slug, "Phase 5 Institute", ownerUser],
    );
    tenantId = created.rows[0]!.app_create_tenant_with_owner;

    await withTenant({ tenantId, userId: ownerUser }, async (tx) => {
      await tx.execute(sql`
        INSERT INTO memberships (tenant_id, auth_user_id, role, status, is_owner)
        VALUES (${tenantId}::uuid, ${teacherUser}, 'teacher', 'active', false)
      `);

      const [klass] = await tx
        .insert(classes)
        .values({
          tenantId,
          name: "Grade 10 Maths",
          teacherAuthUserId: teacherUser,
        })
        .returning();
      classId = klass!.id;

      const student = await createStudentInTx(tx, {
        tenantId,
        actorUserId: ownerUser,
        fullName: "Student One",
        classId,
      });
      studentId = student.id;
    });
  });

  after(async () => {
    if (tenantId) {
      await withTenant({ tenantId, userId: ownerUser }, async (tx) => {
        await tx.execute(sql`DELETE FROM attendance_edits`);
        await tx.execute(sql`DELETE FROM attendance`);
        await tx.execute(sql`DELETE FROM class_sessions`);
        await tx.execute(sql`DELETE FROM class_enrolments`);
        await tx.execute(sql`DELETE FROM guardians`);
        await tx.execute(sql`DELETE FROM students`);
        await tx.execute(sql`DELETE FROM classes`);
        await tx.execute(sql`DELETE FROM subjects`);
        await tx.execute(sql`DELETE FROM setting_history`);
        await tx.execute(sql`DELETE FROM tenant_settings`);
        await tx.execute(sql`DELETE FROM usage_events`);
        await tx.execute(sql`DELETE FROM usage_counters`);
        await tx.execute(sql`DELETE FROM subscriptions`);
        await tx.execute(sql`DELETE FROM invitations`);
        await tx.execute(sql`DELETE FROM audit_log`);
        await tx.execute(sql`DELETE FROM events`);
        await tx.execute(sql`DELETE FROM memberships`);
      });
      await pool.query(`UPDATE tenants SET deleted_at = now() WHERE id = $1`, [
        tenantId,
      ]);
    }
    await pool.end();
  });

  it("marks attendance and emits attendance.marked even when subscription is read_only", async () => {
    await withTenant({ tenantId, userId: ownerUser }, async (tx) => {
      await tx.execute(
        sql`UPDATE subscriptions SET status = 'read_only' WHERE tenant_id = ${tenantId}::uuid`,
      );
    });

    await assert.rejects(
      () => assertWritable(tenantId, ownerUser),
      (err: unknown) => err instanceof WritableError,
    );

    const session = await openOrGetTodaySession({
      tenantId,
      userId: teacherUser,
      classId,
    });

    const result = await saveAttendanceMarks({
      tenantId,
      userId: teacherUser,
      sessionId: session.id,
      marks: [{ studentId, status: "absent" }],
    });
    assert.equal(result.sessionId, session.id);
    assert.deepEqual(result.absentIds, [studentId]);

    await withTenant({ tenantId, userId: ownerUser }, async (tx) => {
      const events = await tx.execute<{ type: string }>(
        sql`SELECT type FROM events WHERE tenant_id = ${tenantId}::uuid AND type = 'attendance.marked' ORDER BY created_at DESC LIMIT 1`,
      );
      assert.equal(events.rows[0]?.type, "attendance.marked");
    });

    await withTenant({ tenantId, userId: ownerUser }, async (tx) => {
      await tx.execute(
        sql`UPDATE subscriptions SET status = 'trialing' WHERE tenant_id = ${tenantId}::uuid`,
      );
    });
  });

  it("locks teachers out after lock hours; admin can edit with reason", async () => {
    const session = await openOrGetTodaySession({
      tenantId,
      userId: teacherUser,
      classId,
    });

    await withTenant({ tenantId, userId: ownerUser }, async (tx) => {
      await tx.execute(sql`
        UPDATE class_sessions
        SET created_at = now() - interval '72 hours'
        WHERE id = ${session.id}::uuid
      `);
      await tx.execute(sql`
        INSERT INTO tenant_settings (tenant_id, key, value, updated_by_auth_user_id)
        VALUES (${tenantId}::uuid, 'attendance.lock_hours', '48'::jsonb, ${ownerUser})
        ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value
      `);
    });

    await assert.rejects(
      () =>
        saveAttendanceMarks({
          tenantId,
          userId: teacherUser,
          sessionId: session.id,
          marks: [{ studentId, status: "present" }],
        }),
      (err: unknown) =>
        err instanceof AttendanceError && /locked/i.test(err.message),
    );

    await assert.rejects(
      () =>
        saveAttendanceMarks({
          tenantId,
          userId: ownerUser,
          sessionId: session.id,
          marks: [{ studentId, status: "late" }],
          isAdmin: true,
        }),
      (err: unknown) =>
        err instanceof AttendanceError && /reason/i.test(err.message),
    );

    await saveAttendanceMarks({
      tenantId,
      userId: ownerUser,
      sessionId: session.id,
      marks: [{ studentId, status: "late", arrivedAt: new Date().toISOString() }],
      isAdmin: true,
      editReason: "Corrected late arrival",
    });

    await withTenant({ tenantId, userId: ownerUser }, async (tx) => {
      const edits = await tx.execute<{ reason: string }>(
        sql`SELECT reason FROM attendance_edits WHERE tenant_id = ${tenantId}::uuid ORDER BY created_at DESC LIMIT 1`,
      );
      assert.equal(edits.rows[0]?.reason, "Corrected late arrival");

      const status = await tx.execute<{ status: string }>(
        sql`SELECT status FROM attendance WHERE session_id = ${session.id}::uuid AND student_id = ${studentId}::uuid`,
      );
      assert.equal(status.rows[0]?.status, "late");
    });
  });
});
