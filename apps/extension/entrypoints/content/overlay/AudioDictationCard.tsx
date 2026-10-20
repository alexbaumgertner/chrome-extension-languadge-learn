import { useState } from "react";
import type { AudioDictationExercise } from "@sprachweise/shared";
import { playDictationAudio } from "@/lib/audio/play-dictation";
import type { OnAnswer } from "./types";
import { PlayIcon } from "@/lib/design/icons";
import { t } from "@/lib/i18n";

export default function AudioDictationCard({
  kicker,
  exercise,
  onAnswer,
}: {
  kicker: string;
  exercise: AudioDictationExercise;
  onAnswer: OnAnswer;
}) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(
    exercise.lastAttempt ? (exercise.lastAttempt.correct ? "correct" : "incorrect") : null,
  );
  const [playing, setPlaying] = useState(false);

  async function play(rate: "normal" | "slow"): Promise<void> {
    setPlaying(true);
    try {
      await playDictationAudio(exercise.prompt.audioSentence, rate);
    } finally {
      setPlaying(false);
    }
  }

  async function submit(): Promise<void> {
    // Whole-sentence dictation isn't tied to one target vocab item.
    const correct = await onAnswer(exercise, value, []);
    setResult(correct ? "correct" : "incorrect");
  }

  const inputState =
    result === "correct" ? " sw-input-ok" : result === "incorrect" ? " sw-input-bad" : "";

  return (
    <div className="sw-card card elev-sm">
      <span className="card-kicker">{kicker}</span>
      <p className="sw-instruction">{t("dictationInstruction")}</p>
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
      <div className="sw-answer-row">
        <input
          className={`input${inputState}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={result !== null}
          placeholder={t("dictationPlaceholder")}
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
        <p className="sw-feedback">{t("dictationWrong", exercise.correctAnswer)}</p>
      )}
      {result === "correct" && <p className="sw-feedback-ok">{t("exerciseCorrect")}</p>}
    </div>
  );
}
