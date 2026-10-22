import { useState } from "react";
import ProgressView from "./ProgressView";
import SettingsView from "./SettingsView";
import { t, type MessageKey } from "@/lib/i18n";

type Tab = "progress" | "settings";

const TABS: Array<{ id: Tab; label: MessageKey }> = [
  { id: "progress", label: "optionsTabProgress" },
  { id: "settings", label: "optionsTabSettings" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("progress");

  return (
    <div>
      <nav className="nav options-nav">
        <span className="nav-brand">Sprachweise</span>
        {TABS.map((item) => (
          <button
            key={item.id}
            className="nav-link"
            aria-current={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {t(item.label)}
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
