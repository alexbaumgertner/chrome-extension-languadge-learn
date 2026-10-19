import type { GermanVariant } from "@sprachweise/shared";
import { HOST_TOKENS } from "@/lib/design/host-page-styles";

export const VOCAB_SPAN_CLASS = "sw-vocab";

const {
  "--color-accent-200": CHIP_FILL,
  "--color-accent-400": CHIP_EDGE,
  "--color-accent-900": CHIP_INK,
} = HOST_TOKENS;

/**
 * Inline styles rather than an injected stylesheet class — this markup lives
 * in the host page's light DOM (it must inherit the paragraph's own
 * font-size/line-height), so it can't be Shadow-DOM isolated the way actual
 * extension chrome (panel/popup/tooltips) is. Inline styles avoid leaking
 * into, or being overridden unpredictably by, host page CSS. The look is the
 * design handoff's vocabulary chip; it sets its own ink so it reads on dark
 * pages too.
 */
const VOCAB_SPAN_STYLE =
  `background:${CHIP_FILL};color:${CHIP_INK};border-radius:6px;padding:0 5px;` +
  `box-shadow:inset 0 -2px 0 ${CHIP_EDGE};-webkit-box-decoration-break:clone;` +
  "box-decoration-break:clone;cursor:pointer;text-decoration:none;";

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
