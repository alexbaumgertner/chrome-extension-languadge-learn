import { useState } from "react";
import ProgressView from "./ProgressView";
import SettingsView from "./SettingsView";

type Tab = "progress" | "settings";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "progress", label: "Progress" },
  { id: "settings", label: "Settings" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("progress");

  return (
    <div>
      <nav>
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "progress" && <ProgressView />}
      {tab === "settings" && <SettingsView />}
    </div>
  );
}
