import { z } from "zod";
import { InstallIdSchema, LevelSchema, TranslationDensitySchema } from "./storage";

/**
 * Longest text one translation may send, in `string.length` units. The extension checks a whole
 * selection against it before sending anything; the backend checks each request (default of its
 * `TRANSLATE_MAX_CHARS`). 1,500 is about six average news paragraphs (~250 characters each, about
 * $0.0016 apiece on gemini-3.8-flash), so one selection costs at most about a cent.
 */
export const TRANSLATE_MAX_CHARS = 1500;

export const TranslateRequestSchema = z.object({
  text: z.string().min(1),
  level: LevelSchema,
  topic: z.string().min(1),
});

const CmsMarkedVocabSpanSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  /** The span's text, exactly as in the German text. */
  german: z.string().min(1),
  /** Dictionary form for the glossary ("das Riesenrad", "anrufen"); absent in older cache rows. */
  lemma: z.string().min(1).optional(),
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
    /** Whether the server answered from its shared cache; feeds the paragraph_translated event. */
    cache: z.enum(["hit", "miss"]).optional(),
    /** The model and prompt version that produced `text` (both are part of the cache key). */
    model: z.string().min(1).optional(),
    promptVersion: z.string().min(1).optional(),
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

/**
 * Fixed codes only — an error event never carries a message, URL or page text. Translate codes:
 * `offline` the device has no network; `unreachable` it has one but the backend didn't answer;
 * `cors` the backend answered but the browser refused the response (missing CORS grant);
 * `server-error` a 5xx; `limit` the daily allowance (429); `too-long` the selection exceeds
 * TRANSLATE_MAX_CHARS (not sent at all, or a 413); `failed` anything else (other 4xx, bad schema).
 * Selection codes: the extension refused the selection before sending anything — `excluded` it
 * includes code or a form field.
 */
export const ClientErrorCodeSchema = z.enum([
  "translate-failed",
  "translate-offline",
  "translate-unreachable",
  "translate-cors",
  "translate-server-error",
  "translate-limit",
  "translate-too-long",
  "selection-excluded",
  "exercises-failed",
  "report-failed",
]);

/**
 * Every event carries a random ID generated when it is recorded, so the server can drop a batch
 * that is sent again after a lost response. It is not derived from anything and identifies nothing.
 */
const eventFields = { id: z.string().uuid(), occurredAt: z.string().datetime() };

/**
 * Usage-metric events (constitution III): only what DAU, D1/D3/D7 retention, paragraphs per
 * install, errors and latency need. No text, no URL, no hostname.
 */
export const MetricEventSchema = z.discriminatedUnion("name", [
  z.object({ name: z.literal("install"), ...eventFields }),
  z.object({
    name: z.literal("paragraph_translated"),
    ...eventFields,
    cache: z.enum(["hit", "miss"]),
    /** End-to-end /api/translate round trip measured by the extension. */
    latencyMs: z.number().int().nonnegative().max(600_000),
  }),
  z.object({ name: z.literal("exercise_completed"), ...eventFields }),
  z.object({
    name: z.literal("client_error"),
    ...eventFields,
    error: ClientErrorCodeSchema,
    /** The backend's HTTP status; null when no response arrived (offline, DNS, CORS). */
    httpStatus: z.number().int().min(100).max(599).nullable(),
  }),
]);

export const EventsRequestSchema = z.object({
  installId: InstallIdSchema,
  events: z.array(MetricEventSchema).min(1).max(50),
});

/**
 * "Плохой перевод" report, sent only on that explicit click (constitution III). Carries no
 * install ID, URL or hostname. `model`/`promptVersion` are null for variants cached before the
 * extension started storing them.
 */
export const ReportRequestSchema = z.object({
  source: z.string().min(1).max(10_000),
  output: z.string().min(1).max(20_000),
  level: LevelSchema,
  density: TranslationDensitySchema,
  model: z.string().min(1).max(100).nullable(),
  promptVersion: z.string().min(1).max(20).nullable(),
});
