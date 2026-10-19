import { LearnerSettingsSchema, type LearnerSettings } from "@sprachweise/shared";

const SETTINGS_KEY = "settings";

export const DEFAULT_LEARNER_SETTINGS: LearnerSettings = {
  level: "A1-A2",
  currentTopic: "general",
  translationDensity: "medium",
};

export async function getLearnerSettings(): Promise<LearnerSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  const raw = stored[SETTINGS_KEY];
  if (raw === undefined) return DEFAULT_LEARNER_SETTINGS;
  const result = LearnerSettingsSchema.safeParse(raw);
  return result.success ? result.data : DEFAULT_LEARNER_SETTINGS;
}

export async function setLearnerSettings(settings: LearnerSettings): Promise<void> {
  const validated = LearnerSettingsSchema.parse(settings);
  await chrome.storage.local.set({ [SETTINGS_KEY]: validated });
}
