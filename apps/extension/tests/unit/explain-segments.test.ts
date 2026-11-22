import { describe, expect, it } from "vitest";
import { explainSegments } from "@/lib/selection/explain-segments";

describe("explainSegments", () => {
  it("splits the text into words and the pieces between them", () => {
    const text = "Ich habe einen Hund.";
    const tokens = [
      { start: 0, end: 3 },
      { start: 4, end: 8 },
      { start: 9, end: 14 },
      { start: 15, end: 19 },
    ];
    expect(explainSegments(text, tokens)).toEqual([
      { text: "Ich", token: 0 },
      { text: " " },
      { text: "habe", token: 1 },
      { text: " " },
      { text: "einen", token: 2 },
      { text: " " },
      { text: "Hund", token: 3 },
      { text: "." },
    ]);
  });

  it("joins back to the original text", () => {
    const text = "„Wie geht's?“, fragte er.";
    const tokens = [
      { start: 1, end: 4 },
      { start: 5, end: 9 },
      { start: 10, end: 11 },
      { start: 12, end: 13 },
      { start: 17, end: 23 },
    ];
    expect(
      explainSegments(text, tokens)
        .map((s) => s.text)
        .join(""),
    ).toBe(text);
  });

  it("returns the whole text as one plain piece when there are no tokens", () => {
    expect(explainSegments("Hallo", [])).toEqual([{ text: "Hallo" }]);
  });
});
