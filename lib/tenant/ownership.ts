import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rowsOf } from "@/lib/db/result";
import { auditLog, memberships, type Membership } from "@/lib/db/schema";
import { withTenant, type Tx } from "@/lib/db/tenant";
import { ForbiddenError } from "@/lib/rbac";

export class OwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OwnershipError";
  }
}

export async function countActiveOwners(tx: Tx, tenantId: string): Promise<number> {
  const rows = await tx
    .select({ value: count() })
    .from(memberships)
    .where(
      and(
        eq(memberships.tenantId, tenantId),
        eq(memberships.isOwner, true),
        eq(memberships.status, "active"),
        isNull(memberships.deletedAt),
      ),
    );
  return Number(rows[0]?.value ?? 0);
}

async function findMembership(
  tx: Tx,
  where: ReturnType<typeof and>,
): Promise<Membership | undefined> {
  const rows = await tx.select().from(memberships).where(where).limit(1);
  return rows[0];
}

/** Soft-disable a membership; refuses if it would leave zero owners. */
export async function disableMembership(opts: {
  tenantId: string;
  actorUserId: string;
  targetMembershipId: string;
}) {
  return withTenant(
    { tenantId: opts.tenantId, userId: opts.actorUserId },
    async (tx) => {
      const target = await findMembership(
        tx,
        and(
          eq(memberships.id, opts.targetMembershipId),
          eq(memberships.tenantId, opts.tenantId),
          isNull(memberships.deletedAt),
        ),
      );
      if (!target) {
        throw new OwnershipError("Membership not found.");
      }

      if (target.isOwner) {
        const owners = await countActiveOwners(tx, opts.tenantId);
        if (owners <= 1) {
          throw new OwnershipError(
            "Cannot remove the last owner. Transfer ownership first.",
          );
        }
      }

      await tx
        .update(memberships)
        .set({
          status: "disabled",
          deletedAt: new Date(),
          updatedAt: new Date(),
          isOwner: false,
        })
        .where(eq(memberships.id, target.id));

      await tx.insert(auditLog).values({
        tenantId: opts.tenantId,
        actorUserId: opts.actorUserId,
        action: "membership.disabled",
        entityType: "membership",
        entityId: target.id,
        payload: { authUserId: target.authUserId, wasOwner: target.isOwner },
      });
    },
  );
}

/** Transfer Owner flag to another active admin. Current owner must call this. */
export async function transferOwnership(opts: {
  tenantId: string;
  currentOwnerUserId: string;
  newOwnerMembershipId: string;
}) {
  return withTenant(
    { tenantId: opts.tenantId, userId: opts.currentOwnerUserId },
    async (tx) => {
      const current = await findMembership(
        tx,
        and(
          eq(memberships.tenantId, opts.tenantId),
          eq(memberships.authUserId, opts.currentOwnerUserId),
          eq(memberships.status, "active"),
          isNull(memberships.deletedAt),
        ),
      );
      if (!current?.isOwner) {
        throw new ForbiddenError("Only the current owner can transfer ownership.");
      }

      const next = await findMembership(
        tx,
        and(
          eq(memberships.id, opts.newOwnerMembershipId),
          eq(memberships.tenantId, opts.tenantId),
          eq(memberships.status, "active"),
          isNull(memberships.deletedAt),
        ),
      );
      if (!next) {
        throw new OwnershipError("Target membership not found.");
      }
      if (next.role !== "admin") {
        throw new OwnershipError("Owner must be an institute admin.");
      }
      if (next.id === current.id) {
        throw new OwnershipError("Already the owner.");
      }

      await tx
        .update(memberships)
        .set({ isOwner: false, updatedAt: new Date() })
        .where(eq(memberships.id, current.id));

      await tx
        .update(memberships)
        .set({ isOwner: true, updatedAt: new Date() })
        .where(eq(memberships.id, next.id));

      const owners = await countActiveOwners(tx, opts.tenantId);
      if (owners !== 1) {
        throw new OwnershipError("Ownership transfer left an invalid owner count.");
      }

      await tx.insert(auditLog).values({
        tenantId: opts.tenantId,
        actorUserId: opts.currentOwnerUserId,
        action: "ownership.transferred",
        entityType: "membership",
        entityId: next.id,
        payload: {
          from: current.authUserId,
          to: next.authUserId,
        },
      });

      return next;
    },
  );
}

export async function countOwnersWithTenant(opts: {
  tenantId: string;
  userId: string;
}) {
  return withTenant(opts, (tx) => countActiveOwners(tx, opts.tenantId));
}

export async function createTenantWithOwner(opts: {
  slug: string;
  name: string;
  authUserId: string;
  timezone?: string;
}): Promise<string> {
  const result = await db.execute(
    sql`SELECT app_create_tenant_with_owner(
      ${opts.slug},
      ${opts.name},
      ${opts.authUserId},
      ${opts.timezone ?? "Asia/Colombo"}
    ) AS app_create_tenant_with_owner`,
  );
  const id = rowsOf<{ app_create_tenant_with_owner: string }>(result)[0]
    ?.app_create_tenant_with_owner;
  if (!id) throw new Error("Failed to create tenant.");
  return id;
}
