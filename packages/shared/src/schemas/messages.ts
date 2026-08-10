import { z } from "zod";
import {
  ExerciseSchema,
  GermanVariantSchema,
  LearnerSettingsSchema,
  LevelSchema,
  ProgressProfileSchema,
  ReviewQueueEntrySchema,
  SiteRuleSchema,
  SiteStatusSchema,
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
    reason: z.enum(["fetch-failed", "offline-no-cache"]),
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

export const GetSiteStatusRequestSchema = z.object({
  type: z.literal("GET_SITE_STATUS"),
  hostname: z.string().min(1),
});

export const GetSiteStatusResponseSchema = z.object({
  status: SiteStatusSchema,
});

export const SetSiteStatusRequestSchema = z.object({
  type: z.literal("SET_SITE_STATUS"),
  hostname: z.string().min(1),
  status: z.enum(["enabled", "disabled"]),
});

export const SetSiteStatusResponseSchema = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), reason: z.literal("permission-denied") }),
]);

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

/**
 * Not in the original contract draft — added per research.md §8 / T038: the
 * content script never talks to the network or IndexedDB directly, so
 * playing dictation audio (cache-or-fetch) has to round-trip through
 * background like every other CMS-backed capability.
 */
export const PlayTtsRequestSchema = z.object({
  type: z.literal("PLAY_TTS"),
  sentence: z.string().min(1),
  rate: z.enum(["normal", "slow"]),
  contentHash: z.string().min(1),
  level: LevelSchema,
  topic: z.string().min(1),
});

export const PlayTtsResponseSchema = z.union([
  z.object({ ok: z.literal(true), audioDataUrl: z.string().min(1), mimeType: z.string().min(1) }),
  z.object({ ok: z.literal(false), reason: z.enum(["fetch-failed", "offline-no-cache"]) }),
]);

/**
 * Not in the original contract draft — added for the options page's Site
 * Rules view (T059): it needs to list every known Site Rule, not just check
 * one hostname, and per the storage-access architecture only background may
 * read chrome.storage directly.
 */
export const GetSiteRulesRequestSchema = z.object({
  type: z.literal("GET_SITE_RULES"),
});

export const GetSiteRulesResponseSchema = z.object({
  siteRules: z.record(z.string(), SiteRuleSchema),
});

export const StorageChangedMessageSchema = z.object({
  type: z.literal("STORAGE_CHANGED"),
  slice: z.enum(["progress", "settings", "siteRules", "vocab"]),
});

/** Every message sent from content/popup/options to the background router. */
export const RequestMessageSchema = z.discriminatedUnion("type", [
  TranslateParagraphRequestSchema,
  SubmitExerciseAttemptRequestSchema,
  GetSiteStatusRequestSchema,
  SetSiteStatusRequestSchema,
  GetLearnerSettingsRequestSchema,
  SetLearnerSettingsRequestSchema,
  GetProgressSnapshotRequestSchema,
  PlayTtsRequestSchema,
  GetSiteRulesRequestSchema,
]);

/** Every message crossing a chrome.runtime boundary, including the background-originated broadcast. */
export const AnyMessageSchema = z.discriminatedUnion("type", [
  TranslateParagraphRequestSchema,
  SubmitExerciseAttemptRequestSchema,
  GetSiteStatusRequestSchema,
  SetSiteStatusRequestSchema,
  GetLearnerSettingsRequestSchema,
  SetLearnerSettingsRequestSchema,
  GetProgressSnapshotRequestSchema,
  PlayTtsRequestSchema,
  GetSiteRulesRequestSchema,
  StorageChangedMessageSchema,
]);
