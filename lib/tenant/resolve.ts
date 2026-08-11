import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, tenants } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { rowsOf } from "@/lib/db/result";

export class TenantError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "FORBIDDEN" | "UNAUTHENTICATED",
  ) {
    super(message);
    this.name = "TenantError";
  }
}

export async function resolveTenantIdBySlug(slug: string): Promise<string | null> {
  const result = await db.execute(
    sql`SELECT app_resolve_tenant_id(${slug}) AS app_resolve_tenant_id`,
  );
  const row = rowsOf<{ app_resolve_tenant_id: string | null }>(result)[0];
  return row?.app_resolve_tenant_id ?? null;
}

export async function requireMembership(opts: {
  tenantId: string;
  authUserId: string;
}) {
  return withTenant(
    { tenantId: opts.tenantId, userId: opts.authUserId },
    async (tx) => {
      const rows = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.tenantId, opts.tenantId),
            eq(memberships.authUserId, opts.authUserId),
            eq(memberships.status, "active"),
            isNull(memberships.deletedAt),
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    },
  );
}

export async function loadTenantInContext(opts: {
  tenantId: string;
  authUserId: string;
}) {
  return withTenant(
    { tenantId: opts.tenantId, userId: opts.authUserId },
    async (tx) => {
      const rows = await tx
        .select()
        .from(tenants)
        .where(and(eq(tenants.id, opts.tenantId), isNull(tenants.deletedAt)))
        .limit(1);
      return rows[0] ?? null;
    },
  );
}
