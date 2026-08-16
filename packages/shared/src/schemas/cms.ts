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

const SAFE_HTML_TAG_REGEX = /<\/?[a-zA-Z][^>]*>/g;
const SAFE_HTML_OPEN_TAGS: Record<string, string> = { "<strong>": "</strong>", "<em>": "</em>" };
const SAFE_HTML_CLOSE_TAGS = new Set(Object.values(SAFE_HTML_OPEN_TAGS));

/** Allowlist-only check: bare `<strong>`/`<em>`, no attributes, no other elements, no unclosed tags. */
export function isSafeHtmlSubset(text: string): boolean {
  const tags = text.match(SAFE_HTML_TAG_REGEX);
  if (!tags) return true;
  const stack: string[] = [];
  for (const tag of tags) {
    const expectedClose = SAFE_HTML_OPEN_TAGS[tag];
    if (expectedClose) {
      stack.push(expectedClose);
      continue;
    }
    if (SAFE_HTML_CLOSE_TAGS.has(tag)) {
      if (stack.pop() !== tag) return false;
      continue;
    }
    return false;
  }
  return stack.length === 0;
}

export const TranslateResponseSchema = z
  .object({
    text: z.string().min(1),
    markedVocab: z.array(CmsMarkedVocabSpanSchema),
  })
  .refine(
    (res) => res.markedVocab.every((span) => span.start < span.end && span.end <= res.text.length),
    { message: "markedVocab spans must be in-bounds with start < end" },
  )
  .refine(
    (res) =>
      res.markedVocab.every((span) => res.text.substring(span.start, span.end) === span.german),
    {
      message:
        "markedVocab span german field must exactly match the text substring at its position",
    },
  )
  .refine((res) => isSafeHtmlSubset(res.text), {
    message:
      "text must be a safe-subset HTML fragment (only bare <strong>/<em>, no attributes, no other elements)",
  });

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
