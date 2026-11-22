export interface Segment {
  text: string;
  /** Index into the token list when this piece is a word; undefined for the text between words. */
  token?: number;
}

/**
 * Splits `germanText` into the words of the breakdown and the plain pieces between them (spaces,
 * punctuation), so the panel can render every word as a button without touching innerHTML. The
 * tokens are ordered and not overlapping (checked by the response schema).
 */
export function explainSegments(
  germanText: string,
  tokens: ReadonlyArray<{ start: number; end: number }>,
): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  tokens.forEach((token, index) => {
    if (token.start > cursor) segments.push({ text: germanText.slice(cursor, token.start) });
    segments.push({ text: germanText.slice(token.start, token.end), token: index });
    cursor = token.end;
  });
  if (cursor < germanText.length) segments.push({ text: germanText.slice(cursor) });
  return segments;
}
