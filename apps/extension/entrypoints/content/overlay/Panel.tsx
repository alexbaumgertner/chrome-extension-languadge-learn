import { useEffect, useState } from "react";
import type {
  AnswerPayload,
  Exercise,
  LearnerSettings,
  SubmitExerciseAttemptResponse,
} from "@sprachweise/shared";
import {
  getExerciseSession,
  subscribeExerciseSession,
  type ExerciseSession,
} from "@/lib/state/exercise-session";
import { sendMessage } from "@/lib/messaging/send";
import FillBlankCard from "./FillBlankCard";
import MultipleChoiceCard from "./MultipleChoiceCard";
import WordPairingCard from "./WordPairingCard";
import AudioDictationCard from "./AudioDictationCard";
import { PANEL_CSS } from "./styles";

export default function Panel() {
  const [session, setSession] = useState<ExerciseSession | null>(getExerciseSession());
  const [exercises, setExercises] = useState<Exercise[]>(session?.exercises ?? []);
  const [collapsed, setCollapsed] = useState(true);
  const [settings, setSettings] = useState<LearnerSettings | null>(null);

  useEffect(
    () =>
      subscribeExerciseSession((next) => {
        setSession(next);
        setExercises(next.exercises);
        setCollapsed(false); // a fresh translation opens the panel (FR-007 replacement is visible)
      }),
    [],
  );

  useEffect(() => {
    if (!session) return;
    void sendMessage<LearnerSettings>({ type: "GET_LEARNER_SETTINGS" }).then(setSettings);
  }, [session]);

  if (!session || exercises.length === 0 || !settings) return null;

  const activeSession = session;
  const activeSettings = settings;
  const pendingCount = exercises.filter((ex) => !ex.answered).length;

  async function handleAnswer(
    exercise: Exercise,
    submittedAnswer: AnswerPayload,
    affectedVocabIds: string[],
  ): Promise<boolean> {
    const response = await sendMessage<SubmitExerciseAttemptResponse>({
      type: "SUBMIT_EXERCISE_ATTEMPT",
      exerciseId: exercise.id,
      submittedAnswer,
      sourceParagraphHash: activeSession.sourceParagraphHash,
      affectedVocabIds,
      topic: activeSettings.currentTopic,
    });
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exercise.id
          ? {
              ...ex,
              answered: true,
              lastAttempt: {
                exerciseId: exercise.id,
                submittedAnswer,
                correct: response.correct,
                affectedVocabIds,
                topic: activeSettings.currentTopic,
                timestamp: Date.now(),
              },
            }
          : ex,
      ),
    );
    return response.correct;
  }

  return (
    <>
      <style>{PANEL_CSS}</style>
      {collapsed ? (
        <button className="sw-tab" onClick={() => setCollapsed(false)}>
          {pendingCount} exercise{pendingCount === 1 ? "" : "s"}
        </button>
      ) : (
        <div className="sw-panel">
          <div className="sw-header">
            <span>Exercises</span>
            <button aria-label="Collapse" onClick={() => setCollapsed(true)}>
              ×
            </button>
          </div>
          <div className="sw-list">
            {exercises.map((exercise) => {
              switch (exercise.kind) {
                case "fill-blank":
                  return (
                    <FillBlankCard key={exercise.id} exercise={exercise} onAnswer={handleAnswer} />
                  );
                case "multiple-choice":
                  return (
                    <MultipleChoiceCard
                      key={exercise.id}
                      exercise={exercise}
                      onAnswer={handleAnswer}
                    />
                  );
                case "word-pairing":
                  return (
                    <WordPairingCard
                      key={exercise.id}
                      exercise={exercise}
                      onAnswer={handleAnswer}
                    />
                  );
                case "audio-dictation":
                  return (
                    <AudioDictationCard
                      key={exercise.id}
                      exercise={exercise}
                      onAnswer={handleAnswer}
                      contentHash={session.sourceParagraphHash}
                      level={settings.level}
                      topic={settings.currentTopic}
                    />
                  );
              }
            })}
          </div>
        </div>
      )}
    </>
  );
}
