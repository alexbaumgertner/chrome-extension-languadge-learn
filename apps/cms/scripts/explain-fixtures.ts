/** 20 German sentences A2-B1 for scripts/explain-quality-check.ts. Each shows at least one phenomenon. */
export interface ExplainFixture {
  text: string;
  level: "A1-A2" | "B1-B2";
  /** Phenomena a good explanation would be expected to name (any one of them is enough). */
  expect: string[];
}

export const EXPLAIN_FIXTURES: ExplainFixture[] = [
  {
    text: "Ich habe gestern einen alten Freund getroffen.",
    level: "A1-A2",
    expect: ["perfekt-haben", "accusative-case", "adjective-endings"],
  },
  {
    text: "Am Wochenende fahre ich mit meiner Schwester zum See.",
    level: "A1-A2",
    expect: ["dative-after-preposition"],
  },
  {
    text: "Kannst du mir bitte das Salz geben?",
    level: "A1-A2",
    expect: ["modal-verb", "dative-case"],
  },
  { text: "Er steht jeden Morgen um sechs Uhr auf.", level: "A1-A2", expect: ["separable-verb"] },
  {
    text: "Ich kaufe keinen Kaffee, weil ich keine Zeit habe.",
    level: "A1-A2",
    expect: ["negation", "weil-denn-conjunctions", "verb-final-subordinate"],
  },
  { text: "Wohin gehst du heute Abend?", level: "A1-A2", expect: ["question-word-order"] },
  {
    text: "Das Wetter ist heute schlechter als gestern.",
    level: "A1-A2",
    expect: ["comparative-superlative"],
  },
  { text: "Ruf mich bitte morgen an!", level: "A1-A2", expect: ["imperative", "separable-verb"] },
  {
    text: "Wir sind letzten Sommer nach Italien gefahren.",
    level: "A1-A2",
    expect: ["perfekt-sein"],
  },
  {
    text: "Die Kinder spielen im Garten, und die Eltern trinken Tee.",
    level: "A1-A2",
    expect: ["two-way-prepositions", "plural-forms"],
  },
  {
    text: "Ich freue mich darauf, dich bald wiederzusehen.",
    level: "B1-B2",
    expect: ["reflexive-verb", "infinitive-with-zu"],
  },
  {
    text: "Der Mann, den ich gestern gesehen habe, wohnt neben uns.",
    level: "B1-B2",
    expect: ["relative-clause", "verb-final-subordinate"],
  },
  {
    text: "Wenn ich mehr Zeit hätte, würde ich öfter ins Kino gehen.",
    level: "B1-B2",
    expect: ["konjunktiv-ii"],
  },
  {
    text: "Das Formular muss bis Freitag ausgefüllt werden.",
    level: "B1-B2",
    expect: ["passive", "modal-verb"],
  },
  {
    text: "Obwohl es regnete, gingen wir spazieren.",
    level: "B1-B2",
    expect: ["weil-denn-conjunctions", "praeteritum"],
  },
  {
    text: "Er hat versprochen, morgen pünktlich zu kommen.",
    level: "B1-B2",
    expect: ["infinitive-with-zu", "perfekt-haben"],
  },
  {
    text: "Trotz der hohen Preise kaufen viele Leute Bio-Produkte.",
    level: "B1-B2",
    expect: ["genitive-case", "adjective-endings"],
  },
  {
    text: "Ich werde nächstes Jahr einen Deutschkurs besuchen.",
    level: "B1-B2",
    expect: ["future-werden", "accusative-case"],
  },
  { text: "Hello, I would like a coffee and a piece of cake.", level: "A1-A2", expect: [] },
  { text: "Врач сказал мне больше отдыхать и пить воду.", level: "B1-B2", expect: [] },
];
