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
