import { useEffect, useState } from "react";
import type { GetProgressSnapshotResponse } from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";
import { countDue } from "@/lib/review/session";
import { formatLocalDate } from "@/lib/srs/scheduler";
import { TRANSLATE_COMMAND } from "@/lib/page-actions";
import { FlameIcon } from "@/lib/design/icons";
import { t, tNode, tPlural } from "@/lib/i18n";

export default function App() {
  const [snapshot, setSnapshot] = useState<GetProgressSnapshotResponse | null>(null);
  // undefined while loading, "" when the learner (or a conflict) left the shortcut unassigned.
  const [shortcut, setShortcut] = useState<string | undefined>(undefined);

  useEffect(() => {
    void sendMessage<GetProgressSnapshotResponse>({ type: "GET_PROGRESS_SNAPSHOT" }).then(
      setSnapshot,
    );
    void chrome.commands
      .getAll()
      .then((commands) =>
        setShortcut(commands.find((c) => c.name === TRANSLATE_COMMAND)?.shortcut ?? ""),
      );
  }, []);

  const solvedToday = snapshot?.profile.solvedTodayCount ?? null;
  const dueCount = snapshot
    ? countDue(
        snapshot.reviewQueue,
        Object.fromEntries(snapshot.vocab.map((item) => [item.id, item])),
        formatLocalDate(new Date()),
      )
    : 0;

  function openReview(): void {
    void chrome.tabs.create({ url: chrome.runtime.getURL("/options.html#review") });
    window.close();
  }

  return (
    <div className="popup">
      <div className="popup-header">
        <span className="brand-mark" aria-hidden="true">
          S
        </span>
        <h1 className="popup-title">Sprachweise</h1>
        {snapshot && (
          <span className="tag tag-neutral tag-icon" title={t("popupStreak")}>
            <FlameIcon size={12} /> {snapshot.profile.currentStreak}
          </span>
        )}
      </div>
      <div className="popup-howto">
        <p className="popup-howto-text">
          {tNode("popupHowto", <strong>{t("menuTranslate")}</strong>)}
        </p>
        {shortcut !== undefined && (
          <p className="popup-howto-meta">
            {shortcut ? t("popupShortcut", shortcut) : t("popupNoShortcut")}
          </p>
        )}
      </div>
      {dueCount > 0 && (
        <button className="btn btn-primary" onClick={openReview}>
          {tPlural(dueCount, "popupReview")}
        </button>
      )}
      {solvedToday !== null && (
        <div className="popup-row">
          <span>{t("popupSolvedToday")}</span>
          <strong>{solvedToday}</strong>
        </div>
      )}
    </div>
  );
}
