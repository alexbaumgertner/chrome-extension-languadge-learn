import { useEffect, useState } from "react";
import type { GetProgressSnapshotResponse, StorageChangedMessage } from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";
import { formatLocalDate } from "@/lib/srs/scheduler";

/** Accuracy bar fills, in turn (design handoff, progress view). */
const FILLS = ["var(--color-accent-500)", "var(--color-accent-2-500)", "var(--color-accent-400)"];

export default function ProgressView() {
  const [snapshot, setSnapshot] = useState<GetProgressSnapshotResponse | null>(null);

  useEffect(() => {
    function load(): void {
      void sendMessage<GetProgressSnapshotResponse>({ type: "GET_PROGRESS_SNAPSHOT" }).then(
        setSnapshot,
      );
    }
    load();

    function onMessage(message: unknown): void {
      const msg = message as Partial<StorageChangedMessage>;
      if (msg.type === "STORAGE_CHANGED" && (msg.slice === "progress" || msg.slice === "vocab")) {
        load();
      }
    }
    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, []);

  if (!snapshot) return <p>Loading…</p>;

  const { profile, vocab, reviewQueue } = snapshot;
  const vocabById = new Map(vocab.map((item) => [item.id, item]));
  const today = formatLocalDate(new Date());

  return (
    <section className="options-section">
      <h1 className="visually-hidden">Progress</h1>
      <div className="stats">
        <div className="card stat">
          <span className="card-kicker">Streak</span>
          <strong>{profile.currentStreak}</strong>
          <span>day streak</span>
        </div>
        <div className="card stat">
          <span className="card-kicker">Vocabulary</span>
          <strong>{profile.activeVocabCount}</strong>
          <span>active vocabulary</span>
        </div>
        <div className="card stat">
          <span className="card-kicker">Today</span>
          <strong>{profile.solvedTodayCount}</strong>
          <span>solved today</span>
        </div>
      </div>

      <div className="options-grid options-grid-even">
        <div className="options-column">
          <h3>Per-topic accuracy</h3>
          {Object.keys(profile.topicAccuracy).length === 0 ? (
            <p className="options-note">No exercises answered yet.</p>
          ) : (
            <div className="accuracy">
              {Object.entries(profile.topicAccuracy).map(([topic, acc], i) => {
                const percent = acc.total === 0 ? 0 : Math.round((acc.correct / acc.total) * 100);
                return (
                  <div key={topic} className="accuracy-item">
                    <div className="accuracy-label">
                      <span>{topic}</span>
                      <strong>
                        {percent}%
                        <small>
                          {acc.correct}/{acc.total}
                        </small>
                      </strong>
                    </div>
                    <div
                      className="accuracy-track"
                      role="meter"
                      aria-label={topic}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                    >
                      <div
                        className="accuracy-fill"
                        style={{ width: `${percent}%`, background: FILLS[i % FILLS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="options-column">
          <h3>Review queue</h3>
          {reviewQueue.length === 0 ? (
            <p className="options-note">
              Nothing scheduled yet — answer an exercise to start building your review queue.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Word</th>
                  <th>Meaning</th>
                  <th>Reviews</th>
                  <th>Next</th>
                </tr>
              </thead>
              <tbody>
                {reviewQueue.map((entry) => (
                  <tr key={entry.vocabId}>
                    <td>
                      <strong>{vocabById.get(entry.vocabId)?.german ?? entry.vocabId}</strong>
                    </td>
                    <td>{vocabById.get(entry.vocabId)?.russian ?? ""}</td>
                    <td>{entry.repetitions}</td>
                    <td>
                      {entry.dueDate <= today ? (
                        <span className="tag tag-accent">due {entry.dueDate}</span>
                      ) : (
                        `due ${entry.dueDate}`
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
