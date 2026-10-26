import { useState } from "react";
import type { ListenChooseExercise } from "@sprachweise/shared";
import { playDictationAudio } from "@/lib/audio/play-dictation";
import type { OnAnswer } from "./types";
import { PlayIcon } from "@/lib/design/icons";
import { t } from "@/lib/i18n";

export default function ListenChooseCard({
  kicker,
  exercise,
  onAnswer,
}: {
  kicker: string;
  exercise: ListenChooseExercise;
  onAnswer: OnAnswer;
}) {
  const previous = exercise.lastAttempt?.submittedAnswer;
  const [selected, setSelected] = useState<number | null>(
    typeof previous === "number" ? previous : null,
  );
  const [correct, setCorrect] = useState<boolean | null>(exercise.lastAttempt?.correct ?? null);
  const [playing, setPlaying] = useState(false);
  const { audioSentence, options } = exercise.prompt;

  async function play(rate: "normal" | "slow"): Promise<void> {
    setPlaying(true);
    try {
      await playDictationAudio(audioSentence, rate);
    } finally {
      setPlaying(false);
    }
  }

  async function choose(index: number): Promise<void> {
    if (selected !== null) return;
    setSelected(index);
    // Like dictation: a whole sentence is not tied to one vocabulary item.
    setCorrect(await onAnswer(exercise, index, []));
  }

  return (
    <div className="sw-card card elev-sm">
      <span className="card-kicker">{kicker}</span>
      <p className="sw-instruction">{t("listenChooseInstruction")}</p>
      <div className="sw-audio-controls">
        <button
          className="btn btn-primary"
          onClick={() => void play("normal")}
          disabled={playing}
          aria-label={t("dictationListenLabel")}
        >
          <PlayIcon size={14} /> {t("dictationListen")}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => void play("slow")}
          disabled={playing}
          aria-label={t("dictationSlowLabel")}
        >
          {t("dictationSlow")}
        </button>
      </div>
      <div className="sw-options">
        {options.map((option, index) => {
          const showState = selected !== null;
          const className = !showState
            ? "sw-opt"
            : index === exercise.correctAnswer
              ? "sw-opt-correct"
              : index === selected
                ? "sw-opt-wrong"
                : "sw-opt";
          return (
            <button
              key={option}
              className={`${className} sw-choice btn btn-secondary`}
              lang="de"
              onClick={() => void choose(index)}
              disabled={showState}
            >
              {option}
            </button>
          );
        })}
      </div>
      {correct === false && <p className="sw-feedback">{t("dictationWrong", audioSentence)}</p>}
      {correct === true && <p className="sw-feedback-ok">{t("exerciseCorrect")}</p>}
    </div>
  );
}
