import type { GermanVariant } from "@sprachweise/shared";

export const VOCAB_SPAN_CLASS = "sw-vocab";

/**
 * Inline styles rather than an injected stylesheet class — this markup lives
 * in the host page's light DOM (it must inherit the paragraph's own
 * font-size/line-height), so it can't be Shadow-DOM isolated the way actual
 * extension chrome (panel/popup/tooltips) is. Inline styles avoid leaking
 * into, or being overridden unpredictably by, host page CSS.
 */
const VOCAB_SPAN_STYLE =
  "border-bottom:2px dotted currentColor;cursor:pointer;text-decoration:none;";

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * Renders a German Variant's safe-HTML-subset text, wrapping each
 * markedVocab character-offset span in a visually distinct inline element
 * (data-model.md GermanVariant.markedVocab). The paragraph's own font-size
 * and line-height apply automatically since this is set as innerHTML on the
 * same element — no separate styling is injected.
 */
export function renderVariantHtml(variant: GermanVariant): string {
  const sorted = [...variant.markedVocab].sort((a, b) => a.start - b.start);
  let html = "";
  let cursor = 0;
  for (const span of sorted) {
    html += variant.text.slice(cursor, span.start);
    const word = variant.text.slice(span.start, span.end);
    html += `<span class="${VOCAB_SPAN_CLASS}" style="${VOCAB_SPAN_STYLE}" data-vocab-id="${escapeAttr(span.vocabId)}" tabindex="0" role="button" aria-label="Reveal meaning">${word}</span>`;
    cursor = span.end;
  }
  html += variant.text.slice(cursor);
  return html;
}
