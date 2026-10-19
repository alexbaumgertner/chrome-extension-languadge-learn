/**
 * Turns the learner's text selection into what gets translated, one part per leaf block it
 * touches: the whole block when the selection covers all of it, otherwise exactly the selected
 * text inside it. A leaf block is a paragraph-like element (p, li, h1–h6, blockquote, td, div, …)
 * with no block-level element inside — the unit the substitution engine saves and restores, so a
 * container holding other blocks, form fields or unselected paragraphs is never replaced.
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

/** Anything of these inside a block makes it a container, not a leaf. */
const BLOCK_LEVEL_SELECTOR = [
  ...[...BLOCK_TAGS].map((t) => t.toLowerCase()),
  "ul",
  "ol",
  "dl",
  "menu",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "pre",
  "hr",
  "form",
  "fieldset",
  "hgroup",
  "dialog",
].join(",");

/** Text under these is never sent: code, scripts, form controls. */
const SKIPPED_ANCESTOR_SELECTOR =
  "script,style,noscript,template,code,pre,kbd,samp,svg,textarea,select,option";

const EDITABLE_SELECTOR = '[contenteditable]:not([contenteditable="false"]),input,textarea';

/**
 * Content the learner can see that a translation can't carry: replacing it would turn code into
 * prose or drop a form control. A selection crossing any of it is refused, never split.
 */
const VISIBLE_EXCLUDED_SELECTOR = `code,pre,kbd,samp,textarea,input,select,button,${EDITABLE_SELECTOR}`;
/** Controls: selected by covering the element itself, not text inside it. */
const CONTROL_SELECTOR = "textarea,input,select,button";
/**
 * Not rendered, so a selection over a script between paragraphs is fine; but one inside what gets
 * replaced would be deleted with it.
 */
const HIDDEN_EXCLUDED_SELECTOR = "script,style,noscript,template";
/** A leaf holding any of these is replaced only around the selected text, never whole. */
const KEEP_WHOLE_SELECTOR = `${VISIBLE_EXCLUDED_SELECTOR},${HIDDEN_EXCLUDED_SELECTOR},iframe,object,embed,video,audio,canvas`;

/** One leaf block's share of the selection. */
export interface SelectionPart {
  block: HTMLElement;
  /** The exact text to replace inside `block`; null to replace the whole block. */
  range: Range | null;
  /** What gets sent: the range's text, or the whole block's. */
  text: string;
}

/** The parts in document order, each in a different leaf block. */
export interface SelectionTarget {
  parts: SelectionPart[];
}

export type SelectionProblem =
  /** Nothing readable selected (collapsed or whitespace only). */
  | "empty"
  /** The selection is in an editable field — translating it would rewrite the learner's input. */
  | "editable"
  /** The selection includes code or a form field (`VISIBLE_EXCLUDED_SELECTOR` and the like). */
  | "excluded"
  /** Selected text sits outside every leaf block (directly in a container or in body). */
  | "mixed";

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

/** The leaf block `node`'s text belongs to, or null if it sits in a container or outside blocks. */
function leafBlock(node: Node): HTMLElement | null {
  const block = nearestBlock(node);
  return block && !block.querySelector(BLOCK_LEVEL_SELECTOR) ? block : null;
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

function elementOf(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

/** Whether `range` takes in some of `el`: the control itself, or non-blank text inside it. */
function rangeTakesIn(range: Range, el: Element): boolean {
  if (!range.intersectsNode(el)) return false;
  if (el.matches(CONTROL_SELECTOR)) return true;
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    if (!range.intersectsNode(n)) continue;
    const start = n === range.startContainer ? range.startOffset : 0;
    const end = n === range.endContainer ? range.endOffset : n.data.length;
    if (n.data.slice(start, end).trim().length > 0) return true;
  }
  return false;
}

/** Whether the selection includes visible code or a form field, or starts or ends inside one. */
function crossesExcluded(range: Range): boolean {
  for (const node of [range.startContainer, range.endContainer]) {
    if (elementOf(node)?.closest(VISIBLE_EXCLUDED_SELECTOR)) return true;
  }
  const root = elementOf(range.commonAncestorContainer);
  if (!root) return false;
  return [...root.querySelectorAll(VISIBLE_EXCLUDED_SELECTOR)].some((el) =>
    rangeTakesIn(range, el),
  );
}

/** Whether replacing exactly `range` inside `block` would delete a script or style with it. */
function rangeHidesExcluded(block: HTMLElement, range: Range): boolean {
  return [...block.querySelectorAll(HIDDEN_EXCLUDED_SELECTOR)].some((el) =>
    range.intersectsNode(el),
  );
}

/** `block`'s part: whole if the selection covers all its text and nothing would be lost. */
function partOf(block: HTMLElement, pieces: TextPiece[]): SelectionPart {
  const range = trimmedRange(pieces);
  const text = normalizeWhitespace(range.toString());
  const coversAll = text === normalizeWhitespace(block.textContent ?? "");
  if (coversAll && !block.querySelector(KEEP_WHOLE_SELECTOR)) {
    return { block, range: null, text: blockText(block) };
  }
  return { block, range, text };
}

export function resolveSelection(range: Range): SelectionTarget | { problem: SelectionProblem } {
  if (range.collapsed) return { problem: "empty" };
  const inEditable = [range.startContainer, range.endContainer].every((n) =>
    elementOf(n)?.closest(EDITABLE_SELECTOR),
  );
  if (inEditable) return { problem: "editable" };
  if (crossesExcluded(range)) return { problem: "excluded" };
  const pieces = selectedPieces(range);
  if (pieces.length === 0) return { problem: "empty" };

  // Pieces come in document order and leaves don't nest, so each leaf's pieces are consecutive.
  const groups: Array<{ block: HTMLElement; pieces: TextPiece[] }> = [];
  for (const piece of pieces) {
    const block = leafBlock(piece.node);
    if (!block) return { problem: "mixed" };
    const last = groups[groups.length - 1];
    if (last?.block === block) last.pieces.push(piece);
    else groups.push({ block, pieces: [piece] });
  }
  const parts = groups.map((g) => partOf(g.block, g.pieces));
  if (parts.some((p) => p.range && rangeHidesExcluded(p.block, p.range))) {
    return { problem: "excluded" };
  }
  return { parts };
}
