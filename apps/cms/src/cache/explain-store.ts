import { ExplainResponseSchema, type ExplainResponse } from "@sprachweise/shared";
import type { Db } from "../db";

type StoredExplanation = Omit<ExplainResponse, "cache" | "model" | "promptVersion">;

/** A stored row that no longer passes the schema is treated as a miss, never served. */
export async function getExplainEntry(db: Db, key: string): Promise<StoredExplanation | undefined> {
  const [row] = await db.query<{ result: unknown }>(
    "SELECT result FROM explain_cache WHERE cache_key = $1",
    [key],
  );
  if (!row) return undefined;
  const parsed = ExplainResponseSchema.safeParse(row.result);
  return parsed.success ? parsed.data : undefined;
}

/** Write-once, like the translation cache. */
export async function putExplainEntry(
  db: Db,
  key: string,
  entry: StoredExplanation,
): Promise<void> {
  await db.query(
    `INSERT INTO explain_cache (cache_key, result) VALUES ($1, $2::jsonb)
     ON CONFLICT (cache_key) DO NOTHING`,
    [key, JSON.stringify(entry)],
  );
}
