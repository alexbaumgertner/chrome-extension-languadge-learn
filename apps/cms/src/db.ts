import { neon } from "@neondatabase/serverless";
import type { Config } from "./config";

/**
 * The one storage seam: a parameterized query returning rows. Production uses Neon's HTTP driver
 * (one round-trip per statement, no connection to keep alive across serverless invocations);
 * tests inject an in-memory PGlite instance behind the same interface.
 */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

export function createNeonDb(cfg: Pick<Config, "DATABASE_URL">): Db {
  const sql = neon(cfg.DATABASE_URL);
  return {
    query: async <T>(text: string, params: unknown[] = []) =>
      (await sql.query(text, params)) as T[],
  };
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS cache_entries (
     cache_key TEXT PRIMARY KEY,
     result_text TEXT NOT NULL,
     marked_vocab JSONB NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS usage_counters (
     counter TEXT NOT NULL,
     period_key TEXT NOT NULL,
     usage INTEGER NOT NULL,
     PRIMARY KEY (counter, period_key)
   )`,
];

/** Idempotent; run once per process before the first query (see `withSchema`). */
export async function ensureSchema(db: Db): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) await db.query(statement);
}

/**
 * Wraps a Db so the schema is created lazily on first use and only once per process. A failed
 * attempt is not memoized, so a transient database outage at cold start doesn't wedge the instance.
 */
export function withSchema(db: Db): Db {
  let ready: Promise<void> | undefined;
  return {
    async query<T>(text: string, params?: unknown[]) {
      ready ??= ensureSchema(db).catch((err: unknown) => {
        ready = undefined;
        throw err;
      });
      await ready;
      return db.query<T>(text, params);
    },
  };
}
