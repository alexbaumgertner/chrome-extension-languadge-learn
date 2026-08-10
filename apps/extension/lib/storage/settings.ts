import {
  LearnerSettingsSchema,
  SiteRuleSchema,
  type LearnerSettings,
  type SiteRule,
} from "@sprachweise/shared";
import { z } from "zod";

const SETTINGS_KEY = "settings";
const SITE_RULES_KEY = "siteRules";

const SiteRulesRecordSchema = z.record(z.string(), SiteRuleSchema);

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

export async function getAllSiteRules(): Promise<Record<string, SiteRule>> {
  const stored = await chrome.storage.local.get(SITE_RULES_KEY);
  const raw = stored[SITE_RULES_KEY];
  if (raw === undefined) return {};
  const result = SiteRulesRecordSchema.safeParse(raw);
  return result.success ? result.data : {};
}

export async function getSiteRule(hostname: string): Promise<SiteRule | undefined> {
  const rules = await getAllSiteRules();
  return rules[hostname];
}

export async function setSiteRule(rule: SiteRule): Promise<void> {
  const validated = SiteRuleSchema.parse(rule);
  const rules = await getAllSiteRules();
  rules[validated.hostname] = validated;
  await chrome.storage.local.set({ [SITE_RULES_KEY]: rules });
}
