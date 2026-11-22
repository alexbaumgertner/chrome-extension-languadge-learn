import {
  ExplainResponseSchema,
  GRAMMAR_PHENOMENA,
  GrammarIdSchema,
  PosSchema,
  grammarTitleRu,
  type ExplainResponse,
} from "@sprachweise/shared";
import { callGeminiJson } from "./gemini-call";
import { UpstreamFailureError, type GeminiConfig } from "./translate";

/** Bump whenever the prompt or the model schema changes, so cached explanations are not reused. */
export const EXPLAIN_PROMPT_VERSION = "1";

/** What the model returns: surface strings, never character offsets (those are unreliable). */
export interface ModelExplanation {
  germanText: string;
  translationRu: string;
  tokens: Array<{ surface: string; lemma: string; pos: string; morph?: string; glossRu: string }>;
  grammar: Array<{ id: string; explanationRu: string; surfaces: string[] }>;
}

export interface ExplainResult {
  explanation: Omit<ExplainResponse, "cache" | "model" | "promptVersion">;
  usage: { promptTokens: number; outputTokens: number; thoughtsTokens: number };
}

/**
 * The trailing `Level:` / `Source fragment:` lines are a stable format that
 * `apps/cms/tests/integration/mock-providers.ts` parses back out (same as translate's prompt).
 */
export function buildExplainPrompt(text: string, level: string): string {
  const ids = GRAMMAR_PHENOMENA.map((p) => p.id).join(", ");
  return (
    "You help Russian speakers who live in Germany learn German.\n" +
    "Explain the source fragment below for a learner at CEFR level " +
    `${level}.\n` +
    '- "germanText": the fragment itself if it is German (copy it exactly, character for ' +
    "character); otherwise a natural German translation of it.\n" +
    '- "translationRu": a natural Russian translation of germanText.\n' +
    '- "tokens": every word of germanText in order, one entry per word, skipping punctuation. ' +
    '"surface" is copied exactly from germanText (same case and spelling). "lemma" is the ' +
    'dictionary form: nouns with the article ("das Haus"), separable verbs with the prefix ' +
    '("anrufen"). "pos" is one of: ' +
    `${PosSchema.options.join(", ")}. "morph" is the form in short Russian ` +
    '(for example "Akkusativ, Singular" or "3 лицо, Präsens"), omitted if there is nothing to say. ' +
    '"glossRu" is a short Russian gloss of the lemma with the meaning it has here.\n' +
    '- "grammar": 1 to 3 grammar phenomena that matter for this fragment, most useful first, ' +
    `each "id" from this list only: ${ids}. "explanationRu" explains it in 1-3 short Russian ` +
    'sentences using this fragment as the example. "surfaces" lists the words of germanText ' +
    "that show the phenomenon, each copied exactly. Skip phenomena the fragment does not show.\n\n" +
    `Level: ${level}\n` +
    `Source fragment:\n${text}`
  );
}

const MODEL_SCHEMA = {
  type: "OBJECT",
  properties: {
    germanText: { type: "STRING" },
    translationRu: { type: "STRING" },
    tokens: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          surface: { type: "STRING" },
          lemma: { type: "STRING" },
          pos: { type: "STRING", enum: [...PosSchema.options] },
          morph: { type: "STRING" },
          glossRu: { type: "STRING" },
        },
        required: ["surface", "lemma", "pos", "glossRu"],
      },
    },
    grammar: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING", enum: [...GrammarIdSchema.options] },
          explanationRu: { type: "STRING" },
          surfaces: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["id", "explanationRu", "surfaces"],
      },
    },
  },
  required: ["germanText", "translationRu", "tokens", "grammar"],
};

/**
 * Turns the model's surface strings into positions in `germanText`: tokens are found one after the
 * other from the end of the previous one, a grammar surface at its first occurrence. Anything that
 * cannot be found is an upstream failure (nothing is cached); `titleRu` comes from the catalog.
 * Throws `UpstreamFailureError` or a `ZodError` (schema refine) on a bad answer.
 */
export function locateExplanation(model: ModelExplanation): ExplainResult["explanation"] {
  const { germanText } = model;
  let cursor = 0;
  const tokens = model.tokens.map((token) => {
    const start = germanText.indexOf(token.surface, cursor);
    if (token.surface === "" || start === -1) {
      throw new UpstreamFailureError("explain: a token is not in the German text");
    }
    cursor = start + token.surface.length;
    return {
      surface: token.surface,
      lemma: token.lemma,
      pos: token.pos,
      ...(token.morph ? { morph: token.morph } : {}),
      glossRu: token.glossRu,
      start,
      end: cursor,
    };
  });
  const grammar = model.grammar.map((item) => {
    const surfaceSpans = item.surfaces.map((surface) => {
      const start = germanText.indexOf(surface);
      if (surface === "" || start === -1) {
        throw new UpstreamFailureError("explain: a grammar example is not in the German text");
      }
      return { start, end: start + surface.length };
    });
    return {
      id: item.id,
      titleRu: grammarTitleRu(item.id as Parameters<typeof grammarTitleRu>[0]),
      explanationRu: item.explanationRu,
      surfaceSpans,
    };
  });
  return ExplainResponseSchema.parse({
    germanText,
    translationRu: model.translationRu,
    tokens,
    grammar,
  });
}

function isModelExplanation(value: unknown): value is ModelExplanation {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.germanText === "string" &&
    typeof v.translationRu === "string" &&
    Array.isArray(v.tokens) &&
    v.tokens.every((t) => typeof t === "object" && t !== null && typeof t.surface === "string") &&
    Array.isArray(v.grammar) &&
    v.grammar.every((g) => typeof g === "object" && g !== null && Array.isArray(g.surfaces))
  );
}

/** One Gemini call: fragment + level → German text, Russian translation, word breakdown, grammar. */
export async function explainFragment(
  text: string,
  level: string,
  cfg: GeminiConfig,
): Promise<ExplainResult> {
  const { payload, usage } = await callGeminiJson(
    buildExplainPrompt(text, level),
    MODEL_SCHEMA,
    cfg,
  );
  if (!isModelExplanation(payload)) {
    throw new UpstreamFailureError("Gemini explain payload has the wrong shape");
  }
  return { explanation: locateExplanation(payload), usage };
}
