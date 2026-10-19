import type { z } from "zod";
import type {
  AnswerPayloadSchema,
  AnyMessageSchema,
  GetLearnerSettingsRequestSchema,
  GetLearnerSettingsResponseSchema,
  GetProgressSnapshotRequestSchema,
  GetProgressSnapshotResponseSchema,
  GetSiteRulesRequestSchema,
  GetSiteRulesResponseSchema,
  GetSiteStatusRequestSchema,
  GetSiteStatusResponseSchema,
  ReportBadTranslationRequestSchema,
  ReportBadTranslationResponseSchema,
  RequestMessageSchema,
  SetLearnerSettingsRequestSchema,
  SetLearnerSettingsResponseSchema,
  SetSiteStatusRequestSchema,
  SetSiteStatusResponseSchema,
  StorageChangedMessageSchema,
  SubmitExerciseAttemptRequestSchema,
  SubmitExerciseAttemptResponseSchema,
  TranslateParagraphRequestSchema,
  TranslateParagraphResponseSchema,
} from "../schemas/messages";
import type {
  ClientErrorCodeSchema,
  CmsExerciseSchema,
  EventsRequestSchema,
  ExercisesRequestSchema,
  ExercisesResponseSchema,
  MetricEventSchema,
  ReportRequestSchema,
  TranslateRequestSchema,
  TranslateResponseSchema,
} from "../schemas/cms";
import type {
  AudioDictationExerciseSchema,
  ExerciseAttemptSchema,
  ExerciseKindSchema,
  ExerciseSchema,
  ExerciseSetSchema,
  FillBlankExerciseSchema,
  GermanVariantSchema,
  LearnerSettingsSchema,
  LevelSchema,
  MultipleChoiceExerciseSchema,
  ProgressProfileSchema,
  ReviewQueueEntrySchema,
  SiteRuleSchema,
  SiteStatusSchema,
  TopicAccuracySchema,
  TranslationDensitySchema,
  VocabStatusSchema,
  VocabularyItemSchema,
  WordPairingExerciseSchema,
} from "../schemas/storage";

// storage.ts
export type Level = z.infer<typeof LevelSchema>;
export type TranslationDensity = z.infer<typeof TranslationDensitySchema>;
export type SiteStatus = z.infer<typeof SiteStatusSchema>;
export type VocabStatus = z.infer<typeof VocabStatusSchema>;
export type ExerciseKind = z.infer<typeof ExerciseKindSchema>;
export type LearnerSettings = z.infer<typeof LearnerSettingsSchema>;
export type SiteRule = z.infer<typeof SiteRuleSchema>;
export type VocabularyItem = z.infer<typeof VocabularyItemSchema>;
export type ReviewQueueEntry = z.infer<typeof ReviewQueueEntrySchema>;
export type TopicAccuracy = z.infer<typeof TopicAccuracySchema>;
export type ProgressProfile = z.infer<typeof ProgressProfileSchema>;
export type GermanVariant = z.infer<typeof GermanVariantSchema>;
export type ExerciseAttempt = z.infer<typeof ExerciseAttemptSchema>;
export type FillBlankExercise = z.infer<typeof FillBlankExerciseSchema>;
export type MultipleChoiceExercise = z.infer<typeof MultipleChoiceExerciseSchema>;
export type WordPairingExercise = z.infer<typeof WordPairingExerciseSchema>;
export type AudioDictationExercise = z.infer<typeof AudioDictationExerciseSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type ExerciseSet = z.infer<typeof ExerciseSetSchema>;

// messages.ts
export type AnswerPayload = z.infer<typeof AnswerPayloadSchema>;
export type TranslateParagraphRequest = z.infer<typeof TranslateParagraphRequestSchema>;
export type TranslateParagraphResponse = z.infer<typeof TranslateParagraphResponseSchema>;
export type ReportBadTranslationRequest = z.infer<typeof ReportBadTranslationRequestSchema>;
export type ReportBadTranslationResponse = z.infer<typeof ReportBadTranslationResponseSchema>;
export type SubmitExerciseAttemptRequest = z.infer<typeof SubmitExerciseAttemptRequestSchema>;
export type SubmitExerciseAttemptResponse = z.infer<typeof SubmitExerciseAttemptResponseSchema>;
export type GetSiteStatusRequest = z.infer<typeof GetSiteStatusRequestSchema>;
export type GetSiteStatusResponse = z.infer<typeof GetSiteStatusResponseSchema>;
export type SetSiteStatusRequest = z.infer<typeof SetSiteStatusRequestSchema>;
export type SetSiteStatusResponse = z.infer<typeof SetSiteStatusResponseSchema>;
export type GetLearnerSettingsRequest = z.infer<typeof GetLearnerSettingsRequestSchema>;
export type GetLearnerSettingsResponse = z.infer<typeof GetLearnerSettingsResponseSchema>;
export type SetLearnerSettingsRequest = z.infer<typeof SetLearnerSettingsRequestSchema>;
export type SetLearnerSettingsResponse = z.infer<typeof SetLearnerSettingsResponseSchema>;
export type GetProgressSnapshotRequest = z.infer<typeof GetProgressSnapshotRequestSchema>;
export type GetProgressSnapshotResponse = z.infer<typeof GetProgressSnapshotResponseSchema>;
export type GetSiteRulesRequest = z.infer<typeof GetSiteRulesRequestSchema>;
export type GetSiteRulesResponse = z.infer<typeof GetSiteRulesResponseSchema>;
export type StorageChangedMessage = z.infer<typeof StorageChangedMessageSchema>;
export type RequestMessage = z.infer<typeof RequestMessageSchema>;
export type AnyMessage = z.infer<typeof AnyMessageSchema>;

// cms.ts
export type CmsTranslateRequest = z.infer<typeof TranslateRequestSchema>;
export type CmsTranslateResponse = z.infer<typeof TranslateResponseSchema>;
export type CmsExercisesRequest = z.infer<typeof ExercisesRequestSchema>;
export type CmsExercise = z.infer<typeof CmsExerciseSchema>;
export type CmsExercisesResponse = z.infer<typeof ExercisesResponseSchema>;
export type ClientErrorCode = z.infer<typeof ClientErrorCodeSchema>;
export type MetricEvent = z.infer<typeof MetricEventSchema>;
export type EventsRequest = z.infer<typeof EventsRequestSchema>;
export type ReportRequest = z.infer<typeof ReportRequestSchema>;
