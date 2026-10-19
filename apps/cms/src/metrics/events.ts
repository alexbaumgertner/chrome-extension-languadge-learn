import type { MetricEvent } from "@sprachweise/shared";
import type { Db } from "../db";

export const RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Queued events may arrive days late (offline); older or future-dated ones are pinned to today. */
const MAX_BACKDATE_MS = 30 * DAY_MS;
const MAX_CLOCK_SKEW_MS = 60 * 60 * 1000;

/** UTC day the event counts towards. A client clock far off is not trusted. */
export function eventDay(occurredAt: string, now: Date): string {
  const at = new Date(occurredAt).getTime();
  const nowMs = now.getTime();
  const trusted = at <= nowMs + MAX_CLOCK_SKEW_MS && at >= nowMs - MAX_BACKDATE_MS;
  return new Date(trusted ? at : nowMs).toISOString().slice(0, 10);
}

/** Inserts a batch; events whose ID is already stored (a batch sent again) are skipped. */
export async function insertEvents(
  db: Db,
  installId: string,
  events: MetricEvent[],
  now: Date = new Date(),
): Promise<void> {
  const params: unknown[] = [];
  const rows = events.map((event) => {
    params.push(
      event.id,
      installId,
      event.name,
      eventDay(event.occurredAt, now),
      event.name === "paragraph_translated" ? event.cache : null,
      event.name === "paragraph_translated" ? event.latencyMs : null,
      event.name === "client_error" ? event.error : null,
      event.name === "client_error" ? event.httpStatus : null,
    );
    const base = params.length - 8;
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::date, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
  });
  await db.query(
    `INSERT INTO events
       (event_id, install_id, name, occurred_on, cache, latency_ms, error_code, http_status)
     VALUES ${rows.join(", ")}
     ON CONFLICT (event_id) DO NOTHING`,
    params,
  );
}

let lastCleanupDay: string | undefined;

/**
 * Deletes events older than the retention window (FR-013). Runs at most once per process per UTC
 * day, piggybacking on event writes, so no cron is needed for the beta. Never throws.
 */
export async function deleteExpiredEvents(
  db: Db,
  onError: (err: unknown) => void,
  now: Date = new Date(),
): Promise<void> {
  const today = now.toISOString().slice(0, 10);
  if (lastCleanupDay === today) return;
  lastCleanupDay = today;
  try {
    await db.query(`DELETE FROM events WHERE occurred_on < $1::date - $2::int`, [
      today,
      RETENTION_DAYS,
    ]);
  } catch (err) {
    lastCleanupDay = undefined;
    onError(err);
  }
}
