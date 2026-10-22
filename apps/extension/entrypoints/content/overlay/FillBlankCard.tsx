import { useState } from "react";
import type { FillBlankExercise } from "@sprachweise/shared";
import { vocabIdFor } from "@/lib/vocab/upsert";
import type { OnAnswer } from "./types";
import BlankedSentence from "./BlankedSentence";
import { t } from "@/lib/i18n";

export default function FillBlankCard({
  kicker,
  exercise,
  onAnswer,
}: {
  kicker: string;
  exercise: FillBlankExercise;
  onAnswer: OnAnswer;
}) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(
    exercise.lastAttempt ? (exercise.lastAttempt.correct ? "correct" : "incorrect") : null,
  );

  async function submit(): Promise<void> {
    const correct = await onAnswer(exercise, value, [vocabIdFor(exercise.correctAnswer)]);
    setResult(correct ? "correct" : "incorrect");
  }

  const inputState =
    result === "correct" ? " sw-input-ok" : result === "incorrect" ? " sw-input-bad" : "";

  return (
    <div className="sw-card card elev-sm">
      <span className="card-kicker">{kicker}</span>
      <BlankedSentence text={exercise.prompt.blankedSentence} />
      <div className="sw-answer-row">
        <input
          className={`input${inputState}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={result !== null}
          placeholder={t("fillBlankPlaceholder")}
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
        <p className="sw-feedback">{t("fillBlankWrong", exercise.sourceSentence)}</p>
      )}
      {result === "correct" && <p className="sw-feedback-ok">{t("exerciseCorrect")}</p>}
    </div>
  );
}
