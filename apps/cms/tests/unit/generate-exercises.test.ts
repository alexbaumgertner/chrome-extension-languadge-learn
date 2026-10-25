import { describe, expect, it } from "vitest";
import { ExercisesResponseSchema } from "@sprachweise/shared";
import {
  MAX_SHOWN,
  generateExercises,
  parseArticleLemma,
  selectExercises,
} from "../../src/exercises/generate";

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

describe("article-choice", () => {
  const nounText =
    "Ich fahre mit dem Riesenrad. Danach kaufe ich einen Kaffee. Die Leute warten in der Stadt.";
  const nouns = [
    { german: "Riesenrad", lemma: "das Riesenrad", russian: "колесо обозрения" },
    { german: "Kaffee", lemma: "der Kaffee", russian: "кофе" },
    { german: "Stadt", lemma: "die Stadt", russian: "город" },
    { german: "Leute", lemma: "die Leute", russian: "люди" },
  ];

  it("parses the article and the bare noun from a lemma", () => {
    expect(parseArticleLemma("das Riesenrad")).toEqual({ article: "das", noun: "Riesenrad" });
    expect(parseArticleLemma("Die Stadt")).toEqual({ article: "die", noun: "Stadt" });
  });

  it("skips plural-only, ambiguous, article-less and multi-word lemmas", () => {
    expect(parseArticleLemma("die Leute")).toBeNull();
    expect(parseArticleLemma("der/das Teil")).toBeNull();
    expect(parseArticleLemma("anrufen")).toBeNull();
    expect(parseArticleLemma("das große Haus")).toBeNull();
    expect(parseArticleLemma("die")).toBeNull();
    expect(parseArticleLemma(undefined)).toBeNull();
  });

  it("emits a schema-valid article-choice with the article split off", () => {
    const exercises = generateExercises(nounText, nouns);
    const article = exercises.filter((e) => e.kind === "article-choice");
    expect(article).toHaveLength(1);
    expect(ExercisesResponseSchema.safeParse({ exercises }).success).toBe(true);
    const only = article[0];
    if (only?.kind !== "article-choice") throw new Error("expected article-choice");
    expect(["Riesenrad", "Kaffee", "Stadt"]).toContain(only.noun);
    expect(only.noun).not.toBe("Leute");
    const source = nouns.find((n) => n.lemma.endsWith(` ${only.noun}`));
    expect(source?.lemma).toBe(`${only.article} ${only.noun}`);
  });

  it("makes no article-choice for plural-only nouns or paragraphs without nouns", () => {
    const onlyPlural = [{ german: "Leute", lemma: "die Leute", russian: "люди" }];
    expect(generateExercises("Die Leute warten.", onlyPlural).map((e) => e.kind)).not.toContain(
      "article-choice",
    );
    expect(generateExercises(text, vocab).map((e) => e.kind)).not.toContain("article-choice");
  });
});

describe("selection policy", () => {
  const nounText =
    "Ich fahre mit dem Riesenrad. Danach kaufe ich einen Kaffee. Wir besuchen die Stadt.";
  const nouns = [
    { german: "Riesenrad", lemma: "das Riesenrad", russian: "колесо обозрения" },
    { german: "Kaffee", lemma: "der Kaffee", russian: "кофе" },
    { german: "Stadt", lemma: "die Stadt", russian: "город" },
  ];

  it("never exceeds MAX_SHOWN and is deterministic", () => {
    const a = generateExercises(nounText, nouns);
    expect(a.length).toBeLessThanOrEqual(MAX_SHOWN);
    expect(a).toEqual(generateExercises(nounText, nouns));
  });

  it("shows at most one exercise per kind", () => {
    const kinds = generateExercises(nounText, nouns).map((e) => e.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("selectExercises caps kinds, words per word and the total", () => {
    const fill = (word: string) => ({
      word,
      exercise: {
        kind: "fill-blank" as const,
        sourceSentence: word,
        blankedSentence: "___",
        answer: word,
      },
    });
    expect(selectExercises([fill("a"), fill("b")])).toHaveLength(1);

    const article = (word: string) => ({
      word,
      exercise: {
        kind: "article-choice" as const,
        noun: word,
        article: "das" as const,
        russian: "x",
      },
    });
    const mc = (word: string) => ({
      word,
      exercise: {
        kind: "multiple-choice" as const,
        sourceSentence: word,
        blankedSentence: "___",
        options: ["a", "b"],
        correctIndex: 0,
      },
    });
    const dictation = {
      exercise: { kind: "audio-dictation" as const, sourceSentence: "s", answer: "s" },
    };
    // Same word three times: the third (dictation has no word) is fine, the word cap stops a 3rd.
    const picked = selectExercises([fill("w"), mc("w"), article("w"), dictation]);
    expect(picked.map((e) => e.kind)).toEqual(["fill-blank", "multiple-choice", "audio-dictation"]);
  });
});
