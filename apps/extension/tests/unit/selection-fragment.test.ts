import { describe, expect, it } from "vitest";
import { SELECTION_MAX_CHARS } from "@sprachweise/shared";
import { toFragment } from "@/lib/selection/fragment";

describe("toFragment", () => {
  it("returns null for nothing or whitespace", () => {
    expect(toFragment(undefined)).toBeNull();
    expect(toFragment("")).toBeNull();
    expect(toFragment(" \n\t ")).toBeNull();
  });

  it("trims and keeps a short selection whole", () => {
    expect(toFragment("  Guten Tag \n")).toEqual({ text: "Guten Tag", truncated: false });
  });

  it("keeps exactly the cap and cuts one character more", () => {
    const exact = "a".repeat(SELECTION_MAX_CHARS);
    expect(toFragment(exact)).toEqual({ text: exact, truncated: false });
    expect(toFragment(exact + "a")).toEqual({ text: exact, truncated: true });
  });

  it("does not end on half of a surrogate pair", () => {
    const text = "a".repeat(SELECTION_MAX_CHARS - 1) + "😀 und mehr";
    const fragment = toFragment(text)!;
    expect(fragment.truncated).toBe(true);
    expect(fragment.text).toBe("a".repeat(SELECTION_MAX_CHARS - 1));
  });
});
