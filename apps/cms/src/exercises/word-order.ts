import type { CmsExercise } from "@sprachweise/shared";

type WordOrderExercise = Extract<CmsExercise, { kind: "word-order" }>;

export const WORD_ORDER_MIN_TOKENS = 4;
export const WORD_ORDER_MAX_TOKENS = 9;

/**
 * Words a sentence may start with: a pronoun or a determiner in the nominative, i.e. a subject
 * opens the sentence. German allows any one constituent before the finite verb ("Gestern ging ich
 * ...", "Den Hund sehe ich ..."), so a sentence that starts with an adverb, an object or a
 * subordinate clause has several correct orders and the exercise would mark right answers wrong.
 * Accusative and dative forms (den, dem, einen, einem ...) are left out on purpose: they open a
 * sentence only when the object is fronted. A proper name as the subject cannot be told from a
 * noun by its capital letter (every German noun has one), so such sentences are not used.
 * Compared in lower case.
 */
const SUBJECT_STARTERS = new Set([
  "ich",
  "du",
  "er",
  "sie",
  "es",
  "wir",
  "ihr",
  "man",
  "der",
  "die",
  "das",
  "dieser",
  "diese",
  "dieses",
  "jeder",
  "jede",
  "jedes",
  "ein",
  "eine",
  "kein",
  "keine",
  "mein",
  "meine",
  "dein",
  "deine",
  "sein",
  "seine",
  "unser",
  "unsere",
  "euer",
  "eure",
]);

const ENDING_RE = /[.!?…]+$/u;
const PUNCTUATION_ONLY_RE = /^\p{P}+$/u;

export interface Tokenized {
  /** Words in the original order; commas and quotes stay attached to the word before/after. */
  tokens: string[];
  /** The fixed sentence-final punctuation; "" if there is none. */
  ending: string;
}

/**
 * Splits a sentence on whitespace. Punctuation stays attached to its word (so "Hause," is one
 * token), separable prefixes stay separate words ("ruft ... an"), and the final punctuation is
 * cut off and returned separately: it is not something to arrange.
 */
export function tokenizeSentence(sentence: string): Tokenized {
  const trimmed = sentence.trim();
  const ending = ENDING_RE.exec(trimmed)?.[0] ?? "";
  const body = ending ? trimmed.slice(0, trimmed.length - ending.length) : trimmed;
  return { tokens: body.split(/\s+/).filter(Boolean), ending };
}

/** True if the sentence has 4-9 words, ends in . ! ? and starts with a subject (see above). */
export function isOrderableSentence(sentence: string): boolean {
  const { tokens, ending } = tokenizeSentence(sentence);
  if (
    ending === "" ||
    tokens.length < WORD_ORDER_MIN_TOKENS ||
    tokens.length > WORD_ORDER_MAX_TOKENS
  ) {
    return false;
  }
  if (tokens.some((t) => PUNCTUATION_ONLY_RE.test(t))) return false;
  const first = tokens[0]!.replace(/^[^\p{L}]+/u, "").toLowerCase();
  return SUBJECT_STARTERS.has(first);
}

/**
 * The shown tokens: shuffled by a hash (never Math.random), always different from the original
 * order. The first word loses its sentence-initial capital when it is a starter ("Ich" -> "ich"),
 * so the capital does not give the start away; the answer check ignores that case anyway.
 */
export function shuffleTokens(
  tokens: string[],
  seed: string,
  hash: (s: string) => number,
): string[] | null {
  const shown = tokens.map((t, i) => (i === 0 ? t.charAt(0).toLowerCase() + t.slice(1) : t));
  const original = shown.join(" ");
  let shuffled = shown
    .map((token, i) => ({ token, rank: hash(`${seed}|${i}|${token}`), i }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.token);
  if (shuffled.join(" ") === original) shuffled = [...shuffled.slice(1), shuffled[0]!];
  return shuffled.join(" ") === original ? null : shuffled;
}

/** Builds the exercise for one sentence, or null if it is unsuitable. */
export function buildWordOrder(
  sentence: string,
  hash: (s: string) => number,
): WordOrderExercise | null {
  if (!isOrderableSentence(sentence)) return null;
  const { tokens, ending } = tokenizeSentence(sentence);
  const shuffled = shuffleTokens(tokens, sentence, hash);
  if (!shuffled) return null;
  return { kind: "word-order", sourceSentence: sentence, tokens: shuffled, ending };
}
