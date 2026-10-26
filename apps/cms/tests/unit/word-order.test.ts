import { describe, expect, it } from "vitest";
import { ExercisesResponseSchema } from "@sprachweise/shared";
import { generateExercises } from "../../src/exercises/generate";
import {
  buildWordOrder,
  isOrderableSentence,
  shuffleTokens,
  tokenizeSentence,
} from "../../src/exercises/word-order";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

describe("tokenizeSentence", () => {
  it("keeps commas on their word and cuts the final punctuation", () => {
    expect(tokenizeSentence("Wir wissen, dass er heute kommt.")).toEqual({
      tokens: ["Wir", "wissen,", "dass", "er", "heute", "kommt"],
      ending: ".",
    });
  });

  it("keeps umlauts and separable prefixes as their own tokens", () => {
    expect(tokenizeSentence("Er ruft mich später an!")).toEqual({
      tokens: ["Er", "ruft", "mich", "später", "an"],
      ending: "!",
    });
  });

  it("collapses runs of whitespace and handles questions and ellipses", () => {
    expect(tokenizeSentence("  Kommst  du  heute  mit?  ").tokens).toEqual([
      "Kommst",
      "du",
      "heute",
      "mit",
    ]);
    expect(tokenizeSentence("Es geht weiter…").ending).toBe("…");
  });

  it("reports no ending when the sentence has none", () => {
    expect(tokenizeSentence("Ich gehe nach Hause").ending).toBe("");
  });
});

describe("isOrderableSentence", () => {
  it.each([
    "Ich trinke jeden Morgen Kaffee.",
    "Der Hund schläft im Garten.",
    "Die Kinder spielen heute im Park.",
    "Meine Schwester wohnt in Berlin.",
    "Es regnet seit gestern ohne Pause.",
  ])("accepts a sentence that starts with its subject: %s", (s) => {
    expect(isOrderableSentence(s)).toBe(true);
  });

  it.each([
    ["Gestern ging ich in die Stadt.", "adverb first"],
    ["Heute kaufe ich einen Kaffee.", "adverb first"],
    ["Den Hund sehe ich nicht mehr.", "fronted object"],
    ["Weil es regnet, bleibe ich zu Hause.", "subordinate clause first"],
    ["Peter wohnt in einer kleinen Stadt.", "proper name first"],
    ["Ich gehe.", "too short"],
    ["Ich gehe heute am Nachmittag mit meiner Schwester nach Hause.", "too long"],
    ["Ich gehe heute nach Hause", "no final punctuation"],
    ["Ich gehe – heute – nach Hause.", "punctuation-only tokens"],
  ])("rejects %s (%s)", (s, reason) => {
    expect(isOrderableSentence(s), reason).toBe(false);
  });

  it("counts the boundaries: 4 and 9 words pass, 3 and 10 do not", () => {
    expect(isOrderableSentence("Ich gehe nach Hause.")).toBe(true);
    expect(isOrderableSentence("Ich gehe jeden Tag um acht Uhr zur Arbeit.")).toBe(true);
    expect(isOrderableSentence("Ich gehe nach.")).toBe(false);
    expect(isOrderableSentence("Ich gehe jeden Tag um acht Uhr mit dem Bus.")).toBe(false);
  });
});

describe("shuffleTokens", () => {
  const tokens = ["Ich", "trinke", "jeden", "Morgen", "Kaffee"];

  it("is deterministic and never returns the original order", () => {
    const a = shuffleTokens(tokens, "seed", hash);
    expect(a).toEqual(shuffleTokens(tokens, "seed", hash));
    expect(a?.join(" ")).not.toBe("ich trinke jeden Morgen Kaffee");
  });

  it("keeps every word, and drops only the sentence-initial capital", () => {
    const shuffled = shuffleTokens(tokens, "seed", hash)!;
    expect([...shuffled].sort()).toEqual(["Kaffee", "Morgen", "ich", "jeden", "trinke"].sort());
  });

  it("differs from the original for many seeds", () => {
    for (let i = 0; i < 200; i++) {
      expect(shuffleTokens(tokens, `s${i}`, hash)?.join(" ")).not.toBe(
        "ich trinke jeden Morgen Kaffee",
      );
    }
  });

  it("gives up on a sentence whose words are all identical", () => {
    expect(shuffleTokens(["Die", "die", "die", "die"], "s", hash)).toBeNull();
  });
});

describe("buildWordOrder / generateExercises", () => {
  it("builds a schema-valid exercise", () => {
    const exercise = buildWordOrder("Ich trinke jeden Morgen Kaffee.", hash);
    expect(exercise).toMatchObject({
      kind: "word-order",
      sourceSentence: "Ich trinke jeden Morgen Kaffee.",
      ending: ".",
    });
    expect(ExercisesResponseSchema.safeParse({ exercises: [exercise] }).success).toBe(true);
  });

  it("returns null for a sentence that starts with an adverb", () => {
    expect(buildWordOrder("Gestern ging ich in die Stadt.", hash)).toBeNull();
  });

  it("is offered for a paragraph with a subject-first sentence and skipped otherwise", () => {
    const withOrder = generateExercises("Der Hund schläft im Garten. Gestern regnete es viel.", []);
    expect(withOrder.map((e) => e.kind)).toContain("word-order");
    const without = generateExercises("Gestern ging ich in die Stadt. Heute regnet es sehr.", []);
    expect(without.map((e) => e.kind)).not.toContain("word-order");
  });

  it("prefers a sentence other than the dictation one", () => {
    const text = "Ich gehe nach Hause. Der Hund schläft heute im Garten.";
    const exercises = generateExercises(text, []);
    const dictation = exercises.find((e) => e.kind === "audio-dictation");
    const order = exercises.find((e) => e.kind === "word-order");
    expect(dictation && "sourceSentence" in dictation && dictation.sourceSentence).toBe(
      "Ich gehe nach Hause.",
    );
    expect(order && "sourceSentence" in order && order.sourceSentence).toBe(
      "Der Hund schläft heute im Garten.",
    );
  });
});
