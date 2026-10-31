import { describe, expect, it } from "vitest";
import type { ReviewQueueEntry, VocabularyItem } from "@sprachweise/shared";
import { CONTEXT_SENTENCE_MAX, extractContextSentence } from "@/lib/review/context";
import {
  badgeText,
  buildReviewExercise,
  countDue,
  gradeCloze,
  selectDue,
} from "@/lib/review/session";

function word(id: string, extra: Partial<VocabularyItem> = {}): VocabularyItem {
  return {
    id,
    german: id,
    russian: `ru-${id}`,
    encounterCount: 1,
    status: "active",
    firstEncounteredAt: 1,
    ...extra,
  };
}

function entry(vocabId: string, dueDate: string): ReviewQueueEntry {
  return { vocabId, repetitions: 1, intervalDays: 1, dueDate };
}

describe("extractContextSentence", () => {
  const text = "Das ist gut. Ich habe <strong>Termine</strong> heute. Und dann geht es weiter.";

  it("returns the sentence of the word without markup, and the form as written", () => {
    const start = text.indexOf("<strong>Termine");
    const end = text.indexOf("</strong>") + "</strong>".length;
    expect(extractContextSentence(text, start, end)).toEqual({
      sentence: "Ich habe Termine heute.",
      form: "Termine",
    });
  });

  it("works for the first and the last sentence", () => {
    expect(extractContextSentence(text, 4, 7)).toEqual({ sentence: "Das ist gut.", form: "ist" });
    const last = text.indexOf("weiter");
    expect(extractContextSentence(text, last, last + 6).sentence).toBe("Und dann geht es weiter.");
  });

  it("does not split on a dot inside a number", () => {
    const t = "Es kostet 3.50 Euro im Laden.";
    const i = t.indexOf("Laden");
    expect(extractContextSentence(t, i, i + 5).sentence).toBe(t);
  });

  it("cuts a long sentence to the limit and keeps the word inside", () => {
    const long = `${"wort ".repeat(60)}ZIEL ${"wort ".repeat(60)}`.trim() + ".";
    const i = long.indexOf("ZIEL");
    const { sentence, form } = extractContextSentence(long, i, i + 4);
    expect(sentence.length).toBeLessThanOrEqual(CONTEXT_SENTENCE_MAX);
    expect(form).toBe("ZIEL");
    expect(sentence).toContain("ZIEL");
  });

  it("keeps the word when it is at the very end of a long sentence", () => {
    const long = `${"wort ".repeat(80)}ZIEL.`;
    const i = long.indexOf("ZIEL");
    const { sentence } = extractContextSentence(long, i, i + 4);
    expect(sentence.length).toBeLessThanOrEqual(CONTEXT_SENTENCE_MAX);
    expect(sentence).toContain("ZIEL");
  });
});

describe("selectDue / countDue", () => {
  const vocab = Object.fromEntries(["a", "b", "c", "d"].map((id) => [id, word(id)]));
  const queue = [
    entry("c", "2026-10-20"),
    entry("b", "2026-10-25"),
    entry("a", "2026-10-25"),
    entry("d", "2026-10-26"),
    entry("gone", "2026-10-01"),
  ];

  it("takes entries due today or earlier, oldest first, ids breaking ties", () => {
    expect(selectDue(queue, vocab, "2026-10-25").map((w) => w.id)).toEqual(["c", "a", "b"]);
  });

  it("ignores queue entries without a vocabulary item", () => {
    expect(countDue(queue, vocab, "2026-10-25")).toBe(3);
    expect(countDue(queue, vocab, "2026-10-01")).toBe(0);
  });

  it("offers at most 20 words but counts all of them", () => {
    const ids = Array.from({ length: 25 }, (_, i) => `w${String(i).padStart(2, "0")}`);
    const manyVocab = Object.fromEntries(ids.map((id) => [id, word(id)]));
    const manyQueue = ids.map((id) => entry(id, "2026-10-24"));
    expect(selectDue(manyQueue, manyVocab, "2026-10-25")).toHaveLength(20);
    expect(countDue(manyQueue, manyVocab, "2026-10-25")).toBe(25);
  });
});

describe("buildReviewExercise", () => {
  it("builds a cloze from the stored sentence", () => {
    const exercise = buildReviewExercise(
      word("termin", {
        german: "Termin",
        russian: "встреча",
        contextSentence: "Ich habe heute zwei Termine.",
        contextForm: "Termine",
      }),
    );
    expect(exercise).toEqual({
      kind: "cloze",
      vocabId: "termin",
      blankedSentence: "Ich habe heute zwei ___.",
      answer: "Termine",
      hint: "встреча",
    });
  });

  it("matches whole words only", () => {
    const exercise = buildReviewExercise(
      word("rat", {
        contextSentence: "Der Ratgeber gibt einen Rat.",
        contextForm: "Rat",
      }),
    );
    expect(exercise).toMatchObject({
      kind: "cloze",
      blankedSentence: "Der Ratgeber gibt einen ___.",
    });
  });

  it("falls back to recall without a sentence (old records) or when the form is not in it", () => {
    expect(buildReviewExercise(word("haus", { german: "Haus", russian: "дом" }))).toEqual({
      kind: "recall",
      vocabId: "haus",
      german: "Haus",
      russian: "дом",
    });
    expect(
      buildReviewExercise(
        word("haus", { contextSentence: "Das Auto fährt.", contextForm: "Haus" }),
      ),
    ).toMatchObject({ kind: "recall" });
  });

  it("escapes regex characters in the form", () => {
    expect(
      buildReviewExercise(word("x", { contextSentence: "Was (ist) das?", contextForm: "(ist)" })),
    ).toMatchObject({ kind: "cloze" });
  });
});

describe("gradeCloze", () => {
  const exercise = buildReviewExercise(
    word("moechten", { contextSentence: "Wir möchten Kaffee.", contextForm: "möchten" }),
  );
  if (exercise.kind !== "cloze") throw new Error("expected a cloze");

  it("is lenient about case, punctuation and umlaut transliteration", () => {
    expect(gradeCloze(exercise, "Möchten")).toBe(true);
    expect(gradeCloze(exercise, " moechten. ")).toBe(true);
    expect(gradeCloze(exercise, "mochten")).toBe(false);
  });
});

describe("badgeText", () => {
  it("is empty for none, the number up to 99, then 99+", () => {
    expect([0, -1, 1, 99, 100, 250].map(badgeText)).toEqual(["", "", "1", "99", "99+", "99+"]);
  });
});
