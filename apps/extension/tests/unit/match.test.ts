import { describe, expect, it } from "vitest";
import { isLenientMatch } from "@/lib/exercises/match";

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
