import { z } from "zod";
import { LevelSchema } from "./storage";

/**
 * Longest fragment "Explain" takes. Same number as the side panel's fragment cap
 * (SELECTION_MAX_CHARS in messages.ts, which can't be imported here without a cycle).
 */
export const EXPLAIN_MAX_CHARS = 600;

/**
 * Closed list of grammar phenomena A1-B2 that the explanation may name. The model picks from it,
 * so topics never fragment into free-text variants; the Russian titles are shown to the learner
 * and come from here, not from the model. The same ids will be the `topic` of grammar practice.
 */
export const GRAMMAR_PHENOMENA = [
  { id: "present-tense", titleRu: "Präsens: спряжение глаголов" },
  { id: "verb-position-main-clause", titleRu: "Порядок слов: глагол на втором месте" },
  { id: "question-word-order", titleRu: "Порядок слов в вопросе" },
  { id: "negation", titleRu: "Отрицание: nicht и kein" },
  { id: "articles-gender", titleRu: "Артикли и род существительных" },
  { id: "plural-forms", titleRu: "Множественное число" },
  { id: "accusative-case", titleRu: "Аккузатив (прямое дополнение)" },
  { id: "dative-case", titleRu: "Датив (косвенное дополнение)" },
  { id: "genitive-case", titleRu: "Генитив" },
  {
    id: "dative-after-preposition",
    titleRu: "Датив после предлогов (mit, bei, von, zu, aus, nach)",
  },
  {
    id: "accusative-after-preposition",
    titleRu: "Аккузатив после предлогов (für, durch, ohne, gegen)",
  },
  {
    id: "two-way-prepositions",
    titleRu: "Предлоги с аккузативом или дативом (in, auf, an, über…)",
  },
  { id: "adjective-endings", titleRu: "Окончания прилагательных" },
  { id: "comparative-superlative", titleRu: "Сравнительная и превосходная степень" },
  { id: "possessive-pronouns", titleRu: "Притяжательные местоимения" },
  { id: "personal-pronouns-cases", titleRu: "Личные местоимения в падежах" },
  { id: "reflexive-verb", titleRu: "Возвратные глаголы" },
  { id: "separable-verb", titleRu: "Отделяемые приставки" },
  { id: "modal-verb", titleRu: "Модальные глаголы" },
  { id: "perfekt-haben", titleRu: "Perfekt с haben" },
  { id: "perfekt-sein", titleRu: "Perfekt с sein" },
  { id: "praeteritum", titleRu: "Präteritum: простое прошедшее" },
  { id: "future-werden", titleRu: "Futur I (werden + инфинитив)" },
  { id: "imperative", titleRu: "Повелительное наклонение" },
  { id: "infinitive-with-zu", titleRu: "Инфинитив с zu" },
  { id: "verb-final-subordinate", titleRu: "Придаточное: глагол в конце" },
  { id: "weil-denn-conjunctions", titleRu: "Союзы weil, denn, dass, wenn, obwohl" },
  { id: "relative-clause", titleRu: "Относительные придаточные" },
  { id: "passive", titleRu: "Пассив" },
  { id: "konjunktiv-ii", titleRu: "Konjunktiv II (würde, hätte, wäre)" },
] as const;

const GRAMMAR_IDS = GRAMMAR_PHENOMENA.map((p) => p.id) as [
  (typeof GRAMMAR_PHENOMENA)[number]["id"],
  ...Array<(typeof GRAMMAR_PHENOMENA)[number]["id"]>,
];

export const GrammarIdSchema = z.enum(GRAMMAR_IDS);

/** The Russian title shown for a phenomenon. */
export function grammarTitleRu(id: z.infer<typeof GrammarIdSchema>): string {
  return GRAMMAR_PHENOMENA.find((p) => p.id === id)?.titleRu ?? id;
}

export const PosSchema = z.enum([
  "noun",
  "verb",
  "auxiliary",
  "modal",
  "adjective",
  "adverb",
  "pronoun",
  "article",
  "preposition",
  "conjunction",
  "particle",
  "numeral",
  "interjection",
  "other",
]);

export const ExplainRequestSchema = z.object({
  text: z.string().min(1),
  level: LevelSchema,
});

const SpanSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
});

export const ExplainTokenSchema = z.object({
  /** Exactly as in `germanText`. */
  surface: z.string().min(1),
  /** Dictionary form: nouns with the article ("das Haus"), separable verbs with the prefix. */
  lemma: z.string().min(1),
  pos: PosSchema,
  /** Form in short Russian, e.g. "Akkusativ, Singular" or "3. Person, Präsens". */
  morph: z.string().min(1).optional(),
  glossRu: z.string().min(1),
  /** Where `surface` sits in `germanText`. Ordered and not overlapping across tokens. */
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
});

export const ExplainGrammarSchema = z.object({
  id: GrammarIdSchema,
  titleRu: z.string().min(1),
  explanationRu: z.string().min(1),
  /** The words in `germanText` that show the phenomenon. */
  surfaceSpans: z.array(SpanSchema).min(1),
});

export const ExplainResponseSchema = z
  .object({
    /** The German text that was analysed: the fragment itself, or its translation if it wasn't German. */
    germanText: z.string().min(1),
    translationRu: z.string().min(1),
    tokens: z.array(ExplainTokenSchema).min(1),
    grammar: z.array(ExplainGrammarSchema).max(3),
    cache: z.enum(["hit", "miss"]).optional(),
    model: z.string().min(1).optional(),
    promptVersion: z.string().min(1).optional(),
  })
  .refine((res) => res.tokens.every((t) => t.start < t.end && t.end <= res.germanText.length), {
    message: "token spans must be in-bounds with start < end",
  })
  .refine((res) => res.tokens.every((t) => res.germanText.slice(t.start, t.end) === t.surface), {
    message: "token surface must exactly match the germanText substring at its position",
  })
  .refine(
    (res) => {
      let prevEnd = 0;
      return res.tokens.every((t) => {
        const ok = t.start >= prevEnd;
        prevEnd = t.end;
        return ok;
      });
    },
    { message: "tokens must be ordered and not overlapping" },
  )
  .refine(
    (res) =>
      res.grammar.every((g) =>
        g.surfaceSpans.every((s) => s.start < s.end && s.end <= res.germanText.length),
      ),
    { message: "grammar spans must be in-bounds with start < end" },
  )
  .refine((res) => new Set(res.grammar.map((g) => g.id)).size === res.grammar.length, {
    message: "a grammar phenomenon may be listed once",
  });
