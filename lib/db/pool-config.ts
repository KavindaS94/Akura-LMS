import type { PoolConfig } from "pg";

/** Supabase often needs TLS with rejectUnauthorized:false in Node. */
export function pgPoolConfig(connectionString: string): PoolConfig {
  const url = connectionString
    .replace(/[?&]sslmode=[^&]*/g, "")
    .replace(/\?$/, "")
    .replace(/\?&/, "?");
  return {
    connectionString: url,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: false },
    max: 10,
  };
}
