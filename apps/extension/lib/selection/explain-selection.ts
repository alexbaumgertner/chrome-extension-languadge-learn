import type { ExplainSelectionResponse } from "@sprachweise/shared";
import { classifyTranslateFailure, explainText } from "@/lib/cms/client";
import { recordEvent } from "@/lib/metrics/events";
import { getLearnerSettings } from "@/lib/storage/settings";
import {
  explainCacheKey,
  getCachedExplanation,
  putCachedExplanation,
} from "@/lib/storage/explain-cache";

/**
 * "Explain" in the side panel: translation, word breakdown and grammar for the selected fragment.
 * A fragment explained before is shown from the local cache, offline too. Only the fragment and the
 * level go to the backend. A failure is recorded as `selection-panel-failed` with the HTTP status
 * (no text), and the learner is told which kind it was.
 */
export async function explainSelection(text: string): Promise<ExplainSelectionResponse> {
  const { level } = await getLearnerSettings();
  const key = explainCacheKey(text, level);
  try {
    const cached = await getCachedExplanation(key);
    if (cached) return { ok: true, explanation: cached };

    const explanation = await explainText(text, level);
    await putCachedExplanation(key, explanation);
    return { ok: true, explanation };
  } catch (error) {
    const failure = await classifyTranslateFailure(error);
    void recordEvent({
      name: "client_error",
      error: "selection-panel-failed",
      httpStatus: failure.httpStatus,
    });
    return { ok: false, reason: failure.reason };
  }
}
