import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { ExplainResponseSchema, type ExplainResponse, type Level } from "@sprachweise/shared";
import { hashParagraphText } from "@/lib/dom/content-hash";

/**
 * Explanations the learner has opened, so reopening one works offline and costs nothing. Its own
 * database: the content cache's schema version stays as it is. Keyed by the fragment's hash and the
 * level (the explanation is written for that level).
 */
const DB_NAME = "sprachweise-explain-cache";

interface ExplainCacheSchema extends DBSchema {
  explanations: { key: string; value: ExplainResponse };
}

let dbPromise: Promise<IDBPDatabase<ExplainCacheSchema>> | undefined;

function getDb(): Promise<IDBPDatabase<ExplainCacheSchema>> {
  dbPromise ??= openDB<ExplainCacheSchema>(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore("explanations");
    },
  });
  return dbPromise;
}

export function explainCacheKey(text: string, level: Level): string {
  return `${hashParagraphText(text)}:${level}`;
}

/** An entry that no longer passes the schema is treated as missing. */
export async function getCachedExplanation(key: string): Promise<ExplainResponse | undefined> {
  const raw = await (await getDb()).get("explanations", key);
  if (raw === undefined) return undefined;
  const parsed = ExplainResponseSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

export async function putCachedExplanation(key: string, value: ExplainResponse): Promise<void> {
  await (await getDb()).put("explanations", ExplainResponseSchema.parse(value), key);
}
