import { describe, expect, it } from "vitest";
import type { Exercise } from "@sprachweise/shared";
import { checkExerciseAnswer, isLenientMatch } from "@/lib/exercises/match";

describe("isLenientMatch", () => {
  it.each([
    ["moechte", "möchte"],
    ["MOECHTE", "möchte"],
    ["  moechte  ", "möchte"],
    ["möchte.", "möchte"],
    ["möchte!", "möchte"],
    ["Straße", "Strasse"],
    ["strasse", "Straße"],
    ["gruen", "grün"],
    ["Zurueck, bitte!", "zurück bitte"],
    ["Fuer heute", "für heute"],
  ])("accepts %s as a match for %s", (submitted, expected) => {
    expect(isLenientMatch(submitted, expected)).toBe(true);
  });

  it.each([
    ["moechten", "möchte"],
    ["haus", "Baum"],
    ["", "möchte"],
  ])("rejects %s against %s", (submitted, expected) => {
    expect(isLenientMatch(submitted, expected)).toBe(false);
  });

  it("collapses internal whitespace runs before comparing", () => {
    expect(isLenientMatch("guten   tag", "guten tag")).toBe(true);
  });
});

describe("checkExerciseAnswer: word-order", () => {
  const exercise: Exercise = {
    id: "w1",
    kind: "word-order",
    sourceParagraphHash: "h",
    sourceSentence: "Ich trinke jeden Morgen Kaffee.",
    prompt: { tokens: ["Kaffee", "ich", "jeden", "trinke", "Morgen"], ending: "." },
    correctAnswer: "Ich trinke jeden Morgen Kaffee",
    answered: false,
    lastAttempt: null,
  };

  it("accepts the original order, ignoring the case of the first word and spacing", () => {
    expect(checkExerciseAnswer(exercise, "ich trinke jeden Morgen Kaffee")).toBe(true);
    expect(checkExerciseAnswer(exercise, "Ich trinke jeden Morgen Kaffee")).toBe(true);
    expect(checkExerciseAnswer(exercise, " ich  trinke jeden Morgen Kaffee ")).toBe(true);
  });

  it("rejects another order, other case further in, and non-string answers", () => {
    expect(checkExerciseAnswer(exercise, "ich trinke Kaffee jeden Morgen")).toBe(false);
    expect(checkExerciseAnswer(exercise, "ich trinke jeden morgen Kaffee")).toBe(false);
    expect(checkExerciseAnswer(exercise, "ich trinke jeden Morgen")).toBe(false);
    expect(checkExerciseAnswer(exercise, 1)).toBe(false);
  });

  it("keeps commas attached to their word", () => {
    const withComma: Exercise = {
      ...exercise,
      correctAnswer: "Wir wissen, dass er kommt",
    };
    expect(checkExerciseAnswer(withComma, "wir wissen, dass er kommt")).toBe(true);
    expect(checkExerciseAnswer(withComma, "wir wissen dass, er kommt")).toBe(false);
  });
});

describe("checkExerciseAnswer: article-choice", () => {
  const exercise: Exercise = {
    id: "a1",
    kind: "article-choice",
    sourceParagraphHash: "h",
    sourceSentence: "",
    prompt: { noun: "Riesenrad", russian: "колесо обозрения" },
    correctAnswer: "das",
    answered: false,
    lastAttempt: null,
  };

  it("accepts only the exact article", () => {
    expect(checkExerciseAnswer(exercise, "das")).toBe(true);
    expect(checkExerciseAnswer(exercise, "der")).toBe(false);
    expect(checkExerciseAnswer(exercise, "DAS")).toBe(false);
    expect(checkExerciseAnswer(exercise, 2)).toBe(false);
  });
});
