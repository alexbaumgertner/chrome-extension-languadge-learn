import type { VocabularyItem } from "@sprachweise/shared";
import { getAllVocabulary, upsertVocabularyItem } from "@/lib/storage/progress";

export function vocabIdFor(german: string): string {
  return german.trim().toLowerCase();
}

/**
 * Upserts a VocabularyItem for each marked span, incrementing encounterCount
 * exactly once. Callers only invoke this on a fresh translation (cache miss),
 * which is what makes "once per paragraph, not per repeated view" hold
 * (data-model.md Vocabulary Item validation rule) without needing separate
 * session-tracking state.
 */
export async function recordVocabEncounters(
  spans: Array<{ german: string; russian: string }>,
  now: number,
): Promise<Record<string, string>> {
  const existing = await getAllVocabulary();
  const germanToId: Record<string, string> = {};

  for (const span of spans) {
    const id = vocabIdFor(span.german);
    germanToId[span.german] = id;
    const prior = existing[id];
    const item: VocabularyItem = prior
      ? {
          ...prior,
          encounterCount: prior.encounterCount + 1,
          status: prior.status === "new" ? "active" : prior.status,
        }
      : {
          id,
          german: span.german,
          russian: span.russian,
          encounterCount: 1,
          status: "active",
          firstEncounteredAt: now,
        };
    existing[id] = item;
    await upsertVocabularyItem(item);
  }

  return germanToId;
}
