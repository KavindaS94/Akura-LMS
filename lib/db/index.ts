import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

const globalForDb = globalThis as unknown as {
  akuraPool?: Pool;
};

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  return connectionString;
}

function getPool() {
  if (!globalForDb.akuraPool) {
    globalForDb.akuraPool = new Pool({ connectionString: getConnectionString() });
  }
  return globalForDb.akuraPool;
}

function createDb() {
  return drizzle(getPool(), { schema });
}

type AppDb = ReturnType<typeof createDb>;

const globalForDrizzle = globalThis as unknown as {
  akuraDb?: AppDb;
};

export const db: AppDb = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    if (!globalForDrizzle.akuraDb) {
      globalForDrizzle.akuraDb = createDb();
    }
    return Reflect.get(globalForDrizzle.akuraDb, prop, receiver);
  },
});

export const pool = {
  get connect() {
    return getPool().connect.bind(getPool());
  },
  get end() {
    return getPool().end.bind(getPool());
  },
  get query() {
    return getPool().query.bind(getPool());
  },
};

export type Db = AppDb;
