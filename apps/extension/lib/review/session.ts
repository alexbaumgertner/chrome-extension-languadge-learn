import type { ReviewQueueEntry, VocabularyItem } from "@sprachweise/shared";
import { isLenientMatch } from "@/lib/exercises/match";

/** Words offered in one review session. */
export const SESSION_SIZE = 20;

/** The topic review attempts count under in the accuracy chart. */
export const REVIEW_TOPIC = "review";

export type ReviewExercise =
  | {
      kind: "cloze";
      vocabId: string;
      /** The sentence with the word replaced by `___`. */
      blankedSentence: string;
      answer: string;
      /** The Russian meaning, so the learner knows which word is missing. */
      hint: string;
    }
  | {
      kind: "recall";
      vocabId: string;
      german: string;
      russian: string;
    };

/** Queue entries that are due on `today` (YYYY-MM-DD) and still have a vocabulary item, oldest first. */
function dueEntries(
  queue: Iterable<ReviewQueueEntry>,
  vocab: Record<string, VocabularyItem>,
  today: string,
): ReviewQueueEntry[] {
  return [...queue]
    .filter((entry) => entry.dueDate <= today && vocab[entry.vocabId] !== undefined)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.vocabId.localeCompare(b.vocabId));
}

export function countDue(
  queue: Iterable<ReviewQueueEntry>,
  vocab: Record<string, VocabularyItem>,
  today: string,
): number {
  return dueEntries(queue, vocab, today).length;
}

/** The words of one session: the due ones, most overdue first, at most SESSION_SIZE. */
export function selectDue(
  queue: Iterable<ReviewQueueEntry>,
  vocab: Record<string, VocabularyItem>,
  today: string,
  limit: number = SESSION_SIZE,
): VocabularyItem[] {
  return dueEntries(queue, vocab, today)
    .slice(0, limit)
    .flatMap((entry) => {
      const item = vocab[entry.vocabId];
      return item ? [item] : [];
    });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BLANK = "___";

/**
 * A cloze when the stored sentence still contains the stored word form as a whole word, otherwise
 * "recall the translation". Pure: the same item always gives the same exercise.
 */
export function buildReviewExercise(item: VocabularyItem): ReviewExercise {
  const { contextSentence, contextForm } = item;
  if (contextSentence && contextForm) {
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(contextForm)}(?![\\p{L}\\p{N}])`,
      "u",
    );
    if (pattern.test(contextSentence)) {
      return {
        kind: "cloze",
        vocabId: item.id,
        blankedSentence: contextSentence.replace(pattern, BLANK),
        answer: contextForm,
        hint: item.russian,
      };
    }
  }
  return { kind: "recall", vocabId: item.id, german: item.german, russian: item.russian };
}

/** Grades a typed answer to a cloze with the same leniency as exercises on a page. */
export function gradeCloze(
  exercise: Extract<ReviewExercise, { kind: "cloze" }>,
  typed: string,
): boolean {
  return isLenientMatch(typed, exercise.answer);
}

/** Toolbar badge text: empty for nothing due, "99+" above 99. */
export function badgeText(dueCount: number): string {
  if (dueCount <= 0) return "";
  return dueCount > 99 ? "99+" : String(dueCount);
}
