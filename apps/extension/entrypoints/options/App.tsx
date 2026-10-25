import { useState } from "react";
import ProgressView from "./ProgressView";
import ReviewView from "./ReviewView";
import SettingsView from "./SettingsView";
import { t, type MessageKey } from "@/lib/i18n";

type Tab = "progress" | "review" | "settings";

const TABS: Array<{ id: Tab; label: MessageKey }> = [
  { id: "progress", label: "optionsTabProgress" },
  { id: "review", label: "optionsTabReview" },
  { id: "settings", label: "optionsTabSettings" },
];

export default function App() {
  // The popup's "Review N words" button opens options.html#review.
  const [tab, setTab] = useState<Tab>(location.hash === "#review" ? "review" : "progress");

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
        {tab === "review" && <ReviewView />}
        {tab === "settings" && <SettingsView />}
      </main>
    </div>
  );
}
