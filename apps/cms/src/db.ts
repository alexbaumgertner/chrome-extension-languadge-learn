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
  // One row per paid Gemini call (cache hits make none). No install ID, no text (constitution III).
  `CREATE TABLE IF NOT EXISTS provider_calls (
     id BIGSERIAL PRIMARY KEY,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     model TEXT NOT NULL,
     thinking_level TEXT NOT NULL,
     status TEXT NOT NULL,
     prompt_tokens INTEGER,
     output_tokens INTEGER,
     thoughts_tokens INTEGER,
     cost_usd NUMERIC(12, 8),
     latency_ms INTEGER NOT NULL
   )`,
  // Usage-metric events keyed by the extension's random install ID (constitution III). Day
  // granularity only, no IP, no text, no URL: nothing here can be joined to page content.
  `CREATE TABLE IF NOT EXISTS events (
     id BIGSERIAL PRIMARY KEY,
     install_id UUID NOT NULL,
     name TEXT NOT NULL,
     occurred_on DATE NOT NULL,
     cache TEXT,
     latency_ms INTEGER,
     error_code TEXT,
     http_status SMALLINT
   )`,
  // "Плохой перевод" reports, sent only on that click. No install ID, IP or URL (constitution III).
  `CREATE TABLE IF NOT EXISTS translation_reports (
     id BIGSERIAL PRIMARY KEY,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     source TEXT NOT NULL,
     output TEXT NOT NULL,
     level TEXT NOT NULL,
     density TEXT NOT NULL,
     model TEXT,
     prompt_version TEXT
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
