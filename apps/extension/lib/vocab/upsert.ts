import type { VocabularyItem } from "@sprachweise/shared";
import { extractContextSentence } from "@/lib/review/context";
import { getAllVocabulary, upsertVocabularyItem } from "@/lib/storage/progress";

export function vocabIdFor(german: string): string {
  return german.trim().toLowerCase();
}

/**
 * Upserts a VocabularyItem for each marked span, incrementing encounterCount
 * exactly once. Callers only invoke this on a fresh translation (cache miss),
 * which is what makes "once per paragraph, not per repeated view" hold
 * (data-model.md Vocabulary Item validation rule) without needing separate
 * session-tracking state. Each item also keeps the sentence of `text` it was last seen in, for the
 * review session's fill-the-blank.
 */
export async function recordVocabEncounters(
  spans: Array<{ german: string; lemma?: string; russian: string; start: number; end: number }>,
  now: number,
  text: string,
): Promise<Record<string, string>> {
  const existing = await getAllVocabulary();
  const germanToId: Record<string, string> = {};

  for (const span of spans) {
    // The vocabulary stores the dictionary form, so "Termin" and "Termine" are one item.
    const headword = span.lemma ?? span.german;
    const id = vocabIdFor(headword);
    germanToId[span.german] = id;
    const prior = existing[id];
    const { sentence, form } = extractContextSentence(text, span.start, span.end);
    const context = sentence && form ? { contextSentence: sentence, contextForm: form } : undefined;
    const item: VocabularyItem = prior
      ? {
          ...prior,
          encounterCount: prior.encounterCount + 1,
          status: prior.status === "new" ? "active" : prior.status,
          ...context,
        }
      : {
          id,
          german: headword,
          russian: span.russian,
          encounterCount: 1,
          status: "active",
          firstEncounteredAt: now,
          ...context,
        };
    existing[id] = item;
    await upsertVocabularyItem(item);
  }

  return germanToId;
}
