import { describe, expect, it } from "vitest";
import { plainWord, renderSpansHtml } from "@/lib/selection/render-spans";

describe("renderSpansHtml", () => {
  it("wraps exactly the glossed words and keeps the rest of the text", () => {
    const html = renderSpansHtml("Ich moechte Ruhe.", [
      { start: 4, end: 11 },
      { start: 12, end: 16 },
    ]);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const words = [...doc.querySelectorAll(".sp-word")];
    expect(words.map((w) => [w.textContent, w.getAttribute("data-i")])).toEqual([
      ["moechte", "0"],
      ["Ruhe", "1"],
    ]);
    expect(doc.body.textContent).toBe("Ich moechte Ruhe.");
  });

  it("returns the text unchanged without spans", () => {
    expect(renderSpansHtml("Guten Tag", [])).toBe("Guten Tag");
  });
});

describe("plainWord", () => {
  it("drops tags inside a span", () => {
    expect(plainWord("Ich <em>gehe</em> heim", { start: 4, end: 17 })).toBe("gehe");
  });
});
