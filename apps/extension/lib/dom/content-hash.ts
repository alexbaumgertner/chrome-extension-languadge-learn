/**
 * Deterministic hash of a paragraph's extracted plain text, used as the
 * cache key into IndexedDB (data-model.md Paragraph.contentHash). FNV-1a is
 * sufficient here — this is a cache key, not a security boundary.
 */
export function hashParagraphText(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
