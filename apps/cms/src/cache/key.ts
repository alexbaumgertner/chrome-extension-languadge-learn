import { createHash } from "node:crypto";

/** Trim + collapse internal whitespace, per FR-004's cache-key normalization rule. */
export function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * NUL-byte separator (not a plain concatenation or space) prevents an attacker/learner-controlled
 * `text` from forging a field-boundary collision with `level`/`topic` (research.md §6).
 */
export function cacheKey(text: string, level: string, topic: string): string {
  const input = `${normalize(text)}\0${level}\0${topic}`;
  return createHash("sha256").update(input, "utf8").digest("hex");
}
