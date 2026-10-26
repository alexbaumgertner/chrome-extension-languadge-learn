import { useState } from "react";
import type { TranslateToGermanExercise } from "@sprachweise/shared";
import { vocabIdFor } from "@/lib/vocab/upsert";
import type { OnAnswer } from "./types";
import { t } from "@/lib/i18n";

export default function TranslateToGermanCard({
  kicker,
  exercise,
  onAnswer,
}: {
  kicker: string;
  exercise: TranslateToGermanExercise;
  onAnswer: OnAnswer;
}) {
  const [value, setValue] = useState(
    typeof exercise.lastAttempt?.submittedAnswer === "string"
      ? exercise.lastAttempt.submittedAnswer
      : "",
  );
  const [result, setResult] = useState<"correct" | "incorrect" | null>(
    exercise.lastAttempt ? (exercise.lastAttempt.correct ? "correct" : "incorrect") : null,
  );
  const vocabIds = [vocabIdFor(exercise.correctAnswer)];

  async function submit(): Promise<void> {
    const correct = await onAnswer(exercise, value, vocabIds);
    setResult(correct ? "correct" : "incorrect");
  }

  // The Russian gloss can fit several German words: the learner may overrule a wrong grade.
  async function overrule(): Promise<void> {
    const correct = await onAnswer(exercise, value, vocabIds, true);
    setResult(correct ? "correct" : "incorrect");
  }

  const inputState =
    result === "correct" ? " sw-input-ok" : result === "incorrect" ? " sw-input-bad" : "";

  return (
    <div className="sw-card card elev-sm">
      <span className="card-kicker">{kicker}</span>
      <p className="sw-instruction">{t("translateInstruction", exercise.prompt.russian)}</p>
      <div className="sw-answer-row">
        <input
          className={`input${inputState}`}
          lang="de"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && result === null && value.trim().length > 0) void submit();
          }}
          disabled={result !== null}
          placeholder={t("translatePlaceholder")}
        />
        <button
          className="sw-submit btn btn-primary"
          onClick={() => void submit()}
          disabled={result !== null || value.trim().length === 0}
        >
          {t("exerciseCheck")}
        </button>
      </div>
      {result === "incorrect" && (
        <>
          <p className="sw-feedback">{t("translateWrong", exercise.correctAnswer)}</p>
          <button className="btn btn-ghost" onClick={() => void overrule()}>
            {t("translateIWasRight")}
          </button>
        </>
      )}
      {result === "correct" && <p className="sw-feedback-ok">{t("exerciseCorrect")}</p>}
    </div>
  );
}
