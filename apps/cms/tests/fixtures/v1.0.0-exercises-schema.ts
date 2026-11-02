/**
 * The /api/exercises response schema of extension v1.0.0, the build in the Chrome Web Store.
 * Everything below the marker is copied verbatim from tag v1.0.0,
 * packages/shared/src/schemas/cms.ts; exercises-compat.test.ts checks that against the tag when it
 * is available. Never edit it: it stands for clients that cannot be updated from here.
 */
import { z } from "zod";

// --- verbatim from v1.0.0 ---
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
