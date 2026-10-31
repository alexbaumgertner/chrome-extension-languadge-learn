import type { z } from "zod";
import type {
  AnswerPayloadSchema,
  AnyMessageSchema,
  GetLearnerSettingsRequestSchema,
  GetLearnerSettingsResponseSchema,
  GetProgressSnapshotRequestSchema,
  GetProgressSnapshotResponseSchema,
  PageActionMessageSchema,
  PageActionResponseSchema,
  RecordClientErrorRequestSchema,
  ReportBadTranslationRequestSchema,
  ReportBadTranslationResponseSchema,
  RequestMessageSchema,
  SetLearnerSettingsRequestSchema,
  SetLearnerSettingsResponseSchema,
  StorageChangedMessageSchema,
  SubmitExerciseAttemptRequestSchema,
  SubmitExerciseAttemptResponseSchema,
  TranslateParagraphRequestSchema,
  TranslateParagraphResponseSchema,
  TranslationsChangedMessageSchema,
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
  TopicAccuracySchema,
  TranslationDensitySchema,
  VocabStatusSchema,
  VocabularyItemSchema,
  WordPairingExerciseSchema,
} from "../schemas/storage";

// storage.ts
export type Level = z.infer<typeof LevelSchema>;
export type TranslationDensity = z.infer<typeof TranslationDensitySchema>;
export type VocabStatus = z.infer<typeof VocabStatusSchema>;
export type ExerciseKind = z.infer<typeof ExerciseKindSchema>;
export type LearnerSettings = z.infer<typeof LearnerSettingsSchema>;
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
export type GetLearnerSettingsRequest = z.infer<typeof GetLearnerSettingsRequestSchema>;
export type GetLearnerSettingsResponse = z.infer<typeof GetLearnerSettingsResponseSchema>;
export type SetLearnerSettingsRequest = z.infer<typeof SetLearnerSettingsRequestSchema>;
export type SetLearnerSettingsResponse = z.infer<typeof SetLearnerSettingsResponseSchema>;
export type GetProgressSnapshotRequest = z.infer<typeof GetProgressSnapshotRequestSchema>;
export type GetProgressSnapshotResponse = z.infer<typeof GetProgressSnapshotResponseSchema>;
export type StorageChangedMessage = z.infer<typeof StorageChangedMessageSchema>;
export type TranslationsChangedMessage = z.infer<typeof TranslationsChangedMessageSchema>;
export type RecordClientErrorRequest = z.infer<typeof RecordClientErrorRequestSchema>;
export type PageActionMessage = z.infer<typeof PageActionMessageSchema>;
export type PageActionResponse = z.infer<typeof PageActionResponseSchema>;
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

// selection tools (side panel)
import type {
  GetPendingSelectionRequestSchema,
  GetPendingSelectionResponseSchema,
  SelectionPayloadSchema,
  SelectionToolMessageSchema,
  SelectionToolSchema,
  TranslateSelectionRequestSchema,
  TranslateSelectionResponseSchema,
} from "../schemas/messages";

export type SelectionTool = z.infer<typeof SelectionToolSchema>;
export type SelectionPayload = z.infer<typeof SelectionPayloadSchema>;
export type SelectionToolMessage = z.infer<typeof SelectionToolMessageSchema>;
export type GetPendingSelectionRequest = z.infer<typeof GetPendingSelectionRequestSchema>;
export type GetPendingSelectionResponse = z.infer<typeof GetPendingSelectionResponseSchema>;
export type TranslateSelectionRequest = z.infer<typeof TranslateSelectionRequestSchema>;
export type TranslateSelectionResponse = z.infer<typeof TranslateSelectionResponseSchema>;
