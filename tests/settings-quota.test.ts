import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createTestPool } from "./helpers/db-pool";
import { createTestTenant } from "./helpers/test-tenant";
import { getSetting, setSetting, listSettingDefinitions } from "../lib/settings";
import {
  assertQuota,
  assertWritable,
  QuotaError,
  WritableError,
} from "../lib/billing/quota";
import { withTenant } from "../lib/db/tenant";
import { sql } from "drizzle-orm";

const pool = createTestPool();
let tenantId = "";
let ownerUser = "";

describe("Phase 3 settings & quotas", () => {
  before(async () => {
    const t = await createTestTenant(pool);
    tenantId = t.tenantId;
    ownerUser = t.ownerUserId;
  });

  after(async () => {
    await withTenant({ tenantId, userId: ownerUser }, async (tx) => {
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
    await pool.end();
  });

  it("settings.get returns defaults then overrides", async () => {
    const defs = await listSettingDefinitions();
    assert.ok(defs.length >= 17);

    const before = await getSetting<boolean>(
      tenantId,
      ownerUser,
      "exams.class_rank_visible",
    );
    assert.equal(before, false);

    await setSetting({
      tenantId,
      userId: ownerUser,
      key: "exams.class_rank_visible",
      value: true,
    });

    const after = await getSetting<boolean>(
      tenantId,
      ownerUser,
      "exams.class_rank_visible",
    );
    assert.equal(after, true);
  });

  it("assertQuota blocks when over plan limit", async () => {
    await withTenant({ tenantId, userId: ownerUser }, async (tx) => {
      await tx.execute(
        sql`UPDATE usage_counters SET quantity = 200 WHERE metric = 'students'`,
      );
    });

    await assert.rejects(
      () => assertQuota(tenantId, ownerUser, "students", 1),
      QuotaError,
    );
  });

  it("assertWritable blocks read_only but attendance would skip it separately", async () => {
    await withTenant({ tenantId, userId: ownerUser }, async (tx) => {
      await tx.execute(
        sql`UPDATE subscriptions SET status = 'read_only' WHERE tenant_id = ${tenantId}::uuid`,
      );
    });

    await assert.rejects(
      () => assertWritable(tenantId, ownerUser),
      (err: unknown) => err instanceof WritableError,
    );

    await withTenant({ tenantId, userId: ownerUser }, async (tx) => {
      await tx.execute(
        sql`UPDATE subscriptions SET status = 'active' WHERE tenant_id = ${tenantId}::uuid`,
      );
    });
  });
});
