import { blockText } from "./selection";

export type DisplayState = "original" | "translated";

/** Wraps a translated part of a block (a selection that didn't cover the whole block). */
export const SEGMENT_CLASS = "sw-segment";

interface ParagraphState {
  originalHtml: string;
  /** The block's text before its first change, as `blockText` read it: what re-translating sends. */
  originalText: string;
  contentHash: string;
  displayState: DisplayState;
  /** "block": the whole block shows the variant; "segments": only `.sw-segment` parts do. */
  mode: "block" | "segments";
  /**
   * The block's `innerHTML` right after our last write. Anything else at restore time means the
   * host page changed the block since (an SPA re-render, a live update): its content is newer than
   * the snapshot, so Restore leaves it alone.
   */
  writtenHtml: string;
}

/**
 * Tracks currently-translated elements by identity, not by DOM attribute.
 * A host-driven subtree replacement naturally drops the WeakMap entry with
 * the old node (garbage collected), so a re-rendered paragraph is treated
 * as fresh/untranslated with no explicit invalidation logic — per
 * research.md §2 "Node identity" and the Host Page Integrity edge case.
 */
const paragraphStates = new WeakMap<Element, ParagraphState>();
/** The same elements, enumerable for "Restore original"; detached ones are dropped when read. */
const translatedElements = new Set<Element>();

export function getParagraphState(el: Element): ParagraphState | undefined {
  return paragraphStates.get(el);
}

export function isTranslated(el: Element): boolean {
  return paragraphStates.get(el)?.displayState === "translated";
}

/** Whether `range` (inside `block`) overlaps text that already shows a translation. */
export function rangeOverlapsTranslation(block: Element, range: Range): boolean {
  const state = paragraphStates.get(block);
  if (!state) return false;
  if (state.mode === "block") return true;
  return [...block.querySelectorAll(`.${SEGMENT_CLASS}`)].some((seg) => range.intersectsNode(seg));
}

function saveOriginal(el: Element, contentHash: string, mode: ParagraphState["mode"]): void {
  const existing = paragraphStates.get(el);
  paragraphStates.set(el, {
    originalHtml: existing ? existing.originalHtml : el.innerHTML,
    originalText: existing ? existing.originalText : blockText(el as HTMLElement),
    contentHash,
    displayState: "translated",
    mode,
    writtenHtml: "",
  });
  translatedElements.add(el);
}

function rememberWritten(el: Element): void {
  paragraphStates.get(el)!.writtenHtml = el.innerHTML;
}

/** The text `el` had before it was first translated; undefined if it isn't translated. */
export function originalText(el: Element): string | undefined {
  return paragraphStates.get(el)?.originalText;
}

/** Whether `el` still shows exactly what we last wrote into it, on the page. */
export function showsOurWrite(el: Element): boolean {
  const state = paragraphStates.get(el);
  return !!state && el.isConnected && el.innerHTML === state.writtenHtml;
}

/**
 * Replaces `el`'s content with `variantHtml`, saving the pre-existing
 * `innerHTML` exactly once (on first translation) so `restoreOriginal`
 * can later reproduce it byte-identically. On a block already showing a
 * translation it simply replaces that, keeping the first snapshot.
 */
export function applyVariant(el: Element, variantHtml: string, contentHash: string): void {
  saveOriginal(el, contentHash, "block");
  el.innerHTML = variantHtml;
  rememberWritten(el);
}

/**
 * Replaces only `range`, which lies inside `block`, with `variantHtml` wrapped in a
 * `<span class="sw-segment">`. The block's whole `innerHTML` from before its first translation is
 * what gets saved, so `restoreOriginal(block)` is byte-identical however many segments were added
 * — even when the range cut through an inline element (a link, `<b>`), which deleting the range
 * splits. Returns the segment.
 */
export function applyVariantToRange(
  block: Element,
  range: Range,
  variantHtml: string,
  contentHash: string,
): HTMLElement {
  const wholeBlock = paragraphStates.get(block)?.mode === "block";
  saveOriginal(block, contentHash, wholeBlock ? "block" : "segments");
  const segment = block.ownerDocument.createElement("span");
  segment.className = SEGMENT_CLASS;
  range.deleteContents();
  range.insertNode(segment);
  segment.innerHTML = variantHtml;
  rememberWritten(block);
  return segment;
}

/**
 * Restores `el` to its pre-translation `innerHTML`, verbatim — unless the host changed `el` since
 * our last write or removed it from the page: then the snapshot is dropped, nothing is written and
 * the host's content stays. Returns whether it wrote the original back.
 */
export function restoreOriginal(el: Element): boolean {
  const state = paragraphStates.get(el);
  translatedElements.delete(el);
  if (!state) return false;
  const ours = showsOurWrite(el);
  paragraphStates.delete(el);
  if (ours) el.innerHTML = state.originalHtml;
  return ours;
}

/** Whether anything on the page still shows a translation Restore would put back. */
export function hasTranslations(): boolean {
  for (const el of translatedElements) {
    if (!el.isConnected) translatedElements.delete(el);
  }
  return [...translatedElements].some(showsOurWrite);
}

/** Restores every translated element the host hasn't changed or removed; returns how many. */
export function restoreAll(): number {
  let restored = 0;
  for (const el of [...translatedElements]) {
    if (restoreOriginal(el)) restored++;
  }
  return restored;
}
