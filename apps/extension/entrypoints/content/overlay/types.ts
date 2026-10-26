import type { AnswerPayload, Exercise } from "@sprachweise/shared";

export type OnAnswer = (
  exercise: Exercise,
  submittedAnswer: AnswerPayload,
  affectedVocabIds: string[],
  /** translate-to-german only: overrule a wrong grade ("I answered correctly"). */
  overrideCorrect?: true,
) => Promise<boolean>;
