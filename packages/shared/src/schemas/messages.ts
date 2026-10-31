import { z } from "zod";
import { ClientErrorCodeSchema } from "./cms";
import {
  ExerciseSchema,
  GermanVariantSchema,
  LearnerSettingsSchema,
  LevelSchema,
  ProgressProfileSchema,
  ReviewQueueEntrySchema,
  VocabularyItemSchema,
} from "./storage";

export const TranslateParagraphRequestSchema = z.object({
  type: z.literal("TRANSLATE_PARAGRAPH"),
  contentHash: z.string().min(1),
  paragraphText: z.string().min(1),
  level: LevelSchema,
  topic: z.string().min(1),
});

export const TranslateParagraphResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    variant: GermanVariantSchema,
    exercises: z.array(ExerciseSchema),
  }),
  z.object({
    ok: z.literal(false),
    /**
     * What the learner is told: `offline` no network (and nothing cached); `unavailable` the
     * service can't be reached, refused the response (CORS) or failed (5xx); `limit` the daily
     * allowance is used up; `too-long` over TRANSLATE_MAX_CHARS; `failed` anything else.
     */
    reason: z.enum(["offline", "unavailable", "limit", "too-long", "failed"]),
  }),
]);

export const AnswerPayloadSchema = z.union([
  z.string(),
  z.number(),
  z.record(z.string(), z.string()),
]);

export const SubmitExerciseAttemptRequestSchema = z.object({
  type: z.literal("SUBMIT_EXERCISE_ATTEMPT"),
  exerciseId: z.string().min(1),
  submittedAnswer: AnswerPayloadSchema,
  sourceParagraphHash: z.string().min(1),
  affectedVocabIds: z.array(z.string()),
  topic: z.string().min(1),
});

export const SubmitExerciseAttemptResponseSchema = z.object({
  ok: z.literal(true),
  correct: z.boolean(),
  updatedProgress: ProgressProfileSchema,
});

/**
 * Options page -> background after a word in the review session was answered. The page grades
 * locally (no exercise is stored for a review), the background applies the SRS/streak/accuracy
 * update through the same path as an exercise on a page.
 */
export const SubmitReviewAttemptRequestSchema = z.object({
  type: z.literal("SUBMIT_REVIEW_ATTEMPT"),
  vocabId: z.string().min(1),
  correct: z.boolean(),
});

export const SubmitReviewAttemptResponseSchema = z.object({
  ok: z.literal(true),
  updatedProgress: ProgressProfileSchema,
});

export const GetLearnerSettingsRequestSchema = z.object({
  type: z.literal("GET_LEARNER_SETTINGS"),
});

export const GetLearnerSettingsResponseSchema = LearnerSettingsSchema;

export const SetLearnerSettingsRequestSchema = z.object({
  type: z.literal("SET_LEARNER_SETTINGS"),
  settings: LearnerSettingsSchema,
});

export const SetLearnerSettingsResponseSchema = z.object({ ok: z.literal(true) });

export const GetProgressSnapshotRequestSchema = z.object({
  type: z.literal("GET_PROGRESS_SNAPSHOT"),
});

export const GetProgressSnapshotResponseSchema = z.object({
  profile: ProgressProfileSchema,
  vocab: z.array(VocabularyItemSchema),
  reviewQueue: z.array(ReviewQueueEntrySchema),
});

/** Content → background on the "Плохой перевод" click; background adds output, level, density, model. */
export const ReportBadTranslationRequestSchema = z.object({
  type: z.literal("REPORT_BAD_TRANSLATION"),
  variantId: z.string().min(1),
  sourceText: z.string().min(1),
});

export const ReportBadTranslationResponseSchema = z.object({ ok: z.boolean() });

export const StorageChangedMessageSchema = z.object({
  type: z.literal("STORAGE_CHANGED"),
  slice: z.enum(["progress", "settings", "vocab"]),
});

/**
 * Content → background: something on the page was translated or restored, so the "Restore
 * original" menu item may need to appear or hide. The background asks the active tab itself.
 */
export const TranslationsChangedMessageSchema = z.object({
  type: z.literal("TRANSLATIONS_CHANGED"),
});

/** Content → background: a failure that never reached the network (e.g. an over-long selection). */
export const RecordClientErrorRequestSchema = z.object({
  type: z.literal("RECORD_CLIENT_ERROR"),
  error: ClientErrorCodeSchema,
});

/**
 * Background → content, after the context menu or keyboard shortcut: `translate-selection`
 * translates the current selection, `restore` restores everything translated on the page,
 * `status` only answers (also tells the background the script is already running).
 */
export const PageActionMessageSchema = z.object({
  type: z.literal("PAGE_ACTION"),
  action: z.enum(["status", "translate-selection", "restore"]),
});

export const PageActionResponseSchema = z.object({
  ok: z.literal(true),
  hasTranslations: z.boolean(),
});

/** Every message sent from content/popup/options to the background router. */
export const RequestMessageSchema = z.discriminatedUnion("type", [
  TranslateParagraphRequestSchema,
  SubmitExerciseAttemptRequestSchema,
  SubmitReviewAttemptRequestSchema,
  GetLearnerSettingsRequestSchema,
  SetLearnerSettingsRequestSchema,
  GetProgressSnapshotRequestSchema,
  ReportBadTranslationRequestSchema,
  TranslationsChangedMessageSchema,
  RecordClientErrorRequestSchema,
]);

/** Every message crossing a chrome.runtime boundary, including the background-originated broadcast. */
export const AnyMessageSchema = z.discriminatedUnion("type", [
  TranslateParagraphRequestSchema,
  SubmitExerciseAttemptRequestSchema,
  SubmitReviewAttemptRequestSchema,
  GetLearnerSettingsRequestSchema,
  SetLearnerSettingsRequestSchema,
  GetProgressSnapshotRequestSchema,
  ReportBadTranslationRequestSchema,
  TranslationsChangedMessageSchema,
  RecordClientErrorRequestSchema,
  StorageChangedMessageSchema,
  PageActionMessageSchema,
]);
