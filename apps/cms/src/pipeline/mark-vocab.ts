import type { VocabGloss } from "./translate";

export interface MarkedVocabSpan {
  start: number;
  end: number;
  german: string;
  lemma?: string;
  russian: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function insideTag(text: string, index: number): boolean {
  const lastOpen = text.lastIndexOf("<", index);
  return lastOpen !== -1 && text.lastIndexOf(">", index) < lastOpen;
}

/**
 * Turns model-picked vocabulary into spans over the German text. A term is matched as a whole word
 * (so "Ruhe" never marks part of "Ruhestand"), outside any tag, and not overlapping a span already
 * taken. Terms that can't be placed, duplicates, and blank glosses are dropped — never an error.
 */
export function markVocab(text: string, vocab: VocabGloss[]): MarkedVocabSpan[] {
  const spans: MarkedVocabSpan[] = [];
  const seen = new Set<string>();

  for (const { german: rawGerman, lemma: rawLemma, russian: rawRussian } of vocab) {
    const german = rawGerman.trim();
    const russian = rawRussian.trim();
    const lemma = rawLemma?.trim();
    if (!german || !russian || /[<>]/.test(german) || seen.has(german)) continue;

    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(german)}(?![\\p{L}\\p{N}])`,
      "gu",
    );
    for (const match of text.matchAll(pattern)) {
      const start = match.index;
      const end = start + german.length;
      if (insideTag(text, start)) continue;
      if (spans.some((s) => start < s.end && s.start < end)) continue;
      spans.push({ start, end, german, ...(lemma ? { lemma } : {}), russian });
      seen.add(german);
      break;
    }
  }

  return spans.sort((a, b) => a.start - b.start);
}
