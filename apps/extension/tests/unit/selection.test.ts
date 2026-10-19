import { beforeEach, describe, expect, it } from "vitest";
import { resolveSelection, type SelectionTarget } from "@/lib/dom/selection";

function rangeOver(startNode: Node, startOffset: number, endNode: Node, endOffset: number): Range {
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}

function text(id: string): Text {
  const el = document.getElementById(id)!;
  const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
  return node as Text;
}

function blocksOf(result: ReturnType<typeof resolveSelection>): string[] {
  expect(result).toMatchObject({ kind: "blocks" });
  return (result as Extract<SelectionTarget, { kind: "blocks" }>).blocks.map((b) => b.id);
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("resolveSelection", () => {
  it("keeps a selection inside one paragraph as an exact, whitespace-trimmed range", () => {
    document.body.innerHTML = `<article><p id="p1">Erster Satz. Zweiter Satz hier. Dritter.</p></article>`;
    const node = text("p1");
    // " Zweiter Satz hier. " including the surrounding spaces.
    const result = resolveSelection(rangeOver(node, 12, node, 32));
    expect(result).toMatchObject({ kind: "range", text: "Zweiter Satz hier." });
    const target = result as Extract<SelectionTarget, { kind: "range" }>;
    expect(target.block.id).toBe("p1");
    expect(target.range.toString()).toBe("Zweiter Satz hier.");
  });

  it("keeps a range that crosses inline elements inside one block", () => {
    document.body.innerHTML = `<p id="p1">Hallo <a href="#">schöne Welt</a> und mehr Text.</p>`;
    const p = document.getElementById("p1")!;
    const link = p.querySelector("a")!.firstChild!;
    const after = p.lastChild!;
    const result = resolveSelection(rangeOver(link, 7, after, 9));
    expect(result).toMatchObject({ kind: "range", text: "Welt und mehr" });
  });

  it("treats a selection covering the whole paragraph as that block", () => {
    document.body.innerHTML = `<p id="p1">Ein ganzer Absatz.</p><p id="p2">Nächster.</p>`;
    const node = text("p1");
    expect(blocksOf(resolveSelection(rangeOver(node, 0, node, node.length)))).toEqual(["p1"]);
  });

  it("treats a triple-click selection (ending at the next block's start) as one block", () => {
    document.body.innerHTML = `<p id="p1">Ein ganzer Absatz.</p><p id="p2">Nächster.</p>`;
    const p2 = document.getElementById("p2")!;
    expect(blocksOf(resolveSelection(rangeOver(text("p1"), 0, p2, 0)))).toEqual(["p1"]);
  });

  it("expands a selection across paragraphs to every whole block it touches, in order", () => {
    document.body.innerHTML = `<article>
      <p id="p1">Erster Absatz mit Text.</p>
      <h2 id="h">Zwischentitel</h2>
      <ul><li id="li">Ein Listenpunkt.</li></ul>
      <p id="p3">Letzter Absatz.</p>
    </article>`;
    const result = resolveSelection(rangeOver(text("p1"), 7, text("li"), 4));
    expect(blocksOf(result)).toEqual(["p1", "h", "li"]);
  });

  it("keeps only the outer block when a selection touches a block and one inside it", () => {
    document.body.innerHTML = `<div id="outer">Lose Text im Container <p id="inner">und ein Absatz.</p></div>`;
    const result = resolveSelection(rangeOver(text("outer"), 5, text("inner"), 6));
    expect(blocksOf(result)).toEqual(["outer"]);
  });

  it("rejects a selection that crosses code or a form field", () => {
    for (const html of [
      `<p id="p1">Text</p><pre>const x = 1;</pre><p id="p2">Mehr</p>`,
      `<p id="p1">Text mit <code>npm i</code> darin</p><p id="p2">Mehr</p>`,
      `<p id="p1">Drücke <kbd>Strg</kbd> und</p><p id="p2">Mehr</p>`,
      `<p id="p1">Name: <input value="x"> bitte</p><p id="p2">Mehr</p>`,
      `<p id="p1">Wähle <select><option>A</option></select> aus</p><p id="p2">Mehr</p>`,
      `<p id="p1">Text</p><textarea>Entwurf</textarea><p id="p2">Mehr</p>`,
      `<p id="p1">Text</p><div contenteditable="true">Entwurf</div><p id="p2">Mehr</p>`,
    ]) {
      document.body.innerHTML = html;
      expect(resolveSelection(rangeOver(text("p1"), 0, text("p2"), 4)), html).toEqual({
        problem: "excluded",
      });
    }
  });

  it("rejects a selection made inside code", () => {
    document.body.innerHTML = `<p>Siehe <code id="c">const wert = 1;</code></p>`;
    const node = text("c");
    expect(resolveSelection(rangeOver(node, 0, node, 5))).toEqual({ problem: "excluded" });
  });

  it("rejects a selection whose replaced text would hide a script or style", () => {
    document.body.innerHTML = `<p id="p1">Vorher <script>window.x = 1;</script>nachher und mehr.</p>`;
    const p = document.getElementById("p1")!;
    expect(resolveSelection(rangeOver(p.firstChild!, 2, p.lastChild!, 5))).toEqual({
      problem: "excluded",
    });
  });

  it("ignores a script between paragraphs: it isn't visible and nothing replaces it", () => {
    document.body.innerHTML = `<p id="p1">Text</p><script>window.x = 1;</script><p id="p2">Mehr</p>`;
    expect(blocksOf(resolveSelection(rangeOver(text("p1"), 0, text("p2"), 4)))).toEqual([
      "p1",
      "p2",
    ]);
  });

  it("accepts a selection next to code that doesn't include it", () => {
    document.body.innerHTML = `<p id="p1">Erst <code>npm i</code> dann der ausgewählte Teil.</p>`;
    const p = document.getElementById("p1")!;
    expect(resolveSelection(rangeOver(p.lastChild!, 6, p.lastChild!, 26))).toMatchObject({
      kind: "range",
      text: "der ausgewählte Teil",
    });
  });

  it("reports an empty problem for a collapsed or whitespace-only selection", () => {
    document.body.innerHTML = `<p id="p1">Text   mehr</p>`;
    const node = text("p1");
    expect(resolveSelection(rangeOver(node, 2, node, 2))).toEqual({ problem: "empty" });
    expect(resolveSelection(rangeOver(node, 4, node, 7))).toEqual({ problem: "empty" });
  });

  it("refuses text inside an editable field", () => {
    document.body.innerHTML = `<div contenteditable="true"><p id="p1">Mein Entwurf</p></div>`;
    const node = text("p1");
    expect(resolveSelection(rangeOver(node, 0, node, 4))).toEqual({ problem: "editable" });
  });

  it("finds no block for text placed directly in body", () => {
    document.body.innerHTML = `Nackter Text`;
    const node = document.body.firstChild!;
    expect(resolveSelection(rangeOver(node, 0, node, 6))).toEqual({ problem: "empty" });
  });
});
