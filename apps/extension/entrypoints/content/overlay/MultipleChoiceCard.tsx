import { useState } from "react";
import type { MultipleChoiceExercise } from "@sprachweise/shared";
import { vocabIdFor } from "@/lib/vocab/upsert";
import type { OnAnswer } from "./types";

export default function MultipleChoiceCard({
  exercise,
  onAnswer,
}: {
  exercise: MultipleChoiceExercise;
  onAnswer: OnAnswer;
}) {
  const initialSelected =
    typeof exercise.lastAttempt?.submittedAnswer === "number"
      ? exercise.lastAttempt.submittedAnswer
      : null;
  const [selected, setSelected] = useState<number | null>(initialSelected);
  const [correct, setCorrect] = useState<boolean | null>(exercise.lastAttempt?.correct ?? null);

  async function choose(index: number): Promise<void> {
    if (selected !== null) return;
    setSelected(index);
    const correctWord = exercise.prompt.options[exercise.correctAnswer] ?? "";
    const isCorrect = await onAnswer(exercise, index, [vocabIdFor(correctWord)]);
    setCorrect(isCorrect);
  }

  return (
    <div className="sw-card">
      <p>{exercise.prompt.blankedSentence}</p>
      <div className="sw-options">
        {exercise.prompt.options.map((option, index) => {
          const showState = selected !== null;
          const isCorrectOption = index === exercise.correctAnswer;
          const isChosen = selected === index;
          const className = !showState
            ? "sw-opt"
            : isCorrectOption
              ? "sw-opt-correct"
              : isChosen
                ? "sw-opt-wrong"
                : "sw-opt";
          return (
            <button
              key={option}
              className={className}
              onClick={() => void choose(index)}
              disabled={showState}
            >
              {option}
            </button>
          );
        })}
      </div>
      {correct === false && (
        <p className="sw-feedback">
          Correct answer: {exercise.prompt.options[exercise.correctAnswer]} — "
          {exercise.sourceSentence}"
        </p>
      )}
      {correct === true && <p className="sw-feedback-ok">Correct!</p>}
    </div>
  );
}
