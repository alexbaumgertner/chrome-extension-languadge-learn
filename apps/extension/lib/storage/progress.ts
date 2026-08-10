import {
  ProgressProfileSchema,
  ReviewQueueEntrySchema,
  VocabularyItemSchema,
  type ProgressProfile,
  type ReviewQueueEntry,
  type VocabularyItem,
} from "@sprachweise/shared";
import { z } from "zod";
import { advance, formatLocalDate } from "@/lib/srs/scheduler";
import { applySolve } from "@/lib/progress/logic";

const VOCABULARY_KEY = "vocabulary";
const REVIEW_QUEUE_KEY = "reviewQueue";
const PROGRESS_KEY = "progress";

const VocabularyRecordSchema = z.record(z.string(), VocabularyItemSchema);
const ReviewQueueRecordSchema = z.record(z.string(), ReviewQueueEntrySchema);

export const DEFAULT_PROGRESS_PROFILE: ProgressProfile = {
  currentStreak: 0,
  lastSolvedLocalDate: "1970-01-01",
  activeVocabCount: 0,
  topicAccuracy: {},
  solvedTodayCount: 0,
};

export async function getAllVocabulary(): Promise<Record<string, VocabularyItem>> {
  const stored = await chrome.storage.local.get(VOCABULARY_KEY);
  const raw = stored[VOCABULARY_KEY];
  if (raw === undefined) return {};
  const result = VocabularyRecordSchema.safeParse(raw);
  return result.success ? result.data : {};
}

export async function upsertVocabularyItem(item: VocabularyItem): Promise<void> {
  const validated = VocabularyItemSchema.parse(item);
  const vocab = await getAllVocabulary();
  vocab[validated.id] = validated;
  await chrome.storage.local.set({ [VOCABULARY_KEY]: vocab });
}

export async function getAllReviewQueue(): Promise<Record<string, ReviewQueueEntry>> {
  const stored = await chrome.storage.local.get(REVIEW_QUEUE_KEY);
  const raw = stored[REVIEW_QUEUE_KEY];
  if (raw === undefined) return {};
  const result = ReviewQueueRecordSchema.safeParse(raw);
  return result.success ? result.data : {};
}

export async function upsertReviewQueueEntry(entry: ReviewQueueEntry): Promise<void> {
  const validated = ReviewQueueEntrySchema.parse(entry);
  const queue = await getAllReviewQueue();
  queue[validated.vocabId] = validated;
  await chrome.storage.local.set({ [REVIEW_QUEUE_KEY]: queue });
}

export async function getProgressProfile(): Promise<ProgressProfile> {
  const stored = await chrome.storage.local.get(PROGRESS_KEY);
  const raw = stored[PROGRESS_KEY];
  if (raw === undefined) return DEFAULT_PROGRESS_PROFILE;
  const result = ProgressProfileSchema.safeParse(raw);
  return result.success ? result.data : DEFAULT_PROGRESS_PROFILE;
}

export async function setProgressProfile(profile: ProgressProfile): Promise<void> {
  const validated = ProgressProfileSchema.parse(profile);
  await chrome.storage.local.set({ [PROGRESS_KEY]: validated });
}

export interface RecordAttemptInput {
  correct: boolean;
  affectedVocabIds: string[];
  topic: string;
  timestamp: number;
}

/**
 * Applies one exercise attempt's effects: advances each affected word's SRS
 * entry, derives its display status from the resulting review state,
 * updates streak/topic-accuracy, and recomputes activeVocabCount — all in
 * one atomic pass, returning the fresh Progress Profile (messaging-contract.md
 * SUBMIT_EXERCISE_ATTEMPT response).
 */
export async function recordAttempt(attempt: RecordAttemptInput): Promise<ProgressProfile> {
  const today = formatLocalDate(new Date(attempt.timestamp));

  const vocab = await getAllVocabulary();
  const reviewQueue = await getAllReviewQueue();

  for (const vocabId of attempt.affectedVocabIds) {
    const priorEntry = reviewQueue[vocabId] ?? {
      vocabId,
      repetitions: 0,
      intervalDays: 1,
      dueDate: today,
    };
    const nextEntry = advance(priorEntry, attempt.correct, today);
    reviewQueue[vocabId] = nextEntry;

    const priorItem = vocab[vocabId];
    if (priorItem) {
      const status =
        nextEntry.repetitions >= 5 ? "learned" : nextEntry.dueDate <= today ? "due" : "active";
      vocab[vocabId] = { ...priorItem, status };
    }
  }

  if (attempt.affectedVocabIds.length > 0) {
    await chrome.storage.local.set({ [REVIEW_QUEUE_KEY]: reviewQueue, [VOCABULARY_KEY]: vocab });
  }

  const activeVocabCount = Object.values(vocab).filter(
    (item) => item.status === "active" || item.status === "due" || item.status === "learned",
  ).length;

  const priorProfile = await getProgressProfile();
  const nextProfile: ProgressProfile = {
    ...applySolve(priorProfile, today, attempt.correct, attempt.topic),
    activeVocabCount,
  };
  await setProgressProfile(nextProfile);
  return nextProfile;
}
