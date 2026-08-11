import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { and, eq, isNull, sql } from "drizzle-orm";
import { memberships } from "../lib/db/schema";
import { assertRole, ForbiddenError, ADMIN_ROLES } from "../lib/rbac";
import {
  countOwnersWithTenant,
  disableMembership,
  transferOwnership,
} from "../lib/tenant/ownership";
import { withTenant } from "../lib/db/tenant";
import { createTestPool } from "./helpers/db-pool";

const url =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");

const pool = createTestPool();

const slug = `p2-${randomUUID().slice(0, 8)}`;
const ownerUser = `owner-${randomUUID()}`;
const adminUser = `admin-${randomUUID()}`;
const teacherUser = `teacher-${randomUUID()}`;

describe("Phase 2 roles & ownership", () => {
  let tenantId = "";
  let ownerMembershipId = "";
  let adminMembershipId = "";

  before(async () => {
    const created = await pool.query<{ app_create_tenant_with_owner: string }>(
      `SELECT app_create_tenant_with_owner($1, $2, $3, 'Asia/Colombo') AS app_create_tenant_with_owner`,
      [slug, "Phase 2 Institute", ownerUser],
    );
    tenantId = created.rows[0]!.app_create_tenant_with_owner;

    await withTenant({ tenantId, userId: ownerUser }, async (tx) => {
      const [admin] = await tx
        .insert(memberships)
        .values({
          tenantId,
          authUserId: adminUser,
          role: "admin",
          isOwner: false,
          status: "active",
        })
        .returning();
      adminMembershipId = admin!.id;

      await tx.insert(memberships).values({
        tenantId,
        authUserId: teacherUser,
        role: "teacher",
        isOwner: false,
        status: "active",
      });

      const [owner] = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.authUserId, ownerUser),
            eq(memberships.isOwner, true),
            isNull(memberships.deletedAt),
          ),
        )
        .limit(1);
      ownerMembershipId = owner!.id;
    });
  });

  after(async () => {
    if (tenantId) {
      await withTenant({ tenantId, userId: ownerUser }, async (tx) => {
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

  it("teacher role is forbidden on admin routes (assertRole)", () => {
    assert.throws(
      () => assertRole("teacher", ADMIN_ROLES),
      (err: unknown) => err instanceof ForbiddenError,
    );
  });

  it("tenant always has exactly one owner after create", async () => {
    const n = await countOwnersWithTenant({
      tenantId,
      userId: ownerUser,
    });
    assert.equal(n, 1);
  });

  it("cannot disable the last owner", async () => {
    await assert.rejects(
      () =>
        disableMembership({
          tenantId,
          actorUserId: ownerUser,
          targetMembershipId: ownerMembershipId,
        }),
      (err: unknown) =>
        err instanceof Error && /owner/i.test(err.message),
    );
  });

  it("ownership transfer keeps exactly one owner", async () => {
    await transferOwnership({
      tenantId,
      currentOwnerUserId: ownerUser,
      newOwnerMembershipId: adminMembershipId,
    });
    const n = await countOwnersWithTenant({
      tenantId,
      userId: adminUser,
    });
    assert.equal(n, 1);
  });
});
