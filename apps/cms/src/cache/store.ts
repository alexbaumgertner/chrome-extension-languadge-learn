import type Database from "better-sqlite3";

export interface CachedTranslation {
  text: string;
  markedVocab: Array<{ start: number; end: number; german: string; russian: string }>;
}

interface CacheEntryRow {
  result_text: string;
  marked_vocab_json: string;
}

export function getCacheEntry(db: Database.Database, key: string): CachedTranslation | undefined {
  const row = db
    .prepare("SELECT result_text, marked_vocab_json FROM cache_entries WHERE cache_key = ?")
    .get(key) as CacheEntryRow | undefined;
  if (!row) return undefined;
  return {
    text: row.result_text,
    markedVocab: JSON.parse(row.marked_vocab_json) as CachedTranslation["markedVocab"],
  };
}

/** Write-once: never updates or deletes an existing row (FR-004 — indefinite persistence, no eviction). */
export function putCacheEntry(db: Database.Database, key: string, entry: CachedTranslation): void {
  db.prepare(
    "INSERT OR IGNORE INTO cache_entries (cache_key, result_text, marked_vocab_json, created_at) VALUES (?, ?, ?, ?)",
  ).run(key, entry.text, JSON.stringify(entry.markedVocab), new Date().toISOString());
}
