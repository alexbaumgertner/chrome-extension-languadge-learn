import { z } from "zod";

export const LevelSchema = z.enum(["A1-A2", "B1-B2", "C1+"]);

export const TranslationDensitySchema = z.enum(["low", "medium", "max"]);

export const SiteStatusSchema = z.enum(["enabled", "disabled", "undecided"]);

export const VocabStatusSchema = z.enum(["new", "active", "due", "learned"]);

export const ExerciseKindSchema = z.enum([
  "fill-blank",
  "multiple-choice",
  "word-pairing",
  "audio-dictation",
]);

export const LearnerSettingsSchema = z.object({
  level: LevelSchema,
  currentTopic: z.string().min(1),
  translationDensity: TranslationDensitySchema,
});

export const SiteRuleSchema = z.object({
  hostname: z.string().min(1),
  status: SiteStatusSchema,
  grantedPermissionOrigin: z.string().nullable(),
});

export const VocabularyItemSchema = z.object({
  id: z.string().min(1),
  german: z.string().min(1),
  russian: z.string().min(1),
  encounterCount: z.number().int().nonnegative(),
  status: VocabStatusSchema,
  firstEncounteredAt: z.number().int().nonnegative(),
});

export const ReviewQueueEntrySchema = z.object({
  vocabId: z.string().min(1),
  repetitions: z.number().int().nonnegative(),
  intervalDays: z.number().int().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate must be YYYY-MM-DD"),
});

export const TopicAccuracySchema = z.object({
  correct: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const ProgressProfileSchema = z.object({
  currentStreak: z.number().int().nonnegative(),
  lastSolvedLocalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "lastSolvedLocalDate must be YYYY-MM-DD"),
  activeVocabCount: z.number().int().nonnegative(),
  topicAccuracy: z.record(z.string(), TopicAccuracySchema),
  solvedTodayCount: z.number().int().nonnegative(),
});

const MarkedVocabSpanSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  vocabId: z.string().min(1),
});

export const GermanVariantSchema = z
  .object({
    id: z.string().min(1),
    contentHash: z.string().min(1),
    level: LevelSchema,
    topic: z.string().min(1),
    text: z.string().min(1),
    markedVocab: z.array(MarkedVocabSpanSchema),
    fetchedAt: z.number().int().nonnegative(),
  })
  .refine(
    (variant) =>
      variant.markedVocab.every((span) => span.start < span.end && span.end <= variant.text.length),
    { message: "markedVocab spans must be in-bounds with start < end" },
  )
  .refine(
    (variant) => {
      const sorted = [...variant.markedVocab].sort((a, b) => a.start - b.start);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (prev && curr && curr.start < prev.end) return false;
      }
      return true;
    },
    { message: "markedVocab spans must not overlap" },
  );

export const ExerciseAttemptSchema = z.object({
  exerciseId: z.string().min(1),
  submittedAnswer: z.union([z.string(), z.number(), z.record(z.string(), z.string())]),
  correct: z.boolean(),
  affectedVocabIds: z.array(z.string()),
  topic: z.string().min(1),
  timestamp: z.number().int().nonnegative(),
});

const ExerciseBaseSchema = z.object({
  id: z.string().min(1),
  sourceParagraphHash: z.string().min(1),
  answered: z.boolean(),
  lastAttempt: ExerciseAttemptSchema.nullable(),
});

export const FillBlankExerciseSchema = ExerciseBaseSchema.extend({
  kind: z.literal("fill-blank"),
  sourceSentence: z.string().min(1),
  prompt: z.object({ blankedSentence: z.string().min(1) }),
  correctAnswer: z.string().min(1),
});

export const MultipleChoiceExerciseSchema = ExerciseBaseSchema.extend({
  kind: z.literal("multiple-choice"),
  sourceSentence: z.string().min(1),
  prompt: z.object({
    blankedSentence: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
  }),
  correctAnswer: z.number().int().nonnegative(),
});

export const WordPairingExerciseSchema = ExerciseBaseSchema.extend({
  kind: z.literal("word-pairing"),
  sourceSentence: z.string(),
  prompt: z.object({
    pairs: z.array(z.object({ german: z.string().min(1), russian: z.string().min(1) })).min(1),
  }),
  correctAnswer: z.record(z.string(), z.string()),
});

export const AudioDictationExerciseSchema = ExerciseBaseSchema.extend({
  kind: z.literal("audio-dictation"),
  sourceSentence: z.string().min(1),
  prompt: z.object({ audioSentence: z.string().min(1) }),
  correctAnswer: z.string().min(1),
});

export const ExerciseSchema = z.discriminatedUnion("kind", [
  FillBlankExerciseSchema,
  MultipleChoiceExerciseSchema,
  WordPairingExerciseSchema,
  AudioDictationExerciseSchema,
]);

export const ExerciseSetSchema = z.array(ExerciseSchema).min(0).max(4);
