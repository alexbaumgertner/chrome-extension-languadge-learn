import { z } from "zod";
import { ClientErrorCodeSchema, isSafeHtmlSubset } from "./cms";
import { ExplainResponseSchema } from "./explain";
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

/** Longest fragment a side-panel tool takes from a selection; longer ones are cut. */
export const SELECTION_MAX_CHARS = 600;

export const SelectionToolSchema = z.enum(["translate", "speak", "explain"]);

/**
 * The selected fragment as the side panel receives it. `id` is new for every menu choice, so the
 * panel can tell a repeat of the same message from a new choice on the same text.
 */
export const SelectionPayloadSchema = z.object({
  id: z.string().min(1),
  tool: SelectionToolSchema,
  text: z.string().min(1).max(SELECTION_MAX_CHARS),
  /** The selection was longer than SELECTION_MAX_CHARS and `text` is its start. */
  truncated: z.boolean(),
});

/** Background → side panel after a menu choice. */
export const SelectionToolMessageSchema = z.object({
  type: z.literal("SELECTION_TOOL"),
  selection: SelectionPayloadSchema,
});

/** Side panel → background on open: the last choice, in case it was sent before the panel listened. */
export const GetPendingSelectionRequestSchema = z.object({
  type: z.literal("GET_PENDING_SELECTION"),
});

export const GetPendingSelectionResponseSchema = z.object({
  selection: SelectionPayloadSchema.nullable(),
});

/** Side panel → background: translate this fragment at the learner's current level. */
export const TranslateSelectionRequestSchema = z.object({
  type: z.literal("TRANSLATE_SELECTION"),
  text: z.string().min(1).max(SELECTION_MAX_CHARS),
});

export const TranslateSelectionResponseSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      /** Safe-subset HTML (bare strong/em tags), as in a paragraph variant. */
      text: z.string().min(1),
      /** Glossed words, offsets into `text`; ordered, not overlapping. */
      spans: z.array(
        z.object({
          start: z.number().int().nonnegative(),
          end: z.number().int().positive(),
          russian: z.string().min(1),
        }),
      ),
    })
    .refine((res) => isSafeHtmlSubset(res.text), { message: "text must be the safe HTML subset" })
    .refine(
      (res) => {
        let prevEnd = 0;
        return res.spans.every((s) => {
          const ok = s.start >= prevEnd && s.start < s.end && s.end <= res.text.length;
          prevEnd = s.end;
          return ok;
        });
      },
      { message: "spans must be ordered, non-overlapping and inside the text" },
    ),
  z.object({
    ok: z.literal(false),
    reason: z.enum(["offline", "unavailable", "limit", "too-long", "failed"]),
  }),
]);

/** Side panel to background: explain this fragment (translation, word breakdown, grammar). */
export const ExplainSelectionRequestSchema = z.object({
  type: z.literal("EXPLAIN_SELECTION"),
  text: z.string().min(1).max(SELECTION_MAX_CHARS),
});

export const ExplainSelectionResponseSchema = z.union([
  z.object({ ok: z.literal(true), explanation: ExplainResponseSchema }),
  z.object({
    ok: z.literal(false),
    reason: z.enum(["offline", "unavailable", "limit", "too-long", "failed"]),
  }),
]);

/** Side panel to background: put a word's dictionary form in the vocabulary with an SRS card. */
export const AddToVocabularyRequestSchema = z.object({
  type: z.literal("ADD_TO_VOCABULARY"),
  lemma: z.string().min(1).max(100),
  russian: z.string().min(1).max(200),
});

export const AddToVocabularyResponseSchema = z.object({ ok: z.literal(true) });

/** Every message sent from content/popup/options/side panel to the background router. */
export const RequestMessageSchema = z.discriminatedUnion("type", [
  TranslateParagraphRequestSchema,
  SubmitExerciseAttemptRequestSchema,
  GetLearnerSettingsRequestSchema,
  SetLearnerSettingsRequestSchema,
  GetProgressSnapshotRequestSchema,
  ReportBadTranslationRequestSchema,
  TranslationsChangedMessageSchema,
  RecordClientErrorRequestSchema,
  GetPendingSelectionRequestSchema,
  TranslateSelectionRequestSchema,
  ExplainSelectionRequestSchema,
  AddToVocabularyRequestSchema,
]);

/** Every message crossing a chrome.runtime boundary, including the background-originated broadcast. */
export const AnyMessageSchema = z.discriminatedUnion("type", [
  TranslateParagraphRequestSchema,
  SubmitExerciseAttemptRequestSchema,
  GetLearnerSettingsRequestSchema,
  SetLearnerSettingsRequestSchema,
  GetProgressSnapshotRequestSchema,
  ReportBadTranslationRequestSchema,
  TranslationsChangedMessageSchema,
  RecordClientErrorRequestSchema,
  GetPendingSelectionRequestSchema,
  TranslateSelectionRequestSchema,
  ExplainSelectionRequestSchema,
  AddToVocabularyRequestSchema,
  StorageChangedMessageSchema,
  PageActionMessageSchema,
  SelectionToolMessageSchema,
]);
