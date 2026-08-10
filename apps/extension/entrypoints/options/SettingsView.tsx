import { useEffect, useState } from "react";
import type { LearnerSettings, Level, TranslationDensity } from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";

const LEVELS: Level[] = ["A1-A2", "B1-B2", "C1+"];
const DENSITIES: TranslationDensity[] = ["low", "medium", "max"];

export default function SettingsView() {
  const [settings, setSettings] = useState<LearnerSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void sendMessage<LearnerSettings>({ type: "GET_LEARNER_SETTINGS" }).then(setSettings);
  }, []);

  async function save(next: LearnerSettings): Promise<void> {
    setSettings(next);
    await sendMessage({ type: "SET_LEARNER_SETTINGS", settings: next });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (!settings) return <p>Loading…</p>;

  return (
    <section>
      <h1>Settings</h1>
      <p style={{ fontSize: 12, color: "#52606d" }}>
        Changes apply to paragraphs translated after you save — already-translated paragraphs on the
        page keep their current version.
      </p>

      <label>
        Level
        <select
          value={settings.level}
          onChange={(e) => void save({ ...settings, level: e.target.value as Level })}
        >
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </label>

      <label>
        Current grammar topic
        <input
          type="text"
          value={settings.currentTopic}
          onChange={(e) => void save({ ...settings, currentTopic: e.target.value })}
        />
      </label>

      <label>
        Translation density
        <select
          value={settings.translationDensity}
          onChange={(e) =>
            void save({ ...settings, translationDensity: e.target.value as TranslationDensity })
          }
        >
          {DENSITIES.map((density) => (
            <option key={density} value={density}>
              {density}
            </option>
          ))}
        </select>
      </label>

      {saved && <p style={{ color: "#1b5e20", fontSize: 12 }}>Saved.</p>}
    </section>
  );
}
