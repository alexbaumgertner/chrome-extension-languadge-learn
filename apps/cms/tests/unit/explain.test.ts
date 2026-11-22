import { describe, expect, it } from "vitest";
import {
  buildExplainPrompt,
  locateExplanation,
  type ModelExplanation,
} from "../../src/pipeline/explain";
import { UpstreamFailureError } from "../../src/pipeline/translate";
import { cacheKey } from "../../src/cache/key";

const GERMAN = "Ich habe einen Hund.";

function model(overrides: Partial<ModelExplanation> = {}): ModelExplanation {
  return {
    germanText: GERMAN,
    translationRu: "У меня есть собака.",
    tokens: [
      { surface: "Ich", lemma: "ich", pos: "pronoun", glossRu: "я" },
      { surface: "habe", lemma: "haben", pos: "verb", morph: "1 лицо, Präsens", glossRu: "иметь" },
      { surface: "einen", lemma: "ein", pos: "article", glossRu: "один (неопр. артикль)" },
      { surface: "Hund", lemma: "der Hund", pos: "noun", glossRu: "собака" },
    ],
    grammar: [
      { id: "accusative-case", explanationRu: "Прямое дополнение.", surfaces: ["einen Hund"] },
    ],
    ...overrides,
  };
}

describe("locateExplanation", () => {
  it("finds every token in order and the grammar spans, with the catalog title", () => {
    const result = locateExplanation(model());
    expect(result.tokens.map((t) => [t.surface, t.start, t.end])).toEqual([
      ["Ich", 0, 3],
      ["habe", 4, 8],
      ["einen", 9, 14],
      ["Hund", 15, 19],
    ]);
    expect(result.grammar[0]).toMatchObject({
      id: "accusative-case",
      titleRu: "Аккузатив (прямое дополнение)",
      surfaceSpans: [{ start: 9, end: 19 }],
    });
  });

  it("finds a repeated word at its own position, not the first one", () => {
    const result = locateExplanation(
      model({
        germanText: "Der Hund und der Hund.",
        tokens: [
          { surface: "Der", lemma: "der", pos: "article", glossRu: "тот" },
          { surface: "Hund", lemma: "der Hund", pos: "noun", glossRu: "собака" },
          { surface: "und", lemma: "und", pos: "conjunction", glossRu: "и" },
          { surface: "der", lemma: "der", pos: "article", glossRu: "тот" },
          { surface: "Hund", lemma: "der Hund", pos: "noun", glossRu: "собака" },
        ],
        grammar: [],
      }),
    );
    expect(result.tokens[4]).toMatchObject({ start: 17, end: 21 });
  });

  it("rejects a token that is not in the German text", () => {
    const bad = model({
      tokens: [{ surface: "Katze", lemma: "die Katze", pos: "noun", glossRu: "кошка" }],
    });
    expect(() => locateExplanation(bad)).toThrow(UpstreamFailureError);
  });

  it("rejects a grammar example that is not in the German text", () => {
    const bad = model({
      grammar: [{ id: "accusative-case", explanationRu: "x", surfaces: ["die Katze"] }],
    });
    expect(() => locateExplanation(bad)).toThrow(UpstreamFailureError);
  });

  it("rejects an id outside the catalog and a part of speech outside the enum", () => {
    expect(() =>
      locateExplanation(
        model({ grammar: [{ id: "made-up", explanationRu: "x", surfaces: ["Hund"] }] }),
      ),
    ).toThrow();
    const tokens = model().tokens.map((t, i) => (i === 0 ? { ...t, pos: "weird" } : t));
    expect(() => locateExplanation(model({ tokens }))).toThrow();
  });
});

describe("buildExplainPrompt", () => {
  it("ends with the Level / Source fragment lines and lists every phenomenon id", () => {
    const prompt = buildExplainPrompt("Guten Tag", "A1-A2");
    expect(prompt.endsWith("\nLevel: A1-A2\nSource fragment:\nGuten Tag")).toBe(true);
    expect(prompt).toContain("konjunktiv-ii");
  });
});

describe("explain cache key", () => {
  it("changes with the prompt version and the level", () => {
    const base = cacheKey("Guten Tag", "A1-A2", "m", "low", "1");
    expect(cacheKey("Guten Tag", "A1-A2", "m", "low", "2")).not.toBe(base);
    expect(cacheKey("Guten Tag", "B1-B2", "m", "low", "1")).not.toBe(base);
    expect(cacheKey("  Guten   Tag ", "A1-A2", "m", "low", "1")).toBe(base);
  });
});
