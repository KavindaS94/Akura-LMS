import { sql } from "drizzle-orm";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { db } from "@/lib/db";
import * as schema from "./schema";

export type CronTx = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/**
 * The only allowed path for cross-tenant cron/webhook work.
 * Assumes akura_cron (NOSUPERUSER, no RLS-relevant grants) so the
 * SECURITY DEFINER helpers it calls are not reachable by any other role.
 * SET LOCAL ROLE must sit inside an explicit transaction (§4.2).
 */
export async function withCron<T>(fn: (tx: CronTx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE akura_cron`);
    return fn(tx);
  });
}