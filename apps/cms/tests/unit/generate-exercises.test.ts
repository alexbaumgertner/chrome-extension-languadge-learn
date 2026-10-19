import { describe, expect, it } from "vitest";
import { ExercisesResponseSchema } from "@sprachweise/shared";
import { generateExercises } from "../../src/exercises/generate";

const text =
  "Ich möchte einen <strong>Kaffee</strong> bestellen. Danach lese ich in Ruhe die Zeitung. " +
  "Heute ist es schön.";
const vocab = [
  { german: "möchte", russian: "хотел бы" },
  { german: "Kaffee", russian: "кофе" },
  { german: "Ruhe", russian: "покой" },
  { german: "Zeitung", russian: "газета" },
];

describe("generateExercises", () => {
  it("builds all four kinds from a paragraph with enough vocabulary", () => {
    const exercises = generateExercises(text, vocab);
    expect(exercises.map((e) => e.kind)).toEqual([
      "word-pairing",
      "fill-blank",
      "multiple-choice",
      "audio-dictation",
    ]);
    expect(ExercisesResponseSchema.safeParse({ exercises }).success).toBe(true);
  });

  it("fill-blank blanks a whole word, shows the Russian hint, and strips HTML", () => {
    const fill = generateExercises(text, vocab).find((e) => e.kind === "fill-blank");
    expect(fill).toEqual({
      kind: "fill-blank",
      sourceSentence: "Ich möchte einen Kaffee bestellen.",
      blankedSentence: "Ich ___ (хотел бы) einen Kaffee bestellen.",
      answer: "möchte",
    });
  });

  it("multiple-choice uses a different sentence, includes the answer, and is deterministic", () => {
    const a = generateExercises(text, vocab).find((e) => e.kind === "multiple-choice");
    const b = generateExercises(text, vocab).find((e) => e.kind === "multiple-choice");
    expect(a).toEqual(b);
    if (a?.kind !== "multiple-choice") throw new Error("expected multiple-choice");
    expect(a.sourceSentence).toBe("Danach lese ich in Ruhe die Zeitung.");
    expect(a.blankedSentence).toContain("___");
    expect(a.options).toHaveLength(3);
    expect(a.options[a.correctIndex]).toBe("Ruhe");
  });

  it("dictation picks the shortest sentence of 3-12 words", () => {
    const dictation = generateExercises(text, vocab).find((e) => e.kind === "audio-dictation");
    expect(dictation).toMatchObject({ answer: "Heute ist es schön." });
  });

  it("a short paragraph with one term yields fewer kinds, never a malformed one", () => {
    const exercises = generateExercises("Kurzer Satz mit Kaffee.", [
      { german: "Kaffee", russian: "кофе" },
    ]);
    expect(exercises.map((e) => e.kind)).toEqual(["fill-blank", "audio-dictation"]);
  });

  it("no vocabulary and no usable sentence yields an empty list", () => {
    expect(generateExercises("Hallo!", [])).toEqual([]);
  });

  it("word pairing shows the dictionary form while blanks keep the in-text form", () => {
    const exercises = generateExercises("Ich rufe heute meine Mutter an.", [
      { german: "rufe", lemma: "anrufen", russian: "звонить" },
      { german: "Mutter", lemma: "die Mutter", russian: "мать" },
    ]);
    expect(exercises.find((e) => e.kind === "word-pairing")).toEqual({
      kind: "word-pairing",
      pairs: [
        { german: "anrufen", russian: "звонить" },
        { german: "die Mutter", russian: "мать" },
      ],
    });
    expect(exercises.find((e) => e.kind === "fill-blank")).toMatchObject({ answer: "rufe" });
  });
});
