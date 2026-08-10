import type { ProgressProfile } from "@sprachweise/shared";

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const fromMs = Date.UTC(fy ?? 1970, (fm ?? 1) - 1, fd ?? 1);
  const toMs = Date.UTC(ty ?? 1970, (tm ?? 1) - 1, td ?? 1);
  return Math.round((toMs - fromMs) / 86_400_000);
}

/**
 * Read-time view of a Progress Profile: a streak/today-count more than one
 * local day stale displays as reset, without persisting the reset until the
 * next actual solve (data-model.md Progress Profile validation rule,
 * Acceptance Scenario 3.2's "next time they view their progress" clause).
 */
export function effectiveProgress(profile: ProgressProfile, todayLocal: string): ProgressProfile {
  const gap = daysBetween(profile.lastSolvedLocalDate, todayLocal);
  if (gap <= 0) return profile;
  if (gap === 1) return { ...profile, solvedTodayCount: 0 };
  return { ...profile, currentStreak: 0, solvedTodayCount: 0 };
}

/**
 * Write-time update applied once per submitted exercise attempt (correct or
 * not — FR-011 ties streak/counters to solving, not to accuracy; accuracy
 * itself is tracked separately in topicAccuracy).
 */
export function applySolve(
  profile: ProgressProfile,
  todayLocal: string,
  correct: boolean,
  topic: string,
): ProgressProfile {
  const gap = daysBetween(profile.lastSolvedLocalDate, todayLocal);

  let currentStreak = profile.currentStreak;
  let solvedTodayCount = profile.solvedTodayCount;

  if (gap <= 0) {
    solvedTodayCount += 1;
  } else if (gap === 1) {
    currentStreak += 1;
    solvedTodayCount = 1;
  } else {
    currentStreak = 1;
    solvedTodayCount = 1;
  }

  const priorTopic = profile.topicAccuracy[topic] ?? { correct: 0, total: 0 };
  const topicAccuracy = {
    ...profile.topicAccuracy,
    [topic]: { correct: priorTopic.correct + (correct ? 1 : 0), total: priorTopic.total + 1 },
  };

  return {
    ...profile,
    currentStreak,
    solvedTodayCount,
    topicAccuracy,
    lastSolvedLocalDate: todayLocal,
  };
}
