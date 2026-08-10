import { useEffect, useState } from "react";
import type {
  GetProgressSnapshotResponse,
  GetSiteStatusResponse,
  SetSiteStatusResponse,
  SiteStatus,
} from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";

export default function App() {
  const [hostname, setHostname] = useState<string | null>(null);
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [solvedToday, setSolvedToday] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const host = tab?.url ? new URL(tab.url).hostname : null;
      setHostname(host);
      if (host) {
        const res = await sendMessage<GetSiteStatusResponse>({
          type: "GET_SITE_STATUS",
          hostname: host,
        });
        setStatus(res.status);
      }
      const snapshot = await sendMessage<GetProgressSnapshotResponse>({
        type: "GET_PROGRESS_SNAPSHOT",
      });
      setSolvedToday(snapshot.profile.solvedTodayCount);
    })();
  }, []);

  async function toggle(): Promise<void> {
    if (!hostname || busy) return;
    setBusy(true);
    setError(null);
    const nextStatus = status === "enabled" ? "disabled" : "enabled";
    const res = await sendMessage<SetSiteStatusResponse>({
      type: "SET_SITE_STATUS",
      hostname,
      status: nextStatus,
    });
    if (res.ok) {
      setStatus(nextStatus);
    } else {
      setError("Permission was declined — Sprachweise stays off for this site.");
    }
    setBusy(false);
  }

  if (!hostname) {
    return (
      <div style={{ padding: 12, minWidth: 220, fontFamily: "system-ui, sans-serif" }}>
        Sprachweise
      </div>
    );
  }

  return (
    <div style={{ padding: 12, minWidth: 220, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 14, margin: "0 0 4px" }}>Sprachweise</h1>
      <p style={{ fontSize: 12, color: "#52606d", margin: "0 0 10px" }}>{hostname}</p>
      <button
        onClick={() => void toggle()}
        disabled={busy || status === null}
        style={{
          width: "100%",
          padding: "6px 0",
          borderRadius: 6,
          border: "1px solid #cbd2d9",
          background: status === "enabled" ? "#fff" : "#1f2933",
          color: status === "enabled" ? "#1f2933" : "#fff",
          cursor: "pointer",
        }}
      >
        {status === "enabled" ? "Disable on this site" : "Enable on this site"}
      </button>
      {error && <p style={{ color: "#b71c1c", fontSize: 12, marginTop: 8 }}>{error}</p>}
      {solvedToday !== null && (
        <p style={{ fontSize: 12, marginTop: 10 }}>
          {solvedToday} exercise{solvedToday === 1 ? "" : "s"} solved today
        </p>
      )}
    </div>
  );
}
