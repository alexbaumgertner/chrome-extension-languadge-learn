import { beforeEach, describe, expect, it } from "vitest";
import {
  SEGMENT_CLASS,
  applyVariant,
  applyVariantToRange,
  hasTranslations,
  isTranslated,
  rangeOverlapsTranslation,
  restoreAll,
  restoreInside,
  restoreOriginal,
} from "@/lib/dom/substitution";

function rangeIn(node: Node, start: number, end: number, endNode: Node = node): Range {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(endNode, end);
  return range;
}

beforeEach(() => {
  restoreAll();
  document.body.innerHTML = "";
});

describe("partial-range substitution", () => {
  it("replaces exactly the range and restores the block byte-identically", () => {
    document.body.innerHTML = `<p id="p">Erster Satz. Zweiter Satz. Dritter Satz.</p>`;
    const p = document.getElementById("p")!;
    const before = p.outerHTML;

    applyVariantToRange(p, rangeIn(p.firstChild!, 13, 26), "Second <em>sentence</em>.", "h1");
    expect(p.innerHTML).toBe(
      `Erster Satz. <span class="${SEGMENT_CLASS}">Second <em>sentence</em>.</span> Dritter Satz.`,
    );
    expect(isTranslated(p)).toBe(true);

    restoreOriginal(p);
    expect(p.outerHTML).toBe(before);
    expect(isTranslated(p)).toBe(false);
  });

  it("restores byte-identically when the range cut through a link", () => {
    document.body.innerHTML = `<p id="p">Hallo <a href="https://example.com">schöne Welt</a> und mehr.</p>`;
    const p = document.getElementById("p")!;
    const before = p.outerHTML;
    const linkText = p.querySelector("a")!.firstChild!;

    applyVariantToRange(p, rangeIn(linkText, 7, 4, p.lastChild!), "WORLD and", "h1");
    // Deleting the range split the link; only its unselected part stays a link.
    expect(p.innerHTML).toBe(
      `Hallo <a href="https://example.com">schöne </a><span class="${SEGMENT_CLASS}">WORLD and</span> mehr.`,
    );

    restoreOriginal(p);
    expect(p.outerHTML).toBe(before);
  });

  it("keeps the first snapshot across several segments in one block", () => {
    document.body.innerHTML = `<p id="p">Eins. Zwei. Drei.</p>`;
    const p = document.getElementById("p")!;
    const before = p.innerHTML;
    applyVariantToRange(p, rangeIn(p.firstChild!, 0, 5), "One.", "h1");
    const last = p.lastChild!;
    applyVariantToRange(
      p,
      rangeIn(last, last.textContent!.length - 5, last.textContent!.length),
      "Three.",
      "h2",
    );
    expect(p.querySelectorAll(`.${SEGMENT_CLASS}`)).toHaveLength(2);

    restoreOriginal(p);
    expect(p.innerHTML).toBe(before);
  });

  it("detects a range overlapping an existing segment or a wholly translated block", () => {
    document.body.innerHTML = `<p id="p">Eins. Zwei. Drei.</p><p id="q">Andere.</p>`;
    const p = document.getElementById("p")!;
    const segment = applyVariantToRange(p, rangeIn(p.firstChild!, 0, 5), "One.", "h1");
    expect(rangeOverlapsTranslation(p, rangeIn(segment.firstChild!, 0, 2))).toBe(true);
    expect(rangeOverlapsTranslation(p, rangeIn(p.lastChild!, 1, 5))).toBe(false);

    const q = document.getElementById("q")!;
    applyVariant(q, "Other.", "h2");
    expect(rangeOverlapsTranslation(q, rangeIn(q.firstChild!, 0, 2))).toBe(true);
  });
});

describe("restoring everything", () => {
  it("restores every translated block and segment on the page, ignoring detached ones", () => {
    document.body.innerHTML = `<p id="a">Alpha text.</p><p id="b">Beta text.</p><div id="host"><p id="c">Gamma.</p></div>`;
    const original = document.body.innerHTML;
    const a = document.getElementById("a")!;
    const b = document.getElementById("b")!;
    const c = document.getElementById("c")!;
    applyVariant(a, "ALPHA", "h1");
    applyVariantToRange(b, rangeIn(b.firstChild!, 0, 4), "BETA", "h2");
    applyVariant(c, "GAMMA", "h3");
    expect(hasTranslations()).toBe(true);

    // The host re-renders the subtree holding #c: nothing to restore there any more.
    document.getElementById("host")!.innerHTML = `<p id="c">Gamma.</p>`;

    expect(restoreAll()).toBe(2);
    expect(document.body.innerHTML).toBe(original);
    expect(hasTranslations()).toBe(false);
  });

  it("restoreInside puts back nested translations so an outer snapshot holds only originals", () => {
    document.body.innerHTML = `<div id="outer">Lose <p id="inner">Innen.</p></div>`;
    const outer = document.getElementById("outer")!;
    const inner = document.getElementById("inner")!;
    const original = outer.innerHTML;
    applyVariant(inner, "INSIDE", "h1");

    restoreInside(outer);
    expect(outer.innerHTML).toBe(original);
    applyVariant(outer, "OUTER", "h2");
    restoreOriginal(outer);
    expect(outer.innerHTML).toBe(original);
  });

  it("leaves content the host changed after translation as it is and forgets the snapshot", () => {
    document.body.innerHTML = `<p id="a">Alt.</p><p id="b">Auch alt.</p>`;
    const a = document.getElementById("a")!;
    const b = document.getElementById("b")!;
    applyVariant(a, "OLD", "h1");
    applyVariantToRange(b, rangeIn(b.firstChild!, 0, 4), "ALSO", "h2");

    // An SPA re-renders both paragraphs in place with newer content.
    a.innerHTML = "Neuer Inhalt vom Server.";
    b.querySelector(`.${SEGMENT_CLASS}`)!.textContent = "geändert";
    expect(hasTranslations()).toBe(false); // nothing left that Restore would put back

    expect(restoreAll()).toBe(0);
    expect(a.innerHTML).toBe("Neuer Inhalt vom Server.");
    expect(b.innerHTML).toBe(`<span class="${SEGMENT_CLASS}">geändert</span> alt.`);
    expect(isTranslated(a)).toBe(false);
    expect(isTranslated(b)).toBe(false);
    expect(hasTranslations()).toBe(false);
  });

  it("doesn't write a snapshot back into a detached node", () => {
    document.body.innerHTML = `<div id="host"><p id="p">Original.</p></div>`;
    const p = document.getElementById("p")!;
    applyVariant(p, "GERMAN", "h1");
    p.remove();

    restoreOriginal(p);
    expect(p.innerHTML).toBe("GERMAN");
    expect(isTranslated(p)).toBe(false);
  });
});
