import { useEffect, useRef, useState } from "react";
import type { WordOrderExercise } from "@sprachweise/shared";
import type { OnAnswer } from "./types";
import { t } from "@/lib/i18n";

/** Token indexes (into prompt.tokens) in the order the learner placed them. */
function restorePlaced(tokens: string[], submitted: unknown): number[] {
  if (typeof submitted !== "string") return [];
  const used = new Set<number>();
  const placed: number[] = [];
  for (const word of submitted.split(" ")) {
    const index = tokens.findIndex((token, i) => token === word && !used.has(i));
    if (index === -1) continue;
    used.add(index);
    placed.push(index);
  }
  return placed;
}

export default function WordOrderCard({
  kicker,
  exercise,
  onAnswer,
}: {
  kicker: string;
  exercise: WordOrderExercise;
  onAnswer: OnAnswer;
}) {
  const { tokens, ending } = exercise.prompt;
  const [placed, setPlaced] = useState<number[]>(
    exercise.lastAttempt ? restorePlaced(tokens, exercise.lastAttempt.submittedAnswer) : [],
  );
  const [result, setResult] = useState<"correct" | "incorrect" | null>(
    exercise.lastAttempt ? (exercise.lastAttempt.correct ? "correct" : "incorrect") : null,
  );
  const cardRef = useRef<HTMLDivElement>(null);
  // A moved token's button is a new element (it changes rows), so focus is put back on it
  // explicitly; otherwise focus would fall out of the Shadow DOM onto the host page.
  const refocus = useRef<number | null>(null);

  useEffect(() => {
    if (refocus.current === null) return;
    cardRef.current?.querySelector<HTMLButtonElement>(`[data-token="${refocus.current}"]`)?.focus();
    refocus.current = null;
  }, [placed]);

  const bank = tokens.map((_, i) => i).filter((i) => !placed.includes(i));
  const locked = result !== null;

  function place(index: number): void {
    refocus.current = index;
    setPlaced((prev) => [...prev, index]);
  }

  function takeBack(index: number): void {
    refocus.current = index;
    setPlaced((prev) => prev.filter((i) => i !== index));
  }

  async function submit(): Promise<void> {
    const answer = placed.map((i) => tokens[i]).join(" ");
    // A whole sentence is not tied to one vocabulary item (like the dictation).
    const correct = await onAnswer(exercise, answer, []);
    setResult(correct ? "correct" : "incorrect");
  }

  const lineState =
    result === "correct" ? " sw-order-ok" : result === "incorrect" ? " sw-order-bad" : "";

  return (
    <div className="sw-card card elev-sm" ref={cardRef}>
      <span className="card-kicker">{kicker}</span>
      <p className="sw-instruction">{t("wordOrderInstruction")}</p>
      <div
        className={`sw-order-line${lineState}`}
        role="group"
        aria-label={t("wordOrderAnswerLabel")}
      >
        {placed.map((index) => (
          <button
            key={index}
            data-token={index}
            className="sw-order-token sw-choice btn btn-primary"
            disabled={locked}
            onClick={() => takeBack(index)}
          >
            {tokens[index]}
          </button>
        ))}
        {ending && <span className="sw-order-ending">{ending}</span>}
      </div>
      <div className="sw-order-bank" role="group" aria-label={t("wordOrderBankLabel")}>
        {bank.map((index) => (
          <button
            key={index}
            data-token={index}
            className="sw-order-token sw-choice sw-opt btn btn-secondary"
            disabled={locked}
            onClick={() => place(index)}
          >
            {tokens[index]}
          </button>
        ))}
      </div>
      <div className="sw-answer-row">
        <button
          className="sw-submit btn btn-primary"
          onClick={() => void submit()}
          disabled={locked || bank.length > 0}
        >
          {t("exerciseCheck")}
        </button>
      </div>
      {result === "incorrect" && (
        <p className="sw-feedback">{t("wordOrderWrong", exercise.sourceSentence)}</p>
      )}
      {result === "correct" && <p className="sw-feedback-ok">{t("exerciseCorrect")}</p>}
    </div>
  );
}
