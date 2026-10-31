import { useEffect, useState, type FormEvent } from "react";
import type { GetProgressSnapshotResponse } from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";
import { formatLocalDate } from "@/lib/srs/scheduler";
import {
  buildReviewExercise,
  gradeCloze,
  selectDue,
  type ReviewExercise,
} from "@/lib/review/session";
import { t } from "@/lib/i18n";

/** A frozen session: later storage changes (our own answers included) never rebuild it. */
interface Session {
  exercises: ReviewExercise[];
}

async function startSession(): Promise<Session> {
  const snapshot = await sendMessage<GetProgressSnapshotResponse>({
    type: "GET_PROGRESS_SNAPSHOT",
  });
  const vocab = Object.fromEntries(snapshot.vocab.map((item) => [item.id, item]));
  const due = selectDue(snapshot.reviewQueue, vocab, formatLocalDate(new Date()));
  return { exercises: due.map(buildReviewExercise) };
}

export default function ReviewView() {
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  function begin(): void {
    setSession(null);
    setIndex(0);
    setCorrectCount(0);
    void startSession().then(setSession);
  }

  useEffect(begin, []);

  if (!session) return <p>{t("optionsLoading")}</p>;

  const total = session.exercises.length;
  const exercise = session.exercises[index];

  if (total === 0) {
    return (
      <section className="options-section">
        <h1 className="options-heading">{t("reviewHeading")}</h1>
        <p className="options-note">{t("reviewNothingDue")}</p>
      </section>
    );
  }

  if (!exercise) {
    return (
      <section className="options-section">
        <h1 className="options-heading">{t("reviewDoneHeading")}</h1>
        <p className="options-note" role="status">
          {t("reviewDoneScore", [String(correctCount), String(total)])}
        </p>
        <div>
          <button className="btn btn-secondary" onClick={begin}>
            {t("reviewMore")}
          </button>
        </div>
      </section>
    );
  }

  function finish(correct: boolean): void {
    if (correct) setCorrectCount((count) => count + 1);
    setIndex((current) => current + 1);
  }

  return (
    <section className="options-section">
      <h1 className="options-heading">{t("reviewHeading")}</h1>
      <p className="options-note">{t("reviewProgress", [String(index + 1), String(total)])}</p>
      <div className="card">
        {/* key: a fresh card (empty input, hidden answer) for every word */}
        <ReviewCard key={`${index}-${exercise.vocabId}`} exercise={exercise} onNext={finish} />
      </div>
    </section>
  );
}

function submitResult(vocabId: string, correct: boolean): Promise<unknown> {
  return sendMessage({ type: "SUBMIT_REVIEW_ATTEMPT", vocabId, correct });
}

function ReviewCard({
  exercise,
  onNext,
}: {
  exercise: ReviewExercise;
  onNext: (correct: boolean) => void;
}) {
  // null while unanswered; then whether the answer was right.
  const [result, setResult] = useState<boolean | null>(null);
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState(false);

  function answer(correct: boolean): void {
    setResult(correct);
    void submitResult(exercise.vocabId, correct);
  }

  if (exercise.kind === "cloze") {
    function onSubmit(event: FormEvent): void {
      event.preventDefault();
      if (exercise.kind === "cloze" && result === null && typed.trim() !== "") {
        answer(gradeCloze(exercise, typed));
      }
    }
    return (
      <form onSubmit={onSubmit}>
        <span className="card-kicker">{t("reviewKickerCloze")}</span>
        <p className="card-title">{exercise.blankedSentence}</p>
        <p className="card-meta">{t("reviewHint", exercise.hint)}</p>
        <input
          className="input"
          value={typed}
          disabled={result !== null}
          placeholder={t("fillBlankPlaceholder")}
          aria-label={t("fillBlankPlaceholder")}
          onChange={(event) => setTyped(event.target.value)}
          autoFocus
        />
        {result === null ? (
          <button className="btn btn-primary" type="submit">
            {t("exerciseCheck")}
          </button>
        ) : (
          <>
            <p role="status" className="card-body">
              {result ? t("exerciseCorrect") : t("fillBlankWrong", exercise.answer)}
            </p>
            <button className="btn btn-primary" type="button" onClick={() => onNext(result)}>
              {t("reviewNext")}
            </button>
          </>
        )}
      </form>
    );
  }

  return (
    <div>
      <span className="card-kicker">{t("reviewKickerRecall")}</span>
      <p className="card-title">{exercise.german}</p>
      {!revealed ? (
        <button className="btn btn-secondary" onClick={() => setRevealed(true)}>
          {t("reviewShowAnswer")}
        </button>
      ) : result === null ? (
        <>
          <p className="card-body">{exercise.russian}</p>
          <button className="btn btn-primary" onClick={() => answer(true)}>
            {t("reviewKnew")}
          </button>{" "}
          <button className="btn btn-secondary" onClick={() => answer(false)}>
            {t("reviewForgot")}
          </button>
        </>
      ) : (
        <>
          <p className="card-body">{exercise.russian}</p>
          <button className="btn btn-primary" onClick={() => onNext(result)}>
            {t("reviewNext")}
          </button>
        </>
      )}
    </div>
  );
}
