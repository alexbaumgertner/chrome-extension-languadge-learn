import type { CmsExercise } from "@sprachweise/shared";

export interface VocabTerm {
  german: string;
  russian: string;
}

const BLANK = "___";
const MAX_PAIRS = 5;
const DICTATION_MIN_WORDS = 3;
const DICTATION_MAX_WORDS = 12;

function stripTags(html: string): string {
  return html.replace(/<\/?[a-zA-Z][^>]*>/g, "");
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wholeWord(term: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`, "u");
}

function wordCount(sentence: string): number {
  return sentence.split(/\s+/).filter(Boolean).length;
}

/** Small stable string hash, so the same paragraph always yields the same option order. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

interface Placed {
  term: VocabTerm;
  sentence: string;
}

/**
 * Builds up to four exercises from a translated paragraph without any model call: word pairing
 * from the glossed vocabulary, a fill-the-blank (with the Russian meaning as the hint), a multiple
 * choice when there are enough terms for distractors, and a dictation sentence. Deterministic for
 * a given input. A paragraph too short for a kind just yields fewer exercises.
 */
export function generateExercises(variantText: string, markedVocab: VocabTerm[]): CmsExercise[] {
  const sentences = splitSentences(stripTags(variantText));

  const terms: VocabTerm[] = [];
  for (const v of markedVocab) {
    if (!terms.some((t) => t.german === v.german)) terms.push(v);
  }

  const placed: Placed[] = [];
  for (const term of terms) {
    const sentence = sentences.find((s) => wholeWord(term.german).test(s));
    if (sentence) placed.push({ term, sentence });
  }

  const exercises: CmsExercise[] = [];

  if (terms.length >= 2) {
    exercises.push({
      kind: "word-pairing",
      pairs: terms.slice(0, MAX_PAIRS).map(({ german, russian }) => ({ german, russian })),
    });
  }

  const fill = placed[0];
  if (fill) {
    exercises.push({
      kind: "fill-blank",
      sourceSentence: fill.sentence,
      blankedSentence: fill.sentence.replace(
        wholeWord(fill.term.german),
        `${BLANK} (${fill.term.russian})`,
      ),
      answer: fill.term.german,
    });
  }

  const choice = placed.find((p) => p !== fill && p.sentence !== fill?.sentence) ?? placed[1];
  if (choice && terms.length >= 3) {
    const distractors = terms
      .filter((t) => t.german.toLowerCase() !== choice.term.german.toLowerCase())
      .sort((a, b) => hash(a.german) - hash(b.german))
      .slice(0, 2)
      .map((t) => t.german);
    const options = [choice.term.german, ...distractors].sort(
      (a, b) => hash(`${choice.sentence}${a}`) - hash(`${choice.sentence}${b}`),
    );
    exercises.push({
      kind: "multiple-choice",
      sourceSentence: choice.sentence,
      blankedSentence: choice.sentence.replace(wholeWord(choice.term.german), BLANK),
      options,
      correctIndex: options.indexOf(choice.term.german),
    });
  }

  const dictation = sentences
    .filter((s) => {
      const n = wordCount(s);
      return n >= DICTATION_MIN_WORDS && n <= DICTATION_MAX_WORDS;
    })
    .sort((a, b) => wordCount(a) - wordCount(b))[0];
  if (dictation) {
    exercises.push({ kind: "audio-dictation", sourceSentence: dictation, answer: dictation });
  }

  return exercises;
}
