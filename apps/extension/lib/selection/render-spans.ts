/** Class of a glossed word in the side panel's translation. */
export const SPAN_CLASS = "sp-word";

/**
 * The translated text as HTML with each glossed word wrapped in a button-like span carrying its
 * index in `spans` (`data-i`). `text` is the schema-checked safe subset (bare strong/em tags), the
 * same text the page path puts in `innerHTML`; nothing else is added to it but the wrapping spans.
 */
export function renderSpansHtml(
  text: string,
  spans: ReadonlyArray<{ start: number; end: number }>,
): string {
  let html = "";
  let cursor = 0;
  spans.forEach((span, index) => {
    html += text.slice(cursor, span.start);
    html += `<span class="${SPAN_CLASS}" data-i="${index}" tabindex="0" role="button">${text.slice(span.start, span.end)}</span>`;
    cursor = span.end;
  });
  return html + text.slice(cursor);
}

/** The glossed word as plain text (tags the model put inside it removed). */
export function plainWord(text: string, span: { start: number; end: number }): string {
  return text.slice(span.start, span.end).replace(/<\/?[a-z]+>/gi, "");
}
