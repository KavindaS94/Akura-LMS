import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { and, eq, isNull, sql } from "drizzle-orm";
import ws from "ws";
import * as schema from "../lib/db/schema";
import { memberships } from "../lib/db/schema";
import { assertRole, ForbiddenError, ADMIN_ROLES } from "../lib/rbac";
import {
  countOwnersWithTenant,
  disableMembership,
  transferOwnership,
} from "../lib/tenant/ownership";
import { withTenant } from "../lib/db/tenant";

neonConfig.webSocketConstructor = ws;

const url =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");

const pool = new Pool({ connectionString: url });
const db = drizzle(pool, { schema });

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
      [slug, "Phase 2 Test Institute", ownerUser],
    );
    tenantId = created.rows[0]!.app_create_tenant_with_owner;

    await pool.query(
      `SELECT app_bootstrap_membership($1::uuid, $2, 'admin'::membership_role, false)`,
      [tenantId, adminUser],
    );
    await pool.query(
      `SELECT app_bootstrap_membership($1::uuid, $2, 'teacher'::membership_role, false)`,
      [tenantId, teacherUser],
    );

    await withTenant({ tenantId, userId: ownerUser }, async (tx) => {
      const rows = await tx
        .select()
        .from(memberships)
        .where(and(eq(memberships.tenantId, tenantId), isNull(memberships.deletedAt)));
      ownerMembershipId = rows.find((r) => r.authUserId === ownerUser)!.id;
      adminMembershipId = rows.find((r) => r.authUserId === adminUser)!.id;
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
    assert.throws(() => assertRole("teacher", ADMIN_ROLES), ForbiddenError);
    assert.doesNotThrow(() => assertRole("admin", ADMIN_ROLES));
  });

  it("tenant always has exactly one owner after create", async () => {
    const n = await countOwnersWithTenant({ tenantId, userId: ownerUser });
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
      /last owner/i,
    );
    const n = await countOwnersWithTenant({ tenantId, userId: ownerUser });
    assert.equal(n, 1);
  });

  it("ownership transfer keeps exactly one owner", async () => {
    await transferOwnership({
      tenantId,
      currentOwnerUserId: ownerUser,
      newOwnerMembershipId: adminMembershipId,
    });
    assert.equal(await countOwnersWithTenant({ tenantId, userId: adminUser }), 1);

    await transferOwnership({
      tenantId,
      currentOwnerUserId: adminUser,
      newOwnerMembershipId: ownerMembershipId,
    });
    assert.equal(await countOwnersWithTenant({ tenantId, userId: ownerUser }), 1);
  });
});

void db;
