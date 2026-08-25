import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  ExerciseSetSchema,
  GermanVariantSchema,
  type Exercise,
  type GermanVariant,
  type Level,
} from "@sprachweise/shared";

const DB_NAME = "sprachweise-content-cache";
const DB_VERSION = 1;

interface ContentCacheSchema extends DBSchema {
  variants: {
    key: string;
    value: GermanVariant;
  };
  exercises: {
    key: string;
    value: Exercise[];
  };
  ttsAudio: {
    key: string;
    value: { blob: Blob; mimeType: string };
  };
}

let dbPromise: Promise<IDBPDatabase<ContentCacheSchema>> | undefined;

function getDb(): Promise<IDBPDatabase<ContentCacheSchema>> {
  dbPromise ??= openDB<ContentCacheSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("variants")) db.createObjectStore("variants");
      if (!db.objectStoreNames.contains("exercises")) db.createObjectStore("exercises");
      if (!db.objectStoreNames.contains("ttsAudio")) db.createObjectStore("ttsAudio");
    },
  });
  return dbPromise;
}

export function contentCacheKey(contentHash: string, level: Level, topic: string): string {
  return `${contentHash}:${level}:${topic}`;
}

export function ttsCacheKey(
  contentHash: string,
  level: Level,
  topic: string,
  rate: "normal" | "slow",
): string {
  return `${contentCacheKey(contentHash, level, topic)}:${rate}`;
}

export async function getCachedVariant(key: string): Promise<GermanVariant | undefined> {
  const db = await getDb();
  const raw = await db.get("variants", key);
  if (raw === undefined) return undefined;
  const result = GermanVariantSchema.safeParse(raw);
  return result.success ? result.data : undefined;
}

export async function putCachedVariant(key: string, variant: GermanVariant): Promise<void> {
  const validated = GermanVariantSchema.parse(variant);
  const db = await getDb();
  await db.put("variants", validated, key);
}

export async function getCachedExercises(key: string): Promise<Exercise[] | undefined> {
  const db = await getDb();
  const raw = await db.get("exercises", key);
  if (raw === undefined) return undefined;
  const result = ExerciseSetSchema.safeParse(raw);
  return result.success ? result.data : undefined;
}

/** Overwritten, never merged — regenerated whenever the paragraph is retranslated. */
export async function putCachedExercises(key: string, exercises: Exercise[]): Promise<void> {
  const validated = ExerciseSetSchema.parse(exercises);
  const db = await getDb();
  await db.put("exercises", validated, key);
}

/** Scans every cached exercise set for the given id — attempts only carry an exerciseId, not its cache key. */
export async function findExerciseById(
  exerciseId: string,
): Promise<{ cacheKey: string; exercise: Exercise } | undefined> {
  const db = await getDb();
  const keys = await db.getAllKeys("exercises");
  for (const key of keys) {
    const set = await db.get("exercises", key);
    const found = set?.find((ex) => ex.id === exerciseId);
    if (found) return { cacheKey: key, exercise: found };
  }
  return undefined;
}

/** Marks a single cached exercise answered, preserving the rest of its set (FR-012 — state survives panel collapse/reopen). */
export async function markExerciseAnswered(
  cacheKey: string,
  exerciseId: string,
  lastAttempt: Exercise["lastAttempt"],
): Promise<void> {
  const db = await getDb();
  const set = await db.get("exercises", cacheKey);
  if (!set) return;
  const next = set.map((ex) =>
    ex.id === exerciseId ? { ...ex, answered: true, lastAttempt } : ex,
  );
  await db.put("exercises", ExerciseSetSchema.parse(next), cacheKey);
}

export async function getCachedTtsAudio(
  key: string,
): Promise<{ blob: Blob; mimeType: string } | undefined> {
  const db = await getDb();
  return db.get("ttsAudio", key);
}

/** Populated lazily, only when a dictation exercise is actually played — never prefetched. */
export async function putCachedTtsAudio(key: string, blob: Blob, mimeType: string): Promise<void> {
  const db = await getDb();
  await db.put("ttsAudio", { blob, mimeType }, key);
}
