import { useState } from "react";
import type { AudioDictationExercise, Level } from "@sprachweise/shared";
import { playDictationAudio } from "@/lib/audio/play-dictation";
import type { OnAnswer } from "./types";

export default function AudioDictationCard({
  exercise,
  onAnswer,
  contentHash,
  level,
  topic,
}: {
  exercise: AudioDictationExercise;
  onAnswer: OnAnswer;
  contentHash: string;
  level: Level;
  topic: string;
}) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(
    exercise.lastAttempt ? (exercise.lastAttempt.correct ? "correct" : "incorrect") : null,
  );
  const [playing, setPlaying] = useState(false);

  async function play(rate: "normal" | "slow"): Promise<void> {
    setPlaying(true);
    try {
      await playDictationAudio(exercise.prompt.audioSentence, rate, contentHash, level, topic);
    } finally {
      setPlaying(false);
    }
  }

  async function submit(): Promise<void> {
    // Whole-sentence dictation isn't tied to one target vocab item.
    const correct = await onAnswer(exercise, value, []);
    setResult(correct ? "correct" : "incorrect");
  }

  return (
    <div className="sw-card">
      <div className="sw-audio-controls">
        <button
          onClick={() => void play("normal")}
          disabled={playing}
          aria-label="Play at normal speed"
        >
          ▶
        </button>
        <button onClick={() => void play("slow")} disabled={playing} aria-label="Play slowly">
          ▶ slow
        </button>
      </div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={result !== null}
        placeholder="Type what you heard"
      />
      <button
        className="sw-submit"
        onClick={() => void submit()}
        disabled={result !== null || value.trim().length === 0}
      >
        Check
      </button>
      {result === "incorrect" && <p className="sw-feedback">Correct: "{exercise.correctAnswer}"</p>}
      {result === "correct" && <p className="sw-feedback-ok">Correct!</p>}
    </div>
  );
}
