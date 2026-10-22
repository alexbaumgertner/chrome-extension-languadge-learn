import { useEffect, useState } from "react";
import type { LearnerSettings, Level } from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";
import { t } from "@/lib/i18n";

const LEVELS: Level[] = ["A1-A2", "B1-B2", "C1+"];

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

  if (!settings) return <p>{t("optionsLoading")}</p>;

  return (
    <section className="options-grid">
      <div className="options-column">
        <h1 className="options-heading">{t("settingsHeading")}</h1>
        <p className="options-note">{t("settingsNote")}</p>

        <div className="options-fields">
          <fieldset className="field">
            <legend>{t("settingsLevel")}</legend>
            <div className="seg">
              {LEVELS.map((level) => (
                <label key={level} htmlFor={`sw-level-${level}`} className="seg-opt">
                  <input
                    type="radio"
                    id={`sw-level-${level}`}
                    name="sw-level"
                    value={level}
                    checked={settings.level === level}
                    onChange={() => void save({ ...settings, level })}
                  />
                  <span>{level}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {saved && (
            <span className="tag tag-accent-2" role="status">
              {t("settingsSaved")}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
