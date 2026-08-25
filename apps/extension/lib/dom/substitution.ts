export type DisplayState = "original" | "translated";

interface ParagraphState {
  originalHtml: string;
  contentHash: string;
  displayState: DisplayState;
}

/**
 * Tracks currently-translated elements by identity, not by DOM attribute.
 * A host-driven subtree replacement naturally drops the WeakMap entry with
 * the old node (garbage collected), so a re-rendered paragraph is treated
 * as fresh/untranslated with no explicit invalidation logic — per
 * research.md §2 "Node identity" and the Host Page Integrity edge case.
 */
const paragraphStates = new WeakMap<Element, ParagraphState>();

export function getParagraphState(el: Element): ParagraphState | undefined {
  return paragraphStates.get(el);
}

export function isTranslated(el: Element): boolean {
  return paragraphStates.get(el)?.displayState === "translated";
}

/**
 * Replaces `el`'s content with `variantHtml`, saving the pre-existing
 * `innerHTML` exactly once (on first translation) so `restoreOriginal`
 * can later reproduce it byte-identically.
 */
export function applyVariant(el: Element, variantHtml: string, contentHash: string): void {
  const existing = paragraphStates.get(el);
  const originalHtml = existing ? existing.originalHtml : el.innerHTML;

  paragraphStates.set(el, {
    originalHtml,
    contentHash,
    displayState: "translated",
  });
  el.innerHTML = variantHtml;
}

/** Restores `el` to its pre-translation `innerHTML`, verbatim. */
export function restoreOriginal(el: Element): void {
  const state = paragraphStates.get(el);
  if (!state) return;
  el.innerHTML = state.originalHtml;
  paragraphStates.delete(el);
}
