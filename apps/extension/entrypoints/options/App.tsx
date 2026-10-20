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
      <nav className="nav options-nav">
        <span className="nav-brand">Sprachweise</span>
        {TABS.map((t) => (
          <button
            key={t.id}
            className="nav-link"
            aria-current={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main className="options-main">
        {tab === "progress" && <ProgressView />}
        {tab === "settings" && <SettingsView />}
      </main>
    </div>
  );
}
