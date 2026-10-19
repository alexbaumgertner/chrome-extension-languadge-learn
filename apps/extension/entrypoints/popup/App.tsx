import { useEffect, useState } from "react";
import type { GetProgressSnapshotResponse } from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";
import { TRANSLATE_COMMAND } from "@/lib/page-actions";

export default function App() {
  const [solvedToday, setSolvedToday] = useState<number | null>(null);
  // undefined while loading, "" when the learner (or a conflict) left the shortcut unassigned.
  const [shortcut, setShortcut] = useState<string | undefined>(undefined);

  useEffect(() => {
    void sendMessage<GetProgressSnapshotResponse>({ type: "GET_PROGRESS_SNAPSHOT" }).then(
      (snapshot) => setSolvedToday(snapshot.profile.solvedTodayCount),
    );
    void chrome.commands
      .getAll()
      .then((commands) =>
        setShortcut(commands.find((c) => c.name === TRANSLATE_COMMAND)?.shortcut ?? ""),
      );
  }, []);

  return (
    <div style={{ padding: 12, width: 260, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 14, margin: "0 0 8px" }}>Sprachweise</h1>
      <p style={{ fontSize: 13, margin: "0 0 8px", lineHeight: 1.4 }}>
        Select text on any page, right-click it and choose{" "}
        <strong>{chrome.i18n.getMessage("menuTranslate")}</strong>.
      </p>
      {shortcut !== undefined && (
        <p style={{ fontSize: 12, color: "#52606d", margin: "0 0 8px" }}>
          {shortcut
            ? `Keyboard shortcut: ${shortcut}`
            : "No keyboard shortcut set. Add one at chrome://extensions/shortcuts."}
        </p>
      )}
      {solvedToday !== null && (
        <p style={{ fontSize: 12, margin: 0 }}>
          {solvedToday} exercise{solvedToday === 1 ? "" : "s"} solved today
        </p>
      )}
    </div>
  );
}
