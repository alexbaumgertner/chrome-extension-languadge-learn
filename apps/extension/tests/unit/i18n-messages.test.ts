import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@/public/_locales/en/messages.json";
import ru from "@/public/_locales/ru/messages.json";
import { tPlural } from "@/lib/i18n";

type Catalog = Record<string, { message: string }>;
const catalogs: Record<string, Catalog> = { en, ru };

function placeholders(message: string): string[] {
  return [...new Set(message.match(/\$\d/g) ?? [])].sort();
}

describe("_locales", () => {
  it("en and ru have the same keys", () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
  });

  it.each(Object.keys(en))("%s uses the same placeholders in every language", (key) => {
    const enMessage = (en as Catalog)[key]!.message;
    expect(placeholders((ru as Catalog)[key]!.message)).toEqual(placeholders(enMessage));
  });

  it("has no empty messages", () => {
    for (const [lang, catalog] of Object.entries(catalogs)) {
      for (const [key, { message }] of Object.entries(catalog)) {
        expect(message.trim(), `${lang}.${key}`).not.toBe("");
      }
    }
  });

  it("has no English words in the Russian copy (brand and URLs aside)", () => {
    for (const [key, { message }] of Object.entries(ru as Catalog)) {
      const rest = message.replace(/Sprachweise/g, "").replace(/chrome:\/\/\S+/g, "");
      expect(rest, `ru.${key}`).not.toMatch(/[A-Za-z]{2,}/);
    }
  });
});

describe("tPlural", () => {
  function useCatalog(lang: string): void {
    const catalog = catalogs[lang]!;
    vi.stubGlobal("chrome", {
      i18n: {
        getUILanguage: () => lang,
        getMessage: (key: string, subs?: string | string[]) => {
          const values = typeof subs === "string" ? [subs] : (subs ?? []);
          return (catalog[key]?.message ?? "").replace(/\$(\d)/g, (_, i) => values[i - 1] ?? "");
        },
      },
    });
  }

  afterEach(() => vi.unstubAllGlobals());

  it("follows Russian plural rules", () => {
    useCatalog("ru");
    expect([1, 3, 5, 11, 21, 24].map((n) => tPlural(n, "panelTabExercises"))).toEqual([
      "1 упражнение",
      "3 упражнения",
      "5 упражнений",
      "11 упражнений",
      "21 упражнение",
      "24 упражнения",
    ]);
  });

  it("follows English plural rules", () => {
    useCatalog("en");
    expect([1, 2].map((n) => tPlural(n, "panelTabExercises"))).toEqual([
      "1 exercise",
      "2 exercises",
    ]);
  });
});
