import type { Config } from "../config";
import { withRetry } from "./retry";

export class UpstreamFailureError extends Error {}

/**
 * Gemini rejected our configuration (unknown model, unsupported thinking level, bad key). Never
 * retried, and remembered per process so every later request fails fast with the same clear
 * message instead of paying for a doomed call per paragraph.
 */
export class ProviderConfigError extends Error {}

const CONFIG_ERROR_DETAIL = /thinking|model|api key|permission|not found|not supported/i;
const configFailures = new Map<string, ProviderConfigError>();
const configKey = (cfg: GeminiConfig) => `${cfg.GEMINI_MODEL}\0${cfg.GEMINI_THINKING_LEVEL}`;

export type GeminiConfig = Pick<
  Config,
  "GEMINI_API_KEY" | "GEMINI_MODEL" | "GEMINI_THINKING_LEVEL" | "GEMINI_TIMEOUT_MS"
>;

export interface VocabGloss {
  /** Exactly as it appears in the German text — used to highlight it and build blanks. */
  german: string;
  /** Dictionary form for the glossary: noun with article, separable verb with its prefix. */
  lemma?: string;
  russian: string;
}

export interface TranslationResult {
  text: string;
  vocab: VocabGloss[];
  usage: { promptTokens: number; outputTokens: number; thoughtsTokens: number };
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
}

const LEVEL_GUIDANCE: Record<string, string> = {
  "A1-A2":
    "Use short main clauses, Präsens and Perfekt, and the most common everyday words. " +
    "Split long sentences. Simplify or drop details a beginner can't follow.",
  "B1-B2":
    "Use natural everyday German with common subordinate clauses and Präteritum where natural. " +
    "Keep all main facts; replace rare or bureaucratic words with common ones.",
  "C1+": "Use natural, idiomatic German as a native writer would. Keep all details.",
};

/** Bump whenever the prompt changes meaningfully, so cached output from the old prompt isn't served. */
export const PROMPT_VERSION = "2";

/** Which vocabulary to pick and how to write it down; shared by every tool that glosses its German output. */
export const VOCAB_INSTRUCTIONS =
  "Then pick 3 to 8 vocabulary items from YOUR German text that are most worth learning at this " +
  "level. Skip names, numbers and words that are the same in both languages. For each item:\n" +
  '- "german": copied exactly as it appears in the text, one contiguous piece of one to three ' +
  "words (same inflection, same capitalization). For a separable verb, copy only the conjugated " +
  'part that is in the text (e.g. "rufe" from "rufe ... an").\n' +
  '- "lemma": the dictionary form. Nouns with their definite article in the nominative singular ' +
  '("das Riesenrad", "die Wohnung"; plural-only nouns as "die Leute"). Verbs in the infinitive, ' +
  'separable verbs with the prefix attached ("anrufen", "einkaufen"; reflexive as "sich ' +
  'beschweren"). Adjectives and adverbs in the base form.\n' +
  '- "russian": a short Russian gloss of the lemma in its dictionary form (nominative, ' +
  "infinitive), with the meaning it has in this text.\n\n";

/**
 * The prompt's trailing `Level:` / `Source paragraph:` lines are a stable format —
 * `apps/cms/tests/integration/mock-providers.ts` parses them back out for deterministic fixtures.
 */
export function buildPrompt(sourceText: string, level: string): string {
  return (
    "You help Russian speakers who live in Germany learn German by reading.\n" +
    `Translate the source paragraph (usually Russian or English) into German for a CEFR ${level} ` +
    `learner. ${LEVEL_GUIDANCE[level] ?? ""}\n` +
    "Output plain text. You may use bare <strong> or <em> only where the source emphasizes " +
    "something; no other HTML, no attributes.\n" +
    VOCAB_INSTRUCTIONS +
    `Level: ${level}\n` +
    `Source paragraph:\n${sourceText}`
  );
}

async function doTranslate(prompt: string, cfg: GeminiConfig): Promise<TranslationResult> {
  const generationConfig: Record<string, unknown> = {
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: {
        text: { type: "STRING" },
        vocab: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              german: { type: "STRING" },
              lemma: { type: "STRING" },
              russian: { type: "STRING" },
            },
            required: ["german", "lemma", "russian"],
          },
        },
      },
      required: ["text", "vocab"],
    },
  };
  if (cfg.GEMINI_THINKING_LEVEL) {
    generationConfig.thinkingConfig = { thinkingLevel: cfg.GEMINI_THINKING_LEVEL };
  }

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${cfg.GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        // Header, not ?key=, so the secret never appears in a URL or access log.
        headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig,
        }),
        signal: AbortSignal.timeout(cfg.GEMINI_TIMEOUT_MS),
      },
    );
  } catch (err) {
    throw new UpstreamFailureError(`Gemini call failed: ${(err as Error).name}`);
  }

  if (!response.ok) {
    // Google's error message (e.g. unknown model, unsupported thinkingLevel) never echoes the
    // learner's text, so it's safe to surface for diagnosis.
    const detail = await response
      .json()
      .then((b: { error?: { message?: string } }) => b.error?.message ?? "")
      .catch(() => "");
    if (
      [401, 403, 404].includes(response.status) ||
      (response.status === 400 && CONFIG_ERROR_DETAIL.test(detail))
    ) {
      throw new ProviderConfigError(
        `Gemini rejected the configuration (GEMINI_MODEL=${cfg.GEMINI_MODEL}, ` +
          `GEMINI_THINKING_LEVEL=${cfg.GEMINI_THINKING_LEVEL || "(omitted)"}): ` +
          `${response.status} ${detail.slice(0, 200)}`,
      );
    }
    throw new UpstreamFailureError(
      `Gemini call failed: ${response.status}${detail ? ` ${detail.slice(0, 200)}` : ""}`,
    );
  }

  const body = (await response.json()) as GeminiResponse;
  const rawPayload = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof rawPayload !== "string") {
    throw new UpstreamFailureError("Gemini response missing candidates[0].content.parts[0].text");
  }

  let parsed: { text?: unknown; vocab?: unknown };
  try {
    parsed = JSON.parse(rawPayload) as { text?: unknown; vocab?: unknown };
  } catch {
    throw new UpstreamFailureError("Gemini structured-output payload was not valid JSON");
  }

  if (typeof parsed.text !== "string" || parsed.text.length === 0 || !Array.isArray(parsed.vocab)) {
    throw new UpstreamFailureError("Gemini structured-output payload missing text/vocab");
  }

  const vocab = parsed.vocab.filter(
    (v): v is VocabGloss =>
      typeof v === "object" &&
      v !== null &&
      typeof (v as VocabGloss).german === "string" &&
      typeof (v as VocabGloss).russian === "string",
  );

  return {
    text: parsed.text,
    vocab,
    usage: {
      promptTokens: body.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
      thoughtsTokens: body.usageMetadata?.thoughtsTokenCount ?? 0,
    },
  };
}

/**
 * One Gemini structured-output call: source paragraph + CEFR level → German at that level plus
 * the vocabulary worth marking, each with a contextual Russian gloss.
 */
export function translateParagraph(
  sourceText: string,
  level: string,
  cfg: GeminiConfig,
): Promise<TranslationResult> {
  return generateGerman(buildPrompt(sourceText, level), cfg);
}

/**
 * The shared Gemini call behind every tool that returns German text plus glossed vocabulary
 * ({text, vocab[]} structured output): retries, remembered configuration failures, usage.
 */
export function generateGerman(prompt: string, cfg: GeminiConfig): Promise<TranslationResult> {
  const known = configFailures.get(configKey(cfg));
  if (known) return Promise.reject(known);
  return withRetry(
    () => doTranslate(prompt, cfg),
    200,
    (err) => !(err instanceof ProviderConfigError),
  ).catch((err: unknown) => {
    if (err instanceof ProviderConfigError) configFailures.set(configKey(cfg), err);
    throw err;
  });
}

/** Test seam: forget remembered configuration failures. */
export function resetProviderConfigFailures(): void {
  configFailures.clear();
}
