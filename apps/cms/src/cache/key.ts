import { createHash } from "node:crypto";

/** Trim + collapse internal whitespace, per FR-004's cache-key normalization rule. */
export function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * NUL-byte separator (not a plain concatenation or space) prevents an attacker/learner-controlled
 * `text` from forging a field-boundary collision with the other fields (research.md §6). The
 * model, thinking level and prompt version are part of the key so changing any of them never
 * serves output produced under the old settings.
 */
export function cacheKey(
  text: string,
  level: string,
  model: string,
  thinkingLevel = "",
  promptVersion = "",
): string {
  const input = `${normalize(text)}\0${level}\0${model}\0${thinkingLevel}\0${promptVersion}`;
  return createHash("sha256").update(input, "utf8").digest("hex");
}
