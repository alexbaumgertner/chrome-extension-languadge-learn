import type { CmsExercise, Exercise } from "@sprachweise/shared";

let counter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;
}

/**
 * Maps the CMS's 0-4 kind-discriminated exercise entries to the persisted
 * Exercise entity shape (data-model.md), stamping traceability back to the
 * source paragraph. A paragraph that can't support all 4 kinds yields fewer
 * entries here — never a malformed/empty one, since we only ever map what
 * the CMS actually returned.
 */
export function mapCmsExercisesToEntities(
  cmsExercises: CmsExercise[],
  sourceParagraphHash: string,
): Exercise[] {
  return cmsExercises.map((cms): Exercise => {
    const base = {
      id: nextId(cms.kind),
      sourceParagraphHash,
      answered: false,
      lastAttempt: null,
    };

    switch (cms.kind) {
      case "fill-blank":
        return {
          ...base,
          kind: "fill-blank",
          sourceSentence: cms.sourceSentence,
          prompt: { blankedSentence: cms.blankedSentence },
          correctAnswer: cms.answer,
        };
      case "multiple-choice":
        return {
          ...base,
          kind: "multiple-choice",
          sourceSentence: cms.sourceSentence,
          prompt: { blankedSentence: cms.blankedSentence, options: cms.options },
          correctAnswer: cms.correctIndex,
        };
      case "word-pairing": {
        const correctAnswer: Record<string, string> = {};
        for (const pair of cms.pairs) correctAnswer[pair.german] = pair.russian;
        return {
          ...base,
          kind: "word-pairing",
          sourceSentence: "",
          prompt: { pairs: cms.pairs },
          correctAnswer,
        };
      }
      case "audio-dictation":
        return {
          ...base,
          kind: "audio-dictation",
          sourceSentence: cms.sourceSentence,
          prompt: { audioSentence: cms.sourceSentence },
          correctAnswer: cms.answer,
        };
    }
  });
}
