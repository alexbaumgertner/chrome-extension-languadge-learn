import { describe, expect, it } from "vitest";
import { openDb } from "../../src/db";
import { reserveUsage } from "../../src/usage/ledger";

const cfg = { TRANSLATE_MONTHLY_CHAR_ALLOWANCE: 100, GEMINI_DAILY_REQUEST_ALLOWANCE: 2 };
const now = new Date("2026-08-16T12:00:00Z");

describe("usage-ledger threshold math", () => {
  it("allows requests within both providers' allowance", () => {
    const db = openDb({ CMS_DB_PATH: ":memory:" });
    expect(reserveUsage(db, { translateChars: 40, geminiRequests: 1 }, cfg, now)).toBe(true);
    expect(reserveUsage(db, { translateChars: 40, geminiRequests: 1 }, cfg, now)).toBe(true);
  });

  it("refuses once the translation character allowance would be exceeded", () => {
    const db = openDb({ CMS_DB_PATH: ":memory:" });
    expect(reserveUsage(db, { translateChars: 90, geminiRequests: 1 }, cfg, now)).toBe(true);
    expect(reserveUsage(db, { translateChars: 20, geminiRequests: 1 }, cfg, now)).toBe(false);
  });

  it("refuses once the gemini request allowance would be exceeded", () => {
    const db = openDb({ CMS_DB_PATH: ":memory:" });
    expect(reserveUsage(db, { translateChars: 1, geminiRequests: 1 }, cfg, now)).toBe(true);
    expect(reserveUsage(db, { translateChars: 1, geminiRequests: 1 }, cfg, now)).toBe(true);
    expect(reserveUsage(db, { translateChars: 1, geminiRequests: 1 }, cfg, now)).toBe(false);
  });

  it("a refusal never partially increments one provider's counter", () => {
    const db = openDb({ CMS_DB_PATH: ":memory:" });
    // Gemini allowance (2) would be exceeded by this single reservation; translate chars (10) would not.
    expect(reserveUsage(db, { translateChars: 10, geminiRequests: 3 }, cfg, now)).toBe(false);

    const translateRow = db
      .prepare("SELECT usage FROM usage_counters WHERE provider = 'google-translate'")
      .get() as { usage: number } | undefined;
    expect(translateRow).toBeUndefined();
  });

  it("a new period_key starts a fresh row at usage = 0 with no explicit reset", () => {
    const db = openDb({ CMS_DB_PATH: ":memory:" });
    const day1 = new Date("2026-08-16T12:00:00Z");
    const day2 = new Date("2026-08-17T12:00:00Z");

    expect(reserveUsage(db, { translateChars: 1, geminiRequests: 2 }, cfg, day1)).toBe(true);
    // Gemini's daily allowance is exhausted for day1, but day2 is a fresh period.
    expect(reserveUsage(db, { translateChars: 1, geminiRequests: 1 }, cfg, day1)).toBe(false);
    expect(reserveUsage(db, { translateChars: 1, geminiRequests: 2 }, cfg, day2)).toBe(true);
  });
});
