import { createHash } from "node:crypto";

/** Trim + collapse internal whitespace, per FR-004's cache-key normalization rule. */
export function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * NUL-byte separator (not a plain concatenation or space) prevents an attacker/learner-controlled
 * `text` from forging a field-boundary collision with `level`/`model` (research.md §6). The model
 * is part of the key so switching GEMINI_MODEL never serves another model's output.
 */
export function cacheKey(text: string, level: string, model: string): string {
  const input = `${normalize(text)}\0${level}\0${model}`;
  return createHash("sha256").update(input, "utf8").digest("hex");
}
