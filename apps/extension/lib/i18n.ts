import { Fragment, createElement, type ReactNode } from "react";
import type en from "@/public/_locales/en/messages.json";

/**
 * Every UI string comes from public/_locales/<lang>/messages.json; Chrome picks the file by the
 * browser's language (default_locale "en"). The English file is the list of keys, so a missing
 * key is a type error; tests/unit/i18n-messages.test.ts keeps the Russian file in step.
 */
export type MessageKey = keyof typeof en;

/** Keys with a `One`/`Few`/`Many`/`Other` form for each plural category. */
type PluralBase = {
  [K in MessageKey]: K extends `${infer Base}Other` ? Base : never;
}[MessageKey];

export function t(key: MessageKey, substitutions?: string | string[]): string {
  return chrome.i18n.getMessage(key, substitutions);
}

/** The language Chrome shows the extension in, e.g. "ru" or "en-US". */
export function uiLanguage(): string {
  return chrome.i18n.getUILanguage();
}

const PLURAL_SUFFIX: Partial<Record<Intl.LDMLPluralRule, string>> = {
  one: "One",
  few: "Few",
  many: "Many",
};

/** `${base}One|Few|Many|Other` for `count` in the UI language, with `count` as `$1`. */
export function tPlural(count: number, base: PluralBase): string {
  const category = new Intl.PluralRules(uiLanguage()).select(count);
  const suffix = PLURAL_SUFFIX[category] ?? "Other";
  return t(`${base}${suffix}` as MessageKey, String(count));
}

const MARK = "\uE000"; // private-use character, never in a message

/** A message whose `$1` is a React node (e.g. emphasised text inside a sentence). */
export function tNode(key: MessageKey, node: ReactNode): ReactNode {
  const [before = "", after = ""] = t(key, MARK).split(MARK);
  return createElement(Fragment, null, before, node, after);
}

/** A topic slug as the learner reads it; slugs without a translation are shown de-slugged. */
export function topicLabel(topic: string): string {
  if (topic === "general") return t("topicGeneral");
  if (topic === "review") return t("topicReview");
  return topic.replace(/[-_]+/g, " ");
}
