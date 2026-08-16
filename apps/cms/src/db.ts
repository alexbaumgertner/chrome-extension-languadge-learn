import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Config } from "./config";

export function openDb(cfg: Pick<Config, "CMS_DB_PATH">): Database.Database {
  const dir = dirname(cfg.CMS_DB_PATH);
  if (dir && dir !== ".") mkdirSync(dir, { recursive: true });

  const db = new Database(cfg.CMS_DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache_entries (
      cache_key TEXT PRIMARY KEY,
      result_text TEXT NOT NULL,
      marked_vocab_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usage_counters (
      provider TEXT NOT NULL,
      period_key TEXT NOT NULL,
      usage INTEGER NOT NULL,
      allowance INTEGER NOT NULL,
      PRIMARY KEY (provider, period_key)
    );
  `);
  return db;
}
