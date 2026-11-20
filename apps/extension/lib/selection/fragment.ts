import { SELECTION_MAX_CHARS } from "@sprachweise/shared";

export interface Fragment {
  text: string;
  /** The selection was longer than SELECTION_MAX_CHARS; `text` is its start. */
  truncated: boolean;
}

/**
 * The part of a context-menu selection a side-panel tool works on: trimmed, at most
 * SELECTION_MAX_CHARS long, null when nothing but whitespace was selected. A cut never leaves half
 * of a surrogate pair at the end.
 */
export function toFragment(selectionText: string | undefined): Fragment | null {
  const trimmed = selectionText?.trim() ?? "";
  if (trimmed === "") return null;
  if (trimmed.length <= SELECTION_MAX_CHARS) return { text: trimmed, truncated: false };

  let end = SELECTION_MAX_CHARS;
  const last = trimmed.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return { text: trimmed.slice(0, end).trimEnd(), truncated: true };
}
