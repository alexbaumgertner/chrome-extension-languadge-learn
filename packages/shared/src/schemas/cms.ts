import { z } from "zod";
import { LevelSchema } from "./storage";

export const TranslateRequestSchema = z.object({
  text: z.string().min(1),
  level: LevelSchema,
  topic: z.string().min(1),
});

const CmsMarkedVocabSpanSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  german: z.string().min(1),
  russian: z.string().min(1),
});

export const TranslateResponseSchema = z
  .object({
    text: z.string().min(1),
    markedVocab: z.array(CmsMarkedVocabSpanSchema),
  })
  .refine(
    (res) => res.markedVocab.every((span) => span.start < span.end && span.end <= res.text.length),
    { message: "markedVocab spans must be in-bounds with start < end" },
  );

export const ExercisesRequestSchema = z.object({
  variantText: z.string().min(1),
  markedVocab: z.array(CmsMarkedVocabSpanSchema),
  level: LevelSchema,
  topic: z.string().min(1),
});

const CmsFillBlankExerciseSchema = z.object({
  kind: z.literal("fill-blank"),
  sourceSentence: z.string().min(1),
  blankedSentence: z.string().min(1),
  answer: z.string().min(1),
});

const CmsMultipleChoiceExerciseSchema = z.object({
  kind: z.literal("multiple-choice"),
  sourceSentence: z.string().min(1),
  blankedSentence: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctIndex: z.number().int().nonnegative(),
});

const CmsWordPairingExerciseSchema = z.object({
  kind: z.literal("word-pairing"),
  pairs: z.array(z.object({ german: z.string().min(1), russian: z.string().min(1) })).min(1),
});

const CmsAudioDictationExerciseSchema = z.object({
  kind: z.literal("audio-dictation"),
  sourceSentence: z.string().min(1),
  answer: z.string().min(1),
});

export const CmsExerciseSchema = z.discriminatedUnion("kind", [
  CmsFillBlankExerciseSchema,
  CmsMultipleChoiceExerciseSchema,
  CmsWordPairingExerciseSchema,
  CmsAudioDictationExerciseSchema,
]);

export const ExercisesResponseSchema = z.object({
  exercises: z.array(CmsExerciseSchema).min(0).max(4),
});

export const TtsRequestSchema = z.object({
  sentence: z.string().min(1),
  rate: z.enum(["normal", "slow"]),
});
