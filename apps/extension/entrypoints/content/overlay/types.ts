import type { AnswerPayload, Exercise } from "@sprachweise/shared";

export type OnAnswer = (
  exercise: Exercise,
  submittedAnswer: AnswerPayload,
  affectedVocabIds: string[],
) => Promise<boolean>;
