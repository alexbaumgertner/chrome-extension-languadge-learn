import { describe, expect, it } from "vitest";
import { isSafeHtmlSubset } from "../../src/validation/html-safe-subset";

describe("isSafeHtmlSubset (local re-export)", () => {
  it("accepts bare strong/em tags", () => {
    expect(isSafeHtmlSubset("<strong>bold</strong> <em>italic</em>")).toBe(true);
  });

  it("rejects a disallowed tag", () => {
    expect(isSafeHtmlSubset("<span>text</span>")).toBe(false);
  });
});
