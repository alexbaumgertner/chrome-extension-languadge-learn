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

/** Grades a submitted answer against an Exercise's correctAnswer, kind-appropriately. */
export function checkExerciseAnswer(exercise: Exercise, submitted: AnswerPayload): boolean {
  switch (exercise.kind) {
    case "fill-blank":
    case "audio-dictation":
      return typeof submitted === "string" && isLenientMatch(submitted, exercise.correctAnswer);
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
