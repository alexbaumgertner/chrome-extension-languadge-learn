import type { Db } from "../db";

export interface UsageLedgerConfig {
  GEMINI_DAILY_REQUEST_ALLOWANCE: number;
}

/** One metered quantity: `amount` is added to `counter` for `periodKey` only if it stays within `allowance`. */
export interface CounterReservation {
  counter: string;
  periodKey: string;
  amount: number;
  allowance: number;
}

export function monthlyPeriodKey(now: Date): string {
  return now.toISOString().slice(0, 7); // YYYY-MM
}

export function dailyPeriodKey(now: Date): string {
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * A single conditional upsert: the increment only lands if the result stays within the allowance,
 * so concurrent callers can't overshoot (each statement is atomic in Postgres). A new period_key
 * simply starts a fresh row — no explicit reset.
 */
async function reserveOne(db: Db, r: CounterReservation): Promise<boolean> {
  const rows = await db.query(
    `INSERT INTO usage_counters AS c (counter, period_key, usage)
       SELECT $1, $2, $3::int WHERE $3::int <= $4::int
     ON CONFLICT (counter, period_key)
       DO UPDATE SET usage = c.usage + EXCLUDED.usage
       WHERE c.usage + EXCLUDED.usage <= $4::int
     RETURNING usage`,
    [r.counter, r.periodKey, r.amount, r.allowance],
  );
  return rows.length > 0;
}

async function release(db: Db, r: CounterReservation): Promise<void> {
  await db.query(
    "UPDATE usage_counters SET usage = usage - $3::int WHERE counter = $1 AND period_key = $2",
    [r.counter, r.periodKey, r.amount],
  );
}

/**
 * Reserves every counter or none: counters are reserved in order, and if one is refused the ones
 * already reserved are released again, so a refusal never leaves a partial increment behind.
 * Returns true if all reservations succeeded.
 */
export async function reserveCounters(
  db: Db,
  reservations: CounterReservation[],
): Promise<boolean> {
  const done: CounterReservation[] = [];
  for (const r of reservations) {
    if (!(await reserveOne(db, r))) {
      for (const d of done) await release(db, d);
      return false;
    }
    done.push(r);
  }
  return true;
}

/**
 * The global budget kill switch: one Gemini request is reserved before the provider is called
 * (FR-010). Returns false once today's allowance is used up.
 */
export function reserveUsage(
  db: Db,
  cfg: UsageLedgerConfig,
  now: Date = new Date(),
): Promise<boolean> {
  return reserveCounters(db, [
    {
      counter: "gemini",
      periodKey: dailyPeriodKey(now),
      amount: 1,
      allowance: cfg.GEMINI_DAILY_REQUEST_ALLOWANCE,
    },
  ]);
}

/**
 * A rewrite request counts against the global Gemini budget and its own daily allowance; both are
 * reserved or neither (a refusal by one releases the other).
 */
export function reserveRewriteUsage(
  db: Db,
  cfg: UsageLedgerConfig & { REWRITE_DAILY_REQUEST_ALLOWANCE: number },
  now: Date = new Date(),
): Promise<boolean> {
  const periodKey = dailyPeriodKey(now);
  return reserveCounters(db, [
    { counter: "gemini", periodKey, amount: 1, allowance: cfg.GEMINI_DAILY_REQUEST_ALLOWANCE },
    { counter: "rewrite", periodKey, amount: 1, allowance: cfg.REWRITE_DAILY_REQUEST_ALLOWANCE },
  ]);
}
