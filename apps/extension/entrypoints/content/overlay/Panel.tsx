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
import ArticleChoiceCard from "./ArticleChoiceCard";
import TranslateToGermanCard from "./TranslateToGermanCard";
import ListenChooseCard from "./ListenChooseCard";
import { hasGermanVoice } from "@/lib/audio/play-dictation";
import ReportBadTranslation from "./ReportBadTranslation";
import { PANEL_CSS } from "./styles";
import { ChevronRightIcon } from "@/lib/design/icons";
import { t, tPlural, topicLabel, uiLanguage, type MessageKey } from "@/lib/i18n";

/** Card kickers, numbered in panel order (design handoff: "01 · из этой статьи"). */
const KICKERS: Record<Exercise["kind"], MessageKey> = {
  "fill-blank": "kickerFillBlank",
  "multiple-choice": "kickerMultipleChoice",
  "word-pairing": "kickerWordPairing",
  "audio-dictation": "kickerAudioDictation",
  "article-choice": "kickerArticleChoice",
  "translate-to-german": "kickerTranslateToGerman",
  "listen-choose": "kickerListenChoose",
};

function kicker(index: number, kind: Exercise["kind"]): string {
  return `${String(index + 1).padStart(2, "0")} · ${t(KICKERS[kind])}`;
}

export default function Panel() {
  const [session, setSession] = useState<ExerciseSession | null>(getExerciseSession());
  const [exercises, setExercises] = useState<Exercise[]>(session?.exercises ?? []);
  const [collapsed, setCollapsed] = useState(true);
  const [settings, setSettings] = useState<LearnerSettings | null>(null);
  // null until the browser has reported its voices; listen-choose stays hidden until then.
  const [germanVoice, setGermanVoice] = useState<boolean | null>(null);

  useEffect(() => {
    void hasGermanVoice().then(setGermanVoice, () => setGermanVoice(false));
  }, []);

  useEffect(
    () =>
      subscribeExerciseSession((next) => {
        setSession(next);
        setExercises(next.exercises);
        // A fresh translation opens the panel (FR-007 replacement is visible). Without exercises
        // (failed or none generated) it stays a collapsed tab that still offers the report.
        setCollapsed(next.exercises.length === 0);
      }),
    [],
  );

  useEffect(() => {
    if (!session) return;
    void sendMessage<LearnerSettings>({ type: "GET_LEARNER_SETTINGS" }).then(setSettings);
  }, [session]);

  if (!session || !settings) return null;

  const activeSession = session;
  const activeSettings = settings;
  // Without a German voice a listening exercise cannot be done: it is not shown, not even counted.
  const shown = exercises.filter((ex) => ex.kind !== "listen-choose" || germanVoice === true);
  const pendingCount = shown.filter((ex) => !ex.answered).length;
  const answeredCount = shown.length - pendingCount;
  const tabLabel =
    shown.length === 0 ? t("panelTabNoExercises") : tPlural(pendingCount, "panelTabExercises");
  const lang = uiLanguage();

  async function handleAnswer(
    exercise: Exercise,
    submittedAnswer: AnswerPayload,
    affectedVocabIds: string[],
    overrideCorrect?: true,
  ): Promise<boolean> {
    const response = await sendMessage<SubmitExerciseAttemptResponse>({
      type: "SUBMIT_EXERCISE_ATTEMPT",
      exerciseId: exercise.id,
      submittedAnswer,
      sourceParagraphHash: activeSession.sourceParagraphHash,
      affectedVocabIds,
      topic: activeSettings.currentTopic,
      ...(overrideCorrect ? { overrideCorrect } : {}),
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
        <button
          className="sw-tab"
          lang={lang}
          aria-label={tabLabel}
          onClick={() => setCollapsed(false)}
        >
          <span className="sw-tab-word" aria-hidden="true">
            Sprachweise
          </span>
          {pendingCount > 0 && (
            <span className="sw-tab-badge" aria-hidden="true">
              {pendingCount}
            </span>
          )}
          <span className="visually-hidden">{tabLabel}</span>
        </button>
      ) : (
        <div className="sw-panel" lang={lang}>
          <div className="sw-header">
            <div className="sw-header-row">
              <span className="brand-mark" aria-hidden="true">
                S
              </span>
              <span className="sw-title">Sprachweise</span>
              <button
                className="btn btn-ghost"
                aria-label={t("panelCollapse")}
                onClick={() => setCollapsed(true)}
              >
                {t("panelCollapse")} <ChevronRightIcon size={14} />
              </button>
            </div>
            <div className="sw-tags">
              <span className="tag tag-accent">
                {t("panelTopic", topicLabel(activeSettings.currentTopic))}
              </span>
              <span className="tag tag-accent-2">{t("panelLevel", activeSettings.level)}</span>
            </div>
            {shown.length > 0 && (
              <div className="sw-progress">
                <div className="sw-progress-track">
                  <div
                    className="sw-progress-fill"
                    style={{ width: `${(answeredCount / shown.length) * 100}%` }}
                  />
                </div>
                <span className="sw-progress-label">
                  {t("panelProgress", [String(answeredCount), String(shown.length)])}
                </span>
              </div>
            )}
          </div>
          <div className="sw-list">
            {shown.length === 0 && <p className="sw-empty">{t("panelEmpty")}</p>}
            {shown.map((exercise, index) => {
              const label = kicker(index, exercise.kind);
              switch (exercise.kind) {
                case "fill-blank":
                  return (
                    <FillBlankCard
                      key={exercise.id}
                      kicker={label}
                      exercise={exercise}
                      onAnswer={handleAnswer}
                    />
                  );
                case "multiple-choice":
                  return (
                    <MultipleChoiceCard
                      key={exercise.id}
                      kicker={label}
                      exercise={exercise}
                      onAnswer={handleAnswer}
                    />
                  );
                case "word-pairing":
                  return (
                    <WordPairingCard
                      key={exercise.id}
                      kicker={label}
                      exercise={exercise}
                      onAnswer={handleAnswer}
                    />
                  );
                case "audio-dictation":
                  return (
                    <AudioDictationCard
                      key={exercise.id}
                      kicker={label}
                      exercise={exercise}
                      onAnswer={handleAnswer}
                    />
                  );
                case "article-choice":
                  return (
                    <ArticleChoiceCard
                      key={exercise.id}
                      kicker={label}
                      exercise={exercise}
                      onAnswer={handleAnswer}
                    />
                  );
                case "translate-to-german":
                  return (
                    <TranslateToGermanCard
                      key={exercise.id}
                      kicker={label}
                      exercise={exercise}
                      onAnswer={handleAnswer}
                    />
                  );
                case "listen-choose":
                  return (
                    <ListenChooseCard
                      key={exercise.id}
                      kicker={label}
                      exercise={exercise}
                      onAnswer={handleAnswer}
                    />
                  );
              }
            })}
          </div>
          <ReportBadTranslation
            key={activeSession.variantId}
            variantId={activeSession.variantId}
            sourceText={activeSession.sourceText}
          />
        </div>
      )}
    </>
  );
}
