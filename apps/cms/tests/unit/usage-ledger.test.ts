import { describe, expect, it } from "vitest";
import { ensureSchema } from "../../src/db";
import { reserveCounters, reserveUsage } from "../../src/usage/ledger";
import { createTestDb } from "../helpers/test-app";

const cfg = { TRANSLATE_MONTHLY_CHAR_ALLOWANCE: 100, GEMINI_DAILY_REQUEST_ALLOWANCE: 2 };
const now = new Date("2026-08-16T12:00:00Z");

async function freshDb() {
  const db = createTestDb();
  await ensureSchema(db);
  return db;
}

describe("usage-ledger threshold math", () => {
  it("allows requests within both providers' allowance", async () => {
    const db = await freshDb();
    expect(await reserveUsage(db, { translateChars: 40, geminiRequests: 1 }, cfg, now)).toBe(true);
    expect(await reserveUsage(db, { translateChars: 40, geminiRequests: 1 }, cfg, now)).toBe(true);
  });

  it("refuses once the translation character allowance would be exceeded", async () => {
    const db = await freshDb();
    expect(await reserveUsage(db, { translateChars: 90, geminiRequests: 1 }, cfg, now)).toBe(true);
    expect(await reserveUsage(db, { translateChars: 20, geminiRequests: 1 }, cfg, now)).toBe(false);
  });

  it("refuses once the gemini request allowance would be exceeded", async () => {
    const db = await freshDb();
    expect(await reserveUsage(db, { translateChars: 1, geminiRequests: 1 }, cfg, now)).toBe(true);
    expect(await reserveUsage(db, { translateChars: 1, geminiRequests: 1 }, cfg, now)).toBe(true);
    expect(await reserveUsage(db, { translateChars: 1, geminiRequests: 1 }, cfg, now)).toBe(false);
  });

  it("a refusal never partially increments one provider's counter", async () => {
    const db = await freshDb();
    // Gemini allowance (2) would be exceeded by this single reservation; translate chars (10) would not.
    expect(await reserveUsage(db, { translateChars: 10, geminiRequests: 3 }, cfg, now)).toBe(false);

    const rows = await db.query<{ usage: number }>(
      "SELECT usage FROM usage_counters WHERE counter = 'google-translate'",
    );
    expect(rows.every((row) => row.usage === 0)).toBe(true);
  });

  it("a new period_key starts a fresh row at usage = 0 with no explicit reset", async () => {
    const db = await freshDb();
    const day1 = new Date("2026-08-16T12:00:00Z");
    const day2 = new Date("2026-08-17T12:00:00Z");

    expect(await reserveUsage(db, { translateChars: 1, geminiRequests: 2 }, cfg, day1)).toBe(true);
    // Gemini's daily allowance is exhausted for day1, but day2 is a fresh period.
    expect(await reserveUsage(db, { translateChars: 1, geminiRequests: 1 }, cfg, day1)).toBe(false);
    expect(await reserveUsage(db, { translateChars: 1, geminiRequests: 2 }, cfg, day2)).toBe(true);
  });

  it("concurrent reservations never overshoot the allowance", async () => {
    const db = await freshDb();
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        reserveCounters(db, [{ counter: "x", periodKey: "p", amount: 1, allowance: 3 }]),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
  });
});
