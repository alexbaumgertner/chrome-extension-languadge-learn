import { useState } from "react";
import type { WordPairingExercise } from "@sprachweise/shared";
import { vocabIdFor } from "@/lib/vocab/upsert";
import type { OnAnswer } from "./types";

export default function WordPairingCard({
  exercise,
  onAnswer,
}: {
  exercise: WordPairingExercise;
  onAnswer: OnAnswer;
}) {
  const [selectedGerman, setSelectedGerman] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, boolean>>({});
  const [hint, setHint] = useState<string | null>(null);

  function chooseGerman(german: string): void {
    if (matched[german] !== undefined) return;
    setSelectedGerman(german);
    setHint(null);
  }

  async function chooseRussian(russian: string): Promise<void> {
    if (!selectedGerman) {
      setHint("Choose a German word first.");
      return;
    }
    const german = selectedGerman;
    setSelectedGerman(null);
    const correct = await onAnswer(exercise, { [german]: russian }, [vocabIdFor(german)]);
    setMatched((prev) => ({ ...prev, [german]: correct }));
  }

  return (
    <div className="sw-card">
      <p>Match each German word to its Russian meaning.</p>
      <div className="sw-pairing">
        <div className="sw-pairing-col">
          {exercise.prompt.pairs.map(({ german }) => {
            const className =
              selectedGerman === german
                ? "sw-opt-selected"
                : matched[german] === true
                  ? "sw-opt-correct"
                  : matched[german] === false
                    ? "sw-opt-wrong"
                    : "sw-opt";
            return (
              <button
                key={german}
                className={className}
                disabled={matched[german] !== undefined}
                onClick={() => chooseGerman(german)}
              >
                {german}
              </button>
            );
          })}
        </div>
        <div className="sw-pairing-col">
          {exercise.prompt.pairs.map(({ russian }) => (
            <button key={russian} className="sw-opt" onClick={() => void chooseRussian(russian)}>
              {russian}
            </button>
          ))}
        </div>
      </div>
      {hint && <p className="sw-feedback">{hint}</p>}
    </div>
  );
}
