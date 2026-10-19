import type { Db } from "../db";

export interface CachedTranslation {
  text: string;
  markedVocab: Array<{ start: number; end: number; german: string; russian: string }>;
}

interface CacheEntryRow {
  result_text: string;
  marked_vocab: CachedTranslation["markedVocab"];
}

export async function getCacheEntry(db: Db, key: string): Promise<CachedTranslation | undefined> {
  const [row] = await db.query<CacheEntryRow>(
    "SELECT result_text, marked_vocab FROM cache_entries WHERE cache_key = $1",
    [key],
  );
  if (!row) return undefined;
  return { text: row.result_text, markedVocab: row.marked_vocab };
}

/** Write-once: never updates or deletes an existing row (FR-004 — indefinite persistence, no eviction). */
export async function putCacheEntry(db: Db, key: string, entry: CachedTranslation): Promise<void> {
  await db.query(
    `INSERT INTO cache_entries (cache_key, result_text, marked_vocab) VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (cache_key) DO NOTHING`,
    [key, entry.text, JSON.stringify(entry.markedVocab)],
  );
}
