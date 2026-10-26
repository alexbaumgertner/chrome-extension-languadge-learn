import { ArticleSchema, type Article, type CmsExercise } from "@sprachweise/shared";
import { buildWordOrder, isOrderableSentence } from "./word-order";

export interface VocabTerm {
  german: string;
  lemma?: string;
  russian: string;
}

const BLANK = "___";
const MAX_PAIRS = 5;
const DICTATION_MIN_WORDS = 3;
const DICTATION_MAX_WORDS = 12;
/** How many exercises one paragraph shows at most, however many candidates there are. */
export const MAX_SHOWN = 5;
/** A single word may anchor at most this many exercises (pairing is a set and does not count). */
const MAX_PER_WORD = 2;

/**
 * Nouns that only exist in the plural. Their article ("die") is not a gender, so asking for it as
 * der/die/das would teach the wrong thing. The glosses carry no number, so this is a plain list.
 */
const PLURAL_ONLY_NOUNS = new Set(
  [
    "Leute",
    "Eltern",
    "Ferien",
    "Kosten",
    "Geschwister",
    "Möbel",
    "Lebensmittel",
    "Zinsen",
    "Memoiren",
    "Flitterwochen",
    "Trümmer",
    "Unterlagen",
    "Gliedmaßen",
    "Ostern",
    "Weihnachten",
  ].map((n) => n.toLowerCase()),
);

const NOUN_LEMMA_RE = /^(der|die|das)\s+(\p{Lu}[\p{L}-]*)$/iu;

/** Splits a lemma like "das Riesenrad"; null for anything that is not a single article + noun. */
export function parseArticleLemma(
  lemma: string | undefined,
): { article: Article; noun: string } | null {
  const match = lemma ? NOUN_LEMMA_RE.exec(lemma.trim()) : null;
  const article = ArticleSchema.safeParse(match?.[1]?.toLowerCase());
  const noun = match?.[2];
  if (!article.success || !noun || PLURAL_ONLY_NOUNS.has(noun.toLowerCase())) return null;
  return { article: article.data, noun };
}

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

/** One possible exercise, plus the word it is about (for the per-word cap). */
interface Candidate {
  exercise: CmsExercise;
  word?: string;
}

/**
 * Picks the exercises to show from all candidates, in candidate order. Rules: at most one per
 * kind, at most MAX_PER_WORD per word, at most MAX_SHOWN overall. The caller orders candidates, so
 * the result is as deterministic as the input.
 */
export function selectExercises(candidates: Candidate[]): CmsExercise[] {
  const kinds = new Set<string>();
  const perWord = new Map<string, number>();
  const chosen: CmsExercise[] = [];
  for (const { exercise, word } of candidates) {
    if (chosen.length >= MAX_SHOWN) break;
    if (kinds.has(exercise.kind)) continue;
    if (word !== undefined && (perWord.get(word) ?? 0) >= MAX_PER_WORD) continue;
    kinds.add(exercise.kind);
    if (word !== undefined) perWord.set(word, (perWord.get(word) ?? 0) + 1);
    chosen.push(exercise);
  }
  return chosen;
}

/**
 * Builds the exercises for a translated paragraph without any model call. All candidates are
 * built first: word pairing from the glossed vocabulary, a fill-the-blank (with the Russian
 * meaning as the hint), a multiple choice when there are enough terms for distractors, a dictation
 * sentence, and der/die/das for the nouns. selectExercises then keeps at most MAX_SHOWN of them.
 * Deterministic for a given input (the noun is picked by a hash of the text). A paragraph too
 * short for a kind just yields fewer exercises.
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

  const candidates: Candidate[] = [];
  const lemmaOf = (t: VocabTerm): string => (t.lemma ?? t.german).toLowerCase();

  if (terms.length >= 2) {
    candidates.push({
      exercise: {
        kind: "word-pairing",
        // Pairing teaches the dictionary form; blanks below use the in-text form.
        pairs: terms
          .slice(0, MAX_PAIRS)
          .map(({ german, lemma, russian }) => ({ german: lemma ?? german, russian })),
      },
    });
  }

  const fill = placed[0];
  if (fill) {
    candidates.push({
      word: lemmaOf(fill.term),
      exercise: {
        kind: "fill-blank",
        sourceSentence: fill.sentence,
        blankedSentence: fill.sentence.replace(
          wholeWord(fill.term.german),
          `${BLANK} (${fill.term.russian})`,
        ),
        answer: fill.term.german,
      },
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
    candidates.push({
      word: lemmaOf(choice.term),
      exercise: {
        kind: "multiple-choice",
        sourceSentence: choice.sentence,
        blankedSentence: choice.sentence.replace(wholeWord(choice.term.german), BLANK),
        options,
        correctIndex: options.indexOf(choice.term.german),
      },
    });
  }

  // The first candidates are the core; what follows competes for the remaining slots (see below).
  const coreCount = candidates.length;
  const dictation = sentences
    .filter((s) => {
      const n = wordCount(s);
      return n >= DICTATION_MIN_WORDS && n <= DICTATION_MAX_WORDS;
    })
    .sort((a, b) => wordCount(a) - wordCount(b))[0];
  if (dictation) {
    candidates.push({
      exercise: { kind: "audio-dictation", sourceSentence: dictation, answer: dictation },
    });
  }

  // Nouns not yet anchoring another exercise come first; within a tier a hash of the text decides.
  const usedWords = new Set(candidates.map((c) => c.word));
  const nouns: Array<Candidate & { word: string }> = [];
  for (const term of terms) {
    const parsed = parseArticleLemma(term.lemma);
    const word = lemmaOf(term);
    if (!parsed || nouns.some((n) => n.word === word)) continue;
    nouns.push({
      word,
      exercise: {
        kind: "article-choice",
        noun: parsed.noun,
        article: parsed.article,
        russian: term.russian,
      },
    });
  }
  nouns.sort(
    (a, b) =>
      Number(usedWords.has(a.word)) - Number(usedWords.has(b.word)) ||
      hash(`${variantText}${a.word}`) - hash(`${variantText}${b.word}`),
  );
  candidates.push(...nouns);

  // Word order: a sentence that starts with its subject, preferably not the dictation one.
  const orderable = sentences
    .filter(isOrderableSentence)
    .sort(
      (a, b) =>
        Number(a === dictation) - Number(b === dictation) ||
        hash(`${variantText}${a}`) - hash(`${variantText}${b}`),
    )[0];
  const wordOrder = orderable ? buildWordOrder(orderable, hash) : null;
  if (wordOrder) candidates.push({ exercise: wordOrder });

  // Pairing, fill-blank and multiple-choice always come first. The rest (dictation, article,
  // word order) compete for what is left, ranked per kind by a hash of the text, so no kind is
  // always the one cut. The sort is stable: nouns keep their order within the article kind.
  const rank = (c: Candidate): number => hash(`${variantText}|${c.exercise.kind}`);
  const extras = candidates.splice(coreCount).sort((a, b) => rank(a) - rank(b));
  candidates.push(...extras);

  return selectExercises(candidates);
}
