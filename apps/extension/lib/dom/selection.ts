/**
 * Turns the learner's text selection into what gets translated: the exact selected text when it
 * lies inside one block, otherwise every whole block it touches. A "block" is the nearest
 * paragraph-like ancestor (p, li, h1–h6, blockquote, td, div, …) — the unit the substitution
 * engine saves and restores.
 */

const BLOCK_TAGS = new Set([
  "P",
  "LI",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BLOCKQUOTE",
  "DD",
  "DT",
  "FIGCAPTION",
  "CAPTION",
  "TD",
  "TH",
  "SUMMARY",
  "LEGEND",
  "ADDRESS",
  "DIV",
  "SECTION",
  "ARTICLE",
  "MAIN",
  "ASIDE",
  "HEADER",
  "FOOTER",
  "NAV",
  "FIGURE",
  "DETAILS",
]);

/** Text under these is never sent: code, scripts, form controls. */
const SKIPPED_ANCESTOR_SELECTOR =
  "script,style,noscript,template,code,pre,kbd,samp,svg,textarea,select,option";

const EDITABLE_SELECTOR = '[contenteditable]:not([contenteditable="false"]),input,textarea';

export type SelectionTarget =
  /** Inside one block and not all of it: replace exactly `range`. */
  | { kind: "range"; block: HTMLElement; range: Range; text: string }
  /** Whole blocks, in document order, none inside another. */
  | { kind: "blocks"; blocks: HTMLElement[] };

export type SelectionProblem =
  /** Nothing readable selected (collapsed, whitespace only, or only code/controls). */
  | "empty"
  /** The selection is in an editable field — translating it would rewrite the learner's input. */
  | "editable";

interface TextPiece {
  node: Text;
  start: number;
  end: number;
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** A block's text as sent for translation (rendered text, so `<br>` and hidden content apply). */
export function blockText(el: HTMLElement): string {
  return (el.innerText ?? el.textContent ?? "").trim();
}

function nearestBlock(node: Node): HTMLElement | null {
  for (let el = node.parentElement; el; el = el.parentElement) {
    if (el.tagName === "BODY" || el.tagName === "HTML") return null;
    if (BLOCK_TAGS.has(el.tagName)) return el;
  }
  return null;
}

/** The selected part of each text node, skipping whitespace-only parts and skipped ancestors. */
function selectedPieces(range: Range): TextPiece[] {
  const root = range.commonAncestorContainer;
  const candidates: Text[] = [];
  if (root.nodeType === Node.TEXT_NODE) {
    candidates.push(root as Text);
  } else {
    const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (range.intersectsNode(n)) candidates.push(n as Text);
    }
  }
  const pieces: TextPiece[] = [];
  for (const node of candidates) {
    if (node.parentElement?.closest(SKIPPED_ANCESTOR_SELECTOR)) continue;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.data.length;
    if (node.data.slice(start, end).trim().length === 0) continue;
    pieces.push({ node, start, end });
  }
  return pieces;
}

/** A range over exactly the pieces' text, with leading and trailing whitespace left out. */
function trimmedRange(pieces: TextPiece[]): Range {
  const first = pieces[0]!;
  const last = pieces[pieces.length - 1]!;
  const leading = first.node.data.slice(first.start, first.end).search(/\S/);
  const lastText = last.node.data.slice(last.start, last.end);
  const trailing = lastText.length - lastText.trimEnd().length;
  const range = first.node.ownerDocument.createRange();
  range.setStart(first.node, first.start + leading);
  range.setEnd(last.node, last.end - trailing);
  return range;
}

export function resolveSelection(range: Range): SelectionTarget | { problem: SelectionProblem } {
  if (range.collapsed) return { problem: "empty" };
  const pieces = selectedPieces(range);
  if (pieces.some((p) => p.node.parentElement?.closest(EDITABLE_SELECTOR))) {
    return { problem: "editable" };
  }

  const pieceBlocks = pieces.map((p) => nearestBlock(p.node));
  const blocks = [...new Set(pieceBlocks.filter((b): b is HTMLElement => b !== null))];
  // Keep only the outermost: translating a block also replaces every block inside it.
  const outermost = blocks.filter((b) => !blocks.some((other) => other !== b && other.contains(b)));
  if (outermost.length === 0) return { problem: "empty" };

  const block = outermost[0]!;
  const allInOneBlock = outermost.length === 1 && pieceBlocks.every((b) => b === block);
  if (allInOneBlock) {
    const selected = trimmedRange(pieces);
    const text = normalizeWhitespace(selected.toString());
    if (text !== normalizeWhitespace(block.textContent ?? "")) {
      return { kind: "range", block, range: selected, text };
    }
  }
  return { kind: "blocks", blocks: outermost };
}
