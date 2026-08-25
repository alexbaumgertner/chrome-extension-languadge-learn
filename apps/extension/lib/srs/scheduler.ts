import type { ReviewQueueEntry } from "@sprachweise/shared";

const MAX_INTERVAL_DAYS = 365;

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(localDate: string, days: number): string {
  const [y, m, d] = localDate.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

/**
 * SM-2-style scheduling (research.md §6): correct answers advance the
 * interval (1 → 6 → ×2.5-ish, capped); an incorrect answer resets
 * repetitions to 0 and the interval to 1 day. `today` is the learner's
 * local calendar day.
 */
export function advance(
  entry: ReviewQueueEntry,
  correct: boolean,
  today: string,
): ReviewQueueEntry {
  if (!correct) {
    return { ...entry, repetitions: 0, intervalDays: 1, dueDate: addDays(today, 1) };
  }

  const repetitions = entry.repetitions + 1;
  let intervalDays: number;
  if (repetitions === 1) intervalDays = 1;
  else if (repetitions === 2) intervalDays = 6;
  else intervalDays = Math.min(MAX_INTERVAL_DAYS, Math.round(entry.intervalDays * 2.5));

  return { ...entry, repetitions, intervalDays, dueDate: addDays(today, intervalDays) };
}
