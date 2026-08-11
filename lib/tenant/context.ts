import { redirect, notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rowsOf } from "@/lib/db/result";
import type { Membership, MembershipRole, Tenant } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import {
  loadTenantInContext,
  requireMembership,
  resolveTenantIdBySlug,
  TenantError,
} from "@/lib/tenant/resolve";
import { assertRole, ForbiddenError, roleHomePath } from "@/lib/rbac";

export type TenantContext = {
  user: { id: string; email: string; name: string | null };
  tenant: Tenant;
  membership: Membership;
  tenantId: string;
  slug: string;
};

export async function listMembershipsForUser(authUserId: string) {
  const result = await db.execute(
    sql`SELECT * FROM app_list_memberships_for_user(${authUserId})`,
  );
  return rowsOf<{
    tenant_id: string;
    tenant_slug: string;
    tenant_name: string;
    role: MembershipRole;
    is_owner: boolean;
  }>(result);
}

export async function getTenantContext(slug: string): Promise<TenantContext> {
  const user = await getSessionUser();
  if (!user) {
    throw new TenantError("You must be signed in.", "UNAUTHENTICATED");
  }

  const tenantId = await resolveTenantIdBySlug(slug);
  if (!tenantId) {
    throw new TenantError("Institute not found.", "NOT_FOUND");
  }

  const membership = await requireMembership({
    tenantId,
    authUserId: user.id,
  });
  if (!membership) {
    throw new TenantError("You are not a member of this institute.", "FORBIDDEN");
  }

  const tenant = await loadTenantInContext({
    tenantId,
    authUserId: user.id,
  });
  if (!tenant) {
    throw new TenantError("Institute not found.", "NOT_FOUND");
  }

  return {
    user,
    tenant,
    membership,
    tenantId,
    slug: tenant.slug,
  };
}

export async function requireRole(
  slug: string,
  allowed: MembershipRole[],
): Promise<TenantContext> {
  try {
    const ctx = await getTenantContext(slug);
    assertRole(ctx.membership.role, allowed);
    return ctx;
  } catch (err) {
    if (err instanceof TenantError) {
      if (err.code === "UNAUTHENTICATED") {
        redirect(`/login?next=/i/${encodeURIComponent(slug)}`);
      }
      if (err.code === "NOT_FOUND") notFound();
      throw new ForbiddenError(err.message);
    }
    throw err;
  }
}

export async function redirectToRoleHome(authUserId: string): Promise<never> {
  const rows = await listMembershipsForUser(authUserId);
  const first = rows[0];
  if (!first) {
    redirect("/");
  }
  redirect(roleHomePath(first.tenant_slug, first.role));
}
