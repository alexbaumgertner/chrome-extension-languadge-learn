import type { RewriteMode } from "@sprachweise/shared";
import { generateGerman, VOCAB_INSTRUCTIONS, type GeminiConfig } from "./translate";

/** Bump whenever the rewrite prompt changes meaningfully; it is part of the cache key. */
export const REWRITE_PROMPT_VERSION = "1";

const NEXT_LEVEL: Record<string, string> = { "A1-A2": "B1-B2", "B1-B2": "C1+", "C1+": "C1+" };

const LEVEL_GUIDANCE: Record<string, string> = {
  "A1-A2":
    "short main clauses, Präsens and Perfekt, the most common everyday words; split long sentences",
  "B1-B2": "natural everyday German, common subordinate clauses, Präteritum where natural",
  "C1+": "natural, idiomatic German as a native writer would, rich vocabulary and varied syntax",
};

function modeInstruction(mode: RewriteMode, level: string): string {
  switch (mode) {
    case "simpler":
      return (
        `Make it simpler: rewrite it for a CEFR ${level} learner (${LEVEL_GUIDANCE[level] ?? ""}). ` +
        "Keep the meaning and the main facts; replace rare or bureaucratic words with common ones."
      );
    case "richer": {
      const target = NEXT_LEVEL[level] ?? level;
      return (
        `Make it richer: rewrite it one level up, for a CEFR ${target} reader ` +
        `(${LEVEL_GUIDANCE[target] ?? ""}). Keep the meaning and all facts; use more precise ` +
        "words and more varied sentence structure, without becoming wordy."
      );
    }
    case "formal":
      return (
        "Make it formal: rewrite it in a polite, formal register (Sie-form where a person is " +
        `addressed, no slang or contractions), at a language level a CEFR ${level} learner can ` +
        "follow. Keep the meaning."
      );
    case "casual":
      return (
        "Make it casual: rewrite it in a relaxed, everyday spoken register (du-form where a " +
        `person is addressed, light colloquial phrasing), at a language level a CEFR ${level} ` +
        "learner can follow. Keep the meaning. No vulgar language."
      );
  }
}

/**
 * The prompt's trailing `Mode:` / `Level:` / `Source paragraph:` lines are a stable format —
 * `apps/cms/tests/integration/mock-providers.ts` parses them back out for deterministic fixtures.
 */
export function buildRewritePrompt(sourceText: string, level: string, mode: RewriteMode): string {
  return (
    "You help Russian speakers who live in Germany learn German by reading.\n" +
    "Rewrite the source text. It is normally German; if it is Russian or English, first put it " +
    "into German and then apply the change below.\n" +
    `${modeInstruction(mode, level)}\n` +
    "Output plain text in German only, without explanations. You may use bare <strong> or <em> " +
    "only where the source emphasizes something; no other HTML, no attributes.\n" +
    VOCAB_INSTRUCTIONS +
    `Mode: ${mode}\n` +
    `Level: ${level}\n` +
    `Source paragraph:\n${sourceText}`
  );
}

export function rewriteText(
  sourceText: string,
  level: string,
  mode: RewriteMode,
  cfg: GeminiConfig,
) {
  return generateGerman(buildRewritePrompt(sourceText, level, mode), cfg);
}
