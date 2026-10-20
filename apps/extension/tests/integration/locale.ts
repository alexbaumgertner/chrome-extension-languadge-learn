import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, "../../public/_locales");

export type UiLocale = "en" | "ru";

/**
 * Launch options that make Chromium show the extension in `locale`, as a browser set to that
 * language would. All three are needed: `--lang` switches chrome.i18n.getMessage; the environment
 * sets chrome.i18n.getUILanguage() in the service worker (Linux); and Playwright's `locale`
 * (which otherwise emulates en-US) sets it in pages and content scripts. Without the last two,
 * plural rules and number formats would come from the wrong language.
 */
export function localeLaunchOptions(locale: UiLocale): {
  args: string[];
  env: Record<string, string>;
  locale: string;
} {
  const posix = locale === "ru" ? "ru_RU.UTF-8" : "en_US.UTF-8";
  return {
    locale: locale === "ru" ? "ru" : "en-US",
    args: [`--lang=${locale === "ru" ? "ru" : "en-US"}`],
    env: {
      ...(process.env as Record<string, string>),
      LANGUAGE: locale,
      LANG: posix,
    },
  };
}

const catalogs = new Map<UiLocale, Record<string, { message: string }>>();

/** A message from public/_locales/<locale>/messages.json, with `$1`… substituted. */
export function msg(locale: UiLocale, key: string, ...substitutions: string[]): string {
  let catalog = catalogs.get(locale);
  if (!catalog) {
    catalog = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, locale, "messages.json"), "utf8"));
    catalogs.set(locale, catalog!);
  }
  const entry = catalog![key];
  if (!entry) throw new Error(`no message "${key}" in ${locale}`);
  return entry.message.replace(/\$(\d)/g, (_, i: string) => substitutions[Number(i) - 1] ?? "");
}
