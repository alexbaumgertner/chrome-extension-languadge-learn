import { describe, expect, it } from "vitest";
import { markVocab } from "../../src/pipeline/mark-vocab";

describe("markVocab", () => {
  it("marks whole words only and returns spans sorted by position", () => {
    const text = "Im Ruhestand braucht man Ruhe und Zeit.";
    expect(
      markVocab(text, [
        { german: "Zeit", russian: "время" },
        { german: "Ruhe", russian: "покой" },
      ]),
    ).toEqual([
      { start: 25, end: 29, german: "Ruhe", russian: "покой" },
      { start: 34, end: 38, german: "Zeit", russian: "время" },
    ]);
  });

  it("drops terms not in the text, blank glosses, duplicates and overlapping terms", () => {
    const text = "Die Deutsche Bahn ist pünktlich.";
    expect(
      markVocab(text, [
        { german: "Deutsche Bahn", russian: "Немецкая железная дорога" },
        { german: "Bahn", russian: "железная дорога" },
        { german: "Zug", russian: "поезд" },
        { german: "pünktlich", russian: " " },
        { german: "Deutsche Bahn", russian: "дубль" },
      ]),
    ).toEqual([
      { start: 4, end: 17, german: "Deutsche Bahn", russian: "Немецкая железная дорога" },
    ]);
  });

  it("never marks text inside a tag", () => {
    const text = "<strong>stark</strong> ist strong.";
    expect(markVocab(text, [{ german: "strong", russian: "сильный" }])).toEqual([
      { start: 27, end: 33, german: "strong", russian: "сильный" },
    ]);
  });
});
