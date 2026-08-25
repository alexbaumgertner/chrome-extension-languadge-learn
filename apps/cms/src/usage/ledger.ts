import type Database from "better-sqlite3";

export interface ReserveRequest {
  translateChars: number;
  geminiRequests: number;
}

export interface UsageLedgerConfig {
  TRANSLATE_MONTHLY_CHAR_ALLOWANCE: number;
  GEMINI_DAILY_REQUEST_ALLOWANCE: number;
}

interface UsageRow {
  usage: number;
  allowance: number;
}

function monthlyPeriodKey(now: Date): string {
  return now.toISOString().slice(0, 7); // YYYY-MM
}

function dailyPeriodKey(now: Date): string {
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

function readOrInitRow(
  db: Database.Database,
  provider: string,
  periodKey: string,
  configuredAllowance: number,
): UsageRow {
  const existing = db
    .prepare("SELECT usage, allowance FROM usage_counters WHERE provider = ? AND period_key = ?")
    .get(provider, periodKey) as UsageRow | undefined;
  return existing ?? { usage: 0, allowance: configuredAllowance };
}

/**
 * Both providers' current-period usage are read and, only if neither would exceed its allowance,
 * conditionally incremented — all inside one SQLite transaction, before either external call is
 * made (FR-010, research.md §8), so a refusal never partially increments one provider's counter.
 * Returns true if the reservation succeeded (both providers had headroom), false if refused.
 */
export function reserveUsage(
  db: Database.Database,
  req: ReserveRequest,
  cfg: UsageLedgerConfig,
  now: Date = new Date(),
): boolean {
  const translatePeriod = monthlyPeriodKey(now);
  const geminiPeriod = dailyPeriodKey(now);

  const tx = db.transaction((): boolean => {
    const translateRow = readOrInitRow(
      db,
      "google-translate",
      translatePeriod,
      cfg.TRANSLATE_MONTHLY_CHAR_ALLOWANCE,
    );
    const geminiRow = readOrInitRow(db, "gemini", geminiPeriod, cfg.GEMINI_DAILY_REQUEST_ALLOWANCE);

    const wouldExceedTranslate = translateRow.usage + req.translateChars > translateRow.allowance;
    const wouldExceedGemini = geminiRow.usage + req.geminiRequests > geminiRow.allowance;
    if (wouldExceedTranslate || wouldExceedGemini) return false;

    const upsert = db.prepare(
      `INSERT INTO usage_counters (provider, period_key, usage, allowance) VALUES (?, ?, ?, ?)
       ON CONFLICT(provider, period_key) DO UPDATE SET usage = usage + excluded.usage`,
    );
    upsert.run("google-translate", translatePeriod, req.translateChars, translateRow.allowance);
    upsert.run("gemini", geminiPeriod, req.geminiRequests, geminiRow.allowance);

    return true;
  });

  return tx();
}
