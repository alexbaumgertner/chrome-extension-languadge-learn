import { describe, expect, it } from "vitest";
import {
  AddToVocabularyRequestSchema,
  AnyMessageSchema,
  EXPLAIN_MAX_CHARS,
  ExplainRequestSchema,
  ExplainResponseSchema,
  ExplainSelectionRequestSchema,
  ExplainSelectionResponseSchema,
  GRAMMAR_PHENOMENA,
  RequestMessageSchema,
  SELECTION_MAX_CHARS,
  SelectionToolSchema,
  grammarTitleRu,
} from "../src/index";

const germanText = "Ich gehe heute ins Kino.";

const valid = {
  germanText,
  translationRu: "Я иду сегодня в кино.",
  tokens: [
    { surface: "Ich", lemma: "ich", pos: "pronoun", glossRu: "я", start: 0, end: 3 },
    { surface: "gehe", lemma: "gehen", pos: "verb", glossRu: "идти", start: 4, end: 8 },
    { surface: "Kino", lemma: "das Kino", pos: "noun", glossRu: "кино", start: 19, end: 23 },
  ],
  grammar: [
    {
      id: "two-way-prepositions",
      titleRu: grammarTitleRu("two-way-prepositions"),
      explanationRu: "ins = in das: направление, поэтому аккузатив.",
      surfaceSpans: [{ start: 14, end: 18 }],
    },
  ],
};

describe("ExplainResponseSchema", () => {
  it("accepts a valid explanation and round-trips it", () => {
    expect(ExplainResponseSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a token whose surface differs from the text at its position", () => {
    const bad = { ...valid, tokens: [{ ...valid.tokens[0]!, surface: "Du" }] };
    expect(ExplainResponseSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects spans outside the text or empty", () => {
    const token = { ...valid.tokens[0]!, start: 20, end: 30, surface: "x" };
    expect(ExplainResponseSchema.safeParse({ ...valid, tokens: [token] }).success).toBe(false);
    const span = { ...valid.grammar[0]!, surfaceSpans: [{ start: 10, end: 99 }] };
    expect(ExplainResponseSchema.safeParse({ ...valid, grammar: [span] }).success).toBe(false);
    const empty = { ...valid.grammar[0]!, surfaceSpans: [{ start: 5, end: 5 }] };
    expect(ExplainResponseSchema.safeParse({ ...valid, grammar: [empty] }).success).toBe(false);
  });

  it("rejects overlapping or unordered tokens", () => {
    const tokens = [valid.tokens[1]!, valid.tokens[0]!];
    expect(ExplainResponseSchema.safeParse({ ...valid, tokens }).success).toBe(false);
  });

  it("rejects an unknown part of speech and an unknown grammar id", () => {
    const pos = { ...valid, tokens: [{ ...valid.tokens[0]!, pos: "determiner" }] };
    expect(ExplainResponseSchema.safeParse(pos).success).toBe(false);
    const id = { ...valid, grammar: [{ ...valid.grammar[0]!, id: "free-text-topic" }] };
    expect(ExplainResponseSchema.safeParse(id).success).toBe(false);
  });

  it("allows at most three phenomena, each once", () => {
    const g = valid.grammar[0]!;
    const four = ["passive", "modal-verb", "negation", "imperative"].map((id) => ({ ...g, id }));
    expect(ExplainResponseSchema.safeParse({ ...valid, grammar: four }).success).toBe(false);
    expect(ExplainResponseSchema.safeParse({ ...valid, grammar: [g, g] }).success).toBe(false);
    expect(ExplainResponseSchema.safeParse({ ...valid, grammar: [] }).success).toBe(true);
  });
});

describe("grammar catalog", () => {
  it("has 20 to 40 unique ids, each with a Russian title", () => {
    const ids = GRAMMAR_PHENOMENA.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(20);
    expect(ids.length).toBeLessThanOrEqual(40);
    for (const p of GRAMMAR_PHENOMENA) expect(p.titleRu).toMatch(/[А-Яа-я]/);
  });
});

describe("explain messages", () => {
  it("keeps the fragment caps in step", () => {
    expect(EXPLAIN_MAX_CHARS).toBe(SELECTION_MAX_CHARS);
  });

  it("ExplainRequest needs text and a level", () => {
    expect(ExplainRequestSchema.safeParse({ text: "Hallo", level: "A1-A2" }).success).toBe(true);
    expect(ExplainRequestSchema.safeParse({ text: "", level: "A1-A2" }).success).toBe(false);
    expect(ExplainRequestSchema.safeParse({ text: "Hallo", level: "D1" }).success).toBe(false);
  });

  it("explain is a selection tool; its requests are valid router messages", () => {
    expect(SelectionToolSchema.parse("explain")).toBe("explain");
    const explain = { type: "EXPLAIN_SELECTION", text: "Guten Tag" } as const;
    expect(ExplainSelectionRequestSchema.parse(explain)).toEqual(explain);
    expect(RequestMessageSchema.parse(explain)).toEqual(explain);
    expect(
      ExplainSelectionRequestSchema.safeParse({ ...explain, text: "a".repeat(601) }).success,
    ).toBe(false);
    const add = { type: "ADD_TO_VOCABULARY", lemma: "das Kino", russian: "кино" } as const;
    expect(AddToVocabularyRequestSchema.parse(add)).toEqual(add);
    expect(AnyMessageSchema.parse(add)).toEqual(add);
  });

  it("the response carries a checked explanation or a reason", () => {
    expect(ExplainSelectionResponseSchema.safeParse({ ok: true, explanation: valid }).success).toBe(
      true,
    );
    const broken = { ...valid, tokens: [{ ...valid.tokens[0]!, surface: "Du" }] };
    expect(
      ExplainSelectionResponseSchema.safeParse({ ok: true, explanation: broken }).success,
    ).toBe(false);
    expect(ExplainSelectionResponseSchema.safeParse({ ok: false, reason: "limit" }).success).toBe(
      true,
    );
  });
});
