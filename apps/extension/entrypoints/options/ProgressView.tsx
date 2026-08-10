import { useEffect, useState } from "react";
import type { GetProgressSnapshotResponse, StorageChangedMessage } from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";

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

  return (
    <section>
      <h1>Progress</h1>
      <div className="stats">
        <div>
          <strong>{profile.currentStreak}</strong>
          <span>day streak</span>
        </div>
        <div>
          <strong>{profile.activeVocabCount}</strong>
          <span>active vocabulary</span>
        </div>
        <div>
          <strong>{profile.solvedTodayCount}</strong>
          <span>solved today</span>
        </div>
      </div>

      <h2>Per-topic accuracy</h2>
      {Object.keys(profile.topicAccuracy).length === 0 ? (
        <p>No exercises answered yet.</p>
      ) : (
        <table>
          <tbody>
            {Object.entries(profile.topicAccuracy).map(([topic, acc]) => (
              <tr key={topic}>
                <td>{topic}</td>
                <td>
                  {acc.correct}/{acc.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Review queue</h2>
      {reviewQueue.length === 0 ? (
        <p>Nothing scheduled yet — answer an exercise to start building your review queue.</p>
      ) : (
        <table>
          <tbody>
            {reviewQueue.map((entry) => (
              <tr key={entry.vocabId}>
                <td>{vocabById.get(entry.vocabId)?.german ?? entry.vocabId}</td>
                <td>{vocabById.get(entry.vocabId)?.russian ?? ""}</td>
                <td>due {entry.dueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
