import { useState } from "react";
import type { FillBlankExercise } from "@sprachweise/shared";
import { vocabIdFor } from "@/lib/vocab/upsert";
import type { OnAnswer } from "./types";

export default function FillBlankCard({
  exercise,
  onAnswer,
}: {
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

  return (
    <div className="sw-card">
      <p>{exercise.prompt.blankedSentence}</p>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={result !== null}
        placeholder="Type the missing word"
      />
      <button
        className="sw-submit"
        onClick={() => void submit()}
        disabled={result !== null || value.trim().length === 0}
      >
        Check
      </button>
      {result === "incorrect" && (
        <p className="sw-feedback">Not quite — "{exercise.sourceSentence}"</p>
      )}
      {result === "correct" && <p className="sw-feedback-ok">Correct!</p>}
    </div>
  );
}
