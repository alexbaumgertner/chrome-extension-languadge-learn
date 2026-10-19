import { useEffect, useState } from "react";
import type { GetProgressSnapshotResponse } from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";
import { TRANSLATE_COMMAND } from "@/lib/page-actions";
import { FlameIcon } from "@/lib/design/icons";

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

  return (
    <div className="popup">
      <div className="popup-header">
        <span className="brand-mark" aria-hidden="true">
          S
        </span>
        <h1 className="popup-title">Sprachweise</h1>
        {snapshot && (
          <span className="tag tag-neutral tag-icon" title="Day streak">
            <FlameIcon size={12} /> {snapshot.profile.currentStreak}
          </span>
        )}
      </div>
      <div className="popup-howto">
        <p className="popup-howto-text">
          Select text on any page, right-click it and choose{" "}
          <strong>{chrome.i18n.getMessage("menuTranslate")}</strong>.
        </p>
        {shortcut !== undefined && (
          <p className="popup-howto-meta">
            {shortcut
              ? `Keyboard shortcut: ${shortcut}`
              : "No keyboard shortcut set. Add one at chrome://extensions/shortcuts."}
          </p>
        )}
      </div>
      {solvedToday !== null && (
        <div className="popup-row">
          <span>Exercises solved today</span>
          <strong>{solvedToday}</strong>
        </div>
      )}
    </div>
  );
}
