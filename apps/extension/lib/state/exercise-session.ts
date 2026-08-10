import type { Exercise } from "@sprachweise/shared";

export interface ExerciseSession {
  exercises: Exercise[];
  sourceParagraphHash: string;
}

type Listener = (session: ExerciseSession) => void;

let current: ExerciseSession | null = null;
const listeners = new Set<Listener>();

/** Replaces the panel's current exercise set — a new translation always discards the old, unanswered one (FR-007). */
export function setExerciseSession(session: ExerciseSession): void {
  current = session;
  for (const listener of listeners) listener(session);
}

export function getExerciseSession(): ExerciseSession | null {
  return current;
}

export function subscribeExerciseSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
