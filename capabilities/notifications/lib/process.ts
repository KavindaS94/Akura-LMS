import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rowsOf } from "@/lib/db/result";
import { tenants } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { isInQuietHours } from "@/lib/email/quiet-hours";
import { isResendConfigured } from "@/lib/email/client";
import {
  handleAttendanceMarked,
  handleExamsPublished,
  QuotaError,
} from "@/capabilities/notifications/lib/handlers";
import { settingDefinitions, tenantSettings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export type PendingEvent = {
  id: string;
  tenant_id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
  created_at: Date;
};

export async function listPendingEvents(limit = 50): Promise<PendingEvent[]> {
  const result = await db.execute(
    sql`SELECT * FROM app_list_pending_events(${limit})`,
  );
  return rowsOf<PendingEvent>(result);
}

async function markProcessed(id: string) {
  await db.execute(sql`SELECT app_mark_event_processed(${id}::uuid)`);
}

async function markFailed(id: string, error: string) {
  await db.execute(
    sql`SELECT app_mark_event_failed(${id}::uuid, ${error})`,
  );
}

export type ProcessResult = {
  processed: number;
  deferred: number;
  failed: number;
  skipped: number;
};

async function readSettingInTx<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  tenantId: string,
  key: string,
): Promise<T> {
  const def = await tx
    .select()
    .from(settingDefinitions)
    .where(eq(settingDefinitions.key, key))
    .limit(1);
  const override = await tx
    .select()
    .from(tenantSettings)
    .where(
      and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)),
    )
    .limit(1);
  return (override[0]?.value ?? def[0]?.defaultValue) as T;
}

/**
 * Process pending outbox events. Quiet hours defer without bumping attempts.
 * Missing Resend config marks events processed (skipped) so local/CI queues drain.
 */
export async function processPendingEvents(
  limit = 50,
): Promise<ProcessResult> {
  const pending = await listPendingEvents(limit);
  const summary: ProcessResult = {
    processed: 0,
    deferred: 0,
    failed: 0,
    skipped: 0,
  };

  for (const event of pending) {
    const actor =
      typeof event.payload.markedBy === "string"
        ? event.payload.markedBy
        : typeof event.payload.publishedBy === "string"
          ? event.payload.publishedBy
          : "system";

    try {
      if (
        (event.type === "attendance.marked" ||
          event.type === "exams.published") &&
        !isResendConfigured()
      ) {
        await markProcessed(event.id);
        summary.skipped += 1;
        continue;
      }

      if (
        event.type !== "attendance.marked" &&
        event.type !== "exams.published"
      ) {
        await markProcessed(event.id);
        summary.skipped += 1;
        continue;
      }

      let deferred = false;

      await withTenant(
        { tenantId: event.tenant_id, userId: actor },
        async (tx) => {
          const [tenant] = await tx
            .select({ timezone: tenants.timezone })
            .from(tenants)
            .where(eq(tenants.id, event.tenant_id))
            .limit(1);
          const timezone = tenant?.timezone ?? "Asia/Colombo";

          const quietStart = await readSettingInTx<string>(
            tx,
            event.tenant_id,
            "notifications.quiet_hours_start",
          );
          const quietEnd = await readSettingInTx<string>(
            tx,
            event.tenant_id,
            "notifications.quiet_hours_end",
          );

          if (isInQuietHours(new Date(), quietStart, quietEnd, timezone)) {
            deferred = true;
            return;
          }

          if (event.type === "attendance.marked") {
            await handleAttendanceMarked(tx, {
              tenantId: event.tenant_id,
              userId: actor,
              payload: event.payload,
            });
          } else {
            await handleExamsPublished(tx, {
              tenantId: event.tenant_id,
              userId: actor,
              payload: event.payload,
            });
          }
        },
      );

      if (deferred) {
        summary.deferred += 1;
        continue;
      }

      await markProcessed(event.id);
      summary.processed += 1;
    } catch (err) {
      const message =
        err instanceof QuotaError
          ? err.message
          : err instanceof Error
            ? err.message
            : "unknown";
      await markFailed(event.id, message);
      summary.failed += 1;
    }
  }

  return summary;
}
