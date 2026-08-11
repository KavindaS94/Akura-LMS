import { config } from "dotenv";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { pgPoolConfig } from "../lib/db/pool-config";

config({ path: ".env" });

const url =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");
  process.exit(1);
}

async function main() {
  const pool = new Pool(pgPoolConfig(url!));
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const dir = join(process.cwd(), "drizzle/migrations");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const applied = await client.query(
        `SELECT 1 FROM drizzle_migrations WHERE id = $1`,
        [file],
      );
      if (applied.rowCount && applied.rowCount > 0) {
        console.log(`skip ${file}`);
        continue;
      }
      const sqlText = readFileSync(join(dir, file), "utf8");
      console.log(`apply ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sqlText);
        await client.query(
          `INSERT INTO drizzle_migrations (id) VALUES ($1)`,
          [file],
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
    console.log("Migrations complete");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
