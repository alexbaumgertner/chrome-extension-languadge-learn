import type { VocabularyItem } from "@sprachweise/shared";
import { formatLocalDate } from "@/lib/srs/scheduler";
import {
  getAllReviewQueue,
  getAllVocabulary,
  upsertReviewQueueEntry,
  upsertVocabularyItem,
} from "@/lib/storage/progress";
import { vocabIdFor } from "@/lib/vocab/upsert";

/**
 * "Add to vocabulary" from the explanation: puts the lemma in the vocabulary and gives it a review
 * card due today. A word the learner already has keeps its record (and its schedule); it only
 * gets a card if it has none. Calling it twice changes nothing.
 */
export async function addLemmaToVocabulary(
  lemma: string,
  russian: string,
  now: number = Date.now(),
): Promise<void> {
  const id = vocabIdFor(lemma);
  const vocab = await getAllVocabulary();
  const existing = vocab[id];
  if (!existing) {
    const item: VocabularyItem = {
      id,
      german: lemma.trim(),
      russian,
      encounterCount: 0,
      status: "active",
      firstEncounteredAt: now,
    };
    await upsertVocabularyItem(item);
  }
  const queue = await getAllReviewQueue();
  if (!queue[id]) {
    await upsertReviewQueueEntry({
      vocabId: id,
      repetitions: 0,
      intervalDays: 1,
      dueDate: formatLocalDate(new Date(now)),
    });
  }
}
