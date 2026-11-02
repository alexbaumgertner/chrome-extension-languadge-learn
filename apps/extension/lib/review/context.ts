/** Longest context sentence kept per word (matches VocabularyItemSchema). */
export const CONTEXT_SENTENCE_MAX = 200;

// The translated text is a safe HTML subset: bare <strong>/<em> only.
const TAG_RE = /<\/?(?:strong|em)>/g;

function stripTags(html: string): string {
  return html.replace(TAG_RE, "");
}

function isSentenceEnd(text: string, index: number): boolean {
  const char = text[index];
  if (char !== "." && char !== "!" && char !== "?") return false;
  const next = text[index + 1];
  return next === undefined || /\s/.test(next);
}

/**
 * The sentence of `text` that holds the span [start, end), without markup and cut to
 * CONTEXT_SENTENCE_MAX characters around the word, plus the word as written there. Offsets are
 * into `text` (the markup included), as the backend reports them.
 */
export function extractContextSentence(
  text: string,
  start: number,
  end: number,
): { sentence: string; form: string } {
  let from = 0;
  for (let i = start - 1; i >= 0; i--) {
    if (isSentenceEnd(text, i)) {
      from = i + 1;
      break;
    }
  }
  let to = text.length;
  for (let i = end; i < text.length; i++) {
    if (isSentenceEnd(text, i)) {
      to = i + 1;
      break;
    }
  }

  const before = stripTags(text.slice(from, start)).replace(/^\s+/, "");
  const form = stripTags(text.slice(start, end));
  const after = stripTags(text.slice(end, to)).replace(/\s+$/, "");

  let sentence = before + form + after;
  const formStart = before.length;
  if (sentence.length > CONTEXT_SENTENCE_MAX) {
    // Keep the word in the window: centre it, then clamp to the sentence.
    const room = CONTEXT_SENTENCE_MAX - form.length;
    const windowStart = Math.min(
      Math.max(0, formStart - Math.floor(room / 2)),
      sentence.length - CONTEXT_SENTENCE_MAX,
    );
    sentence = sentence.slice(windowStart, windowStart + CONTEXT_SENTENCE_MAX);
  }
  return { sentence: sentence.trim(), form };
}
