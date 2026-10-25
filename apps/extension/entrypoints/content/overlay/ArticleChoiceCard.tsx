import { useState } from "react";
import { ArticleSchema, type Article, type ArticleChoiceExercise } from "@sprachweise/shared";
import { vocabIdFor } from "@/lib/vocab/upsert";
import type { OnAnswer } from "./types";
import { t } from "@/lib/i18n";

const ARTICLES = ArticleSchema.options;

export default function ArticleChoiceCard({
  kicker,
  exercise,
  onAnswer,
}: {
  kicker: string;
  exercise: ArticleChoiceExercise;
  onAnswer: OnAnswer;
}) {
  const previous = ArticleSchema.safeParse(exercise.lastAttempt?.submittedAnswer);
  const [selected, setSelected] = useState<Article | null>(previous.success ? previous.data : null);
  const [correct, setCorrect] = useState<boolean | null>(exercise.lastAttempt?.correct ?? null);
  const { noun, russian } = exercise.prompt;

  async function choose(article: Article): Promise<void> {
    if (selected !== null) return;
    setSelected(article);
    // The vocabulary item is the dictionary form with its article, e.g. "das riesenrad".
    const vocabId = vocabIdFor([exercise.correctAnswer, noun].join(" "));
    setCorrect(await onAnswer(exercise, article, [vocabId]));
  }

  return (
    <div className="sw-card card elev-sm">
      <span className="card-kicker">{kicker}</span>
      <p className="sw-instruction">{t("articleChoiceInstruction", noun)}</p>
      <p className="sw-instruction">{russian}</p>
      <div className="sw-articles">
        {ARTICLES.map((article) => {
          const showState = selected !== null;
          const className = !showState
            ? "sw-opt"
            : article === exercise.correctAnswer
              ? "sw-opt-correct"
              : article === selected
                ? "sw-opt-wrong"
                : "sw-opt";
          return (
            <button
              key={article}
              className={`${className} sw-choice btn btn-secondary`}
              onClick={() => void choose(article)}
              disabled={showState}
            >
              {article}
            </button>
          );
        })}
      </div>
      {correct === false && (
        <p className="sw-feedback">{t("articleChoiceWrong", [exercise.correctAnswer, noun])}</p>
      )}
      {correct === true && <p className="sw-feedback-ok">{t("exerciseCorrect")}</p>}
    </div>
  );
}
