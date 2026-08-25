import { describe, expect, it } from "vitest";
import { applyDensityLimit, findEligibleParagraphs } from "@/lib/dom/paragraph-parser";

const LONG_TEXT =
  "This paragraph is deliberately padded well past the eighty character minimum length threshold so the parser treats it as real content.";

function renderDocument(bodyHtml: string): Document {
  document.body.innerHTML = bodyHtml;
  return document;
}

describe("findEligibleParagraphs", () => {
  it("selects a plain long paragraph inside an article", () => {
    renderDocument(`<article><p>${LONG_TEXT}</p></article>`);
    const found = findEligibleParagraphs(document);
    expect(found).toHaveLength(1);
    expect(found[0]?.tagName).toBe("P");
  });

  it("selects a paragraph containing a link", () => {
    renderDocument(
      `<article><p>${LONG_TEXT} See <a href="https://example.com">this source</a> for more.</p></article>`,
    );
    const found = findEligibleParagraphs(document);
    expect(found).toHaveLength(1);
  });

  it("selects a paragraph with inline bold/italic formatting", () => {
    renderDocument(
      `<article><p>${LONG_TEXT} <strong>Important</strong> and <em>emphasized</em> text follows.</p></article>`,
    );
    const found = findEligibleParagraphs(document);
    expect(found).toHaveLength(1);
  });

  it("selects a nested list item that is the deepest eligible block", () => {
    renderDocument(`<article><ul><li>${LONG_TEXT}</li></ul></article>`);
    const found = findEligibleParagraphs(document);
    expect(found).toHaveLength(1);
    expect(found[0]?.tagName).toBe("LI");
  });

  it("excludes a short paragraph below the minimum length", () => {
    renderDocument(`<article><p>Too short.</p></article>`);
    expect(findEligibleParagraphs(document)).toHaveLength(0);
  });

  it("excludes a related-article teaser card outside the article root (tagesschau.de false positive)", () => {
    renderDocument(`
      <div class="related-teaser"><p>${LONG_TEXT}</p></div>
      <article><p>${LONG_TEXT} This is the real body text of the article.</p></article>
    `);
    const found = findEligibleParagraphs(document);
    expect(found).toHaveLength(1);
    expect(found[0]?.closest(".related-teaser")).toBeNull();
  });

  it("excludes a paywall CTA container (Medium false positive)", () => {
    renderDocument(`
      <article>
        <p>${LONG_TEXT} This is genuine article body text before the paywall.</p>
        <div class="paywall-cta"><p>${LONG_TEXT} Become a member to keep reading this article.</p></div>
      </article>
    `);
    const found = findEligibleParagraphs(document);
    expect(found).toHaveLength(1);
    expect(found[0]?.closest(".paywall-cta")).toBeNull();
  });

  it("does not select a parent div when it has an eligible child block (deepest-block rule)", () => {
    renderDocument(`<article><div><p>${LONG_TEXT}</p></div></article>`);
    const found = findEligibleParagraphs(document);
    expect(found).toHaveLength(1);
    expect(found[0]?.tagName).toBe("P");
  });
});

describe("applyDensityLimit", () => {
  const many = Array.from({ length: 20 }, () => document.createElement("p"));

  it("caps at 3 for low density", () => {
    expect(applyDensityLimit(many, "low")).toHaveLength(3);
  });

  it("caps at 10 for medium density", () => {
    expect(applyDensityLimit(many, "medium")).toHaveLength(10);
  });

  it("does not cap for max density", () => {
    expect(applyDensityLimit(many, "max")).toHaveLength(20);
  });
});
