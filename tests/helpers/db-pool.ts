import { Pool } from "pg";
import { pgPoolConfig } from "../../lib/db/pool-config";

export function createTestPool() {
  const url =
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.DIRECT_URL ??
    process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  return new Pool(pgPoolConfig(url));
}
