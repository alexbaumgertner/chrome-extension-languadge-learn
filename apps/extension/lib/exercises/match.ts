import type { AnswerPayload, Exercise } from "@sprachweise/shared";

const PUNCTUATION_RE = /[.,!?;:()"']/g;
const WHITESPACE_RE = /\s+/g;

/** Bidirectional umlaut/eszett transliteration, applied after normalization. */
const UMLAUT_PAIRS: Array<[string, string]> = [
  ["ä", "ae"],
  ["ö", "oe"],
  ["ü", "ue"],
  ["ß", "ss"],
];

function canonicalize(value: string): string {
  let result = value.toLowerCase().replace(PUNCTUATION_RE, "").replace(WHITESPACE_RE, " ").trim();
  // Fold both the umlaut form and its transliteration to the same canonical
  // (transliterated) form, so "möchte" and "moechte" compare equal.
  for (const [umlaut, ascii] of UMLAUT_PAIRS) {
    result = result.split(umlaut).join(ascii);
  }
  return result;
}

/**
 * Lenient answer matching (research.md §5, FR-009): case-insensitive,
 * punctuation-stripped, whitespace-collapsed, and umlaut/eszett-tolerant
 * in both directions.
 */
export function isLenientMatch(submitted: string, expected: string): boolean {
  return canonicalize(submitted) === canonicalize(expected);
}

const ARTICLE_RE = /^(der|die|das)\s+(.+)$/iu;

/**
 * translate-to-german: `expected` is the dictionary form. For a noun ("das Riesenrad") the answer
 * counts with or without the article, but an article that is typed must be the right one. A
 * different leading article is wrong even when the rest matches ("die Riesenrad").
 */
export function matchTranslation(submitted: string, expected: string): boolean {
  if (isLenientMatch(submitted, expected)) return true;
  const expectedNoun = ARTICLE_RE.exec(expected.trim());
  if (!expectedNoun) return false;
  // Without the article only; "der Riesenrad" already failed the full match above.
  return !ARTICLE_RE.test(submitted.trim()) && isLenientMatch(submitted, expectedNoun[2] ?? "");
}

/** Only a wrong translate-to-german answer can be overruled, and only once (it is correct after). */
export function canOverrideGrade(exercise: Exercise): boolean {
  return exercise.kind === "translate-to-german" && exercise.lastAttempt?.correct === false;
}

/** Grades a submitted answer against an Exercise's correctAnswer, kind-appropriately. */
export function checkExerciseAnswer(exercise: Exercise, submitted: AnswerPayload): boolean {
  switch (exercise.kind) {
    case "fill-blank":
    case "audio-dictation":
      return typeof submitted === "string" && isLenientMatch(submitted, exercise.correctAnswer);
    case "translate-to-german":
      return typeof submitted === "string" && matchTranslation(submitted, exercise.correctAnswer);
    case "listen-choose":
      return typeof submitted === "number" && submitted === exercise.correctAnswer;
    case "article-choice":
      // Exact: the three buttons are the only input, so there is nothing to be lenient about.
      return submitted === exercise.correctAnswer;
    case "multiple-choice":
      return typeof submitted === "number" && submitted === exercise.correctAnswer;
    case "word-pairing": {
      if (typeof submitted !== "object") return false;
      const submittedPairs = submitted;
      const expected = exercise.correctAnswer;
      const germanWords = Object.keys(submittedPairs);
      if (germanWords.length === 0) return false;
      return germanWords.every((german) => {
        const expectedRussian = expected[german];
        const submittedRussian = submittedPairs[german];
        return (
          expectedRussian !== undefined &&
          submittedRussian !== undefined &&
          isLenientMatch(submittedRussian, expectedRussian)
        );
      });
    }
  }
}
