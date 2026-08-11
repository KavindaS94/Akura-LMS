import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { after, before, describe, it } from "node:test";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import * as schema from "../lib/db/schema";
import { auditLog, events, memberships } from "../lib/db/schema";

config({ path: ".env" });
neonConfig.webSocketConstructor = ws;

const url =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL required for RLS tests");
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool, { schema });

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function withTenantLocal<T>(
  ctx: { tenantId: string; userId: string },
  fn: (tx: Tx) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE akura_app`);
    await tx.execute(
      sql`SELECT set_config('app.current_tenant', ${ctx.tenantId}, true)`,
    );
    await tx.execute(
      sql`SELECT set_config('app.current_user', ${ctx.userId}, true)`,
    );
    return fn(tx);
  });
}

const tenantA = randomUUID();
const tenantB = randomUUID();
const userA = `user-a-${randomUUID()}`;
const userB = `user-b-${randomUUID()}`;
const slugA = `rls-a-${tenantA.slice(0, 8)}`;
const slugB = `rls-b-${tenantB.slice(0, 8)}`;

describe("RLS tenant isolation", () => {
  before(async () => {
    await pool.query(`SELECT app_bootstrap_tenant($1::uuid, $2, $3)`, [
      tenantA,
      slugA,
      "Tenant A",
    ]);
    await pool.query(`SELECT app_bootstrap_tenant($1::uuid, $2, $3)`, [
      tenantB,
      slugB,
      "Tenant B",
    ]);
    await pool.query(
      `SELECT app_bootstrap_membership($1::uuid, $2, 'admin'::membership_role, true)`,
      [tenantA, userA],
    );
    await pool.query(
      `SELECT app_bootstrap_membership($1::uuid, $2, 'admin'::membership_role, true)`,
      [tenantB, userB],
    );

    await withTenantLocal({ tenantId: tenantA, userId: userA }, async (tx) => {
      await tx.insert(auditLog).values({
        tenantId: tenantA,
        actorUserId: userA,
        action: "test.seed",
        entityType: "tenant",
        entityId: tenantA,
        payload: { who: "A" },
      });
      await tx.insert(events).values({
        tenantId: tenantA,
        type: "test.seeded",
        payload: { who: "A" },
      });
    });

    await withTenantLocal({ tenantId: tenantB, userId: userB }, async (tx) => {
      await tx.insert(auditLog).values({
        tenantId: tenantB,
        actorUserId: userB,
        action: "test.seed",
        entityType: "tenant",
        entityId: tenantB,
        payload: { who: "B" },
      });
      await tx.insert(events).values({
        tenantId: tenantB,
        type: "test.seeded",
        payload: { who: "B" },
      });
    });
  });

  after(async () => {
    // Cleanup via SECURITY DEFINER path is limited; delete inside each tenant context
    await withTenantLocal({ tenantId: tenantA, userId: userA }, async (tx) => {
      await tx.execute(sql`DELETE FROM audit_log`);
      await tx.execute(sql`DELETE FROM events`);
      await tx.execute(sql`DELETE FROM memberships`);
    });
    await withTenantLocal({ tenantId: tenantB, userId: userB }, async (tx) => {
      await tx.execute(sql`DELETE FROM audit_log`);
      await tx.execute(sql`DELETE FROM events`);
      await tx.execute(sql`DELETE FROM memberships`);
    });
    // Soft-delete tenants via bootstrap overwrite is enough; hard delete needs definer
    await pool.query(
      `UPDATE tenants SET deleted_at = now() WHERE id = ANY($1::uuid[])`,
      [[tenantA, tenantB]],
    ).catch(() => undefined);
    await pool.end();
  });

  it("Tenant A withTenant sees only A memberships, audit_log, events", async () => {
    await withTenantLocal({ tenantId: tenantA, userId: userA }, async (tx) => {
      const m = await tx.select().from(memberships);
      const a = await tx.select().from(auditLog);
      const e = await tx.select().from(events);

      assert.equal(m.length, 1);
      assert.equal(m[0]?.tenantId, tenantA);
      assert.equal(a.length, 1);
      assert.equal(a[0]?.tenantId, tenantA);
      assert.equal(e.length, 1);
      assert.equal(e[0]?.tenantId, tenantA);

      const bMemberships = m.filter((row) => row.tenantId === tenantB);
      const bAudit = a.filter((row) => row.tenantId === tenantB);
      const bEvents = e.filter((row) => row.tenantId === tenantB);
      assert.equal(bMemberships.length, 0);
      assert.equal(bAudit.length, 0);
      assert.equal(bEvents.length, 0);
    });
  });

  it("unscoped SELECT inside Tenant A GUC still returns zero Tenant B rows", async () => {
    await withTenantLocal({ tenantId: tenantA, userId: userA }, async (tx) => {
      const audit = await tx.execute<{ tenant_id: string }>(
        sql`SELECT tenant_id FROM audit_log`,
      );
      const ev = await tx.execute<{ tenant_id: string }>(
        sql`SELECT tenant_id FROM events`,
      );
      const mem = await tx.execute<{ tenant_id: string }>(
        sql`SELECT tenant_id FROM memberships`,
      );

      const auditRows = audit.rows ?? [];
      const eventRows = ev.rows ?? [];
      const memRows = mem.rows ?? [];

      assert.ok(auditRows.every((r) => r.tenant_id === tenantA));
      assert.ok(eventRows.every((r) => r.tenant_id === tenantA));
      assert.ok(memRows.every((r) => r.tenant_id === tenantA));
      assert.equal(
        auditRows.filter((r) => r.tenant_id === tenantB).length,
        0,
      );
      assert.equal(eventRows.filter((r) => r.tenant_id === tenantB).length, 0);
      assert.equal(memRows.filter((r) => r.tenant_id === tenantB).length, 0);
    });
  });

  it("query without GUC fails closed (zero rows via missing_ok setting)", async () => {
    // Outside withTenant: assume akura_app without tenant GUC → policy matches nothing
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE akura_app");
      await client.query("SELECT set_config('app.current_tenant', '', true)");
      const audit = await client.query(`SELECT * FROM audit_log`);
      const ev = await client.query(`SELECT * FROM events`);
      const mem = await client.query(`SELECT * FROM memberships`);
      assert.equal(audit.rowCount, 0);
      assert.equal(ev.rowCount, 0);
      assert.equal(mem.rowCount, 0);
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });
});
