import type { TranslateSelectionResponse } from "@sprachweise/shared";
import { hashParagraphText } from "@/lib/dom/content-hash";
import { classifyTranslateFailure, translateParagraph } from "@/lib/cms/client";
import { recordEvent } from "@/lib/metrics/events";
import { getLearnerSettings } from "@/lib/storage/settings";
import { getAllVocabulary } from "@/lib/storage/progress";
import { contentCacheKey, getCachedVariant, putCachedVariant } from "@/lib/storage/content-cache";
import { recordVocabEncounters, vocabIdFor } from "@/lib/vocab/upsert";

/**
 * "Translate to my level" in the side panel: the selected fragment at the learner's level, with
 * the glossed words. Same cache key as a paragraph translation, so text translated before — on the
 * page or here — is shown without a request and works offline. A fresh translation records its
 * words once, like a paragraph does. A failure is recorded as `selection-panel-failed` with the
 * HTTP status; the learner is told which kind it was.
 */
export async function translateSelection(text: string): Promise<TranslateSelectionResponse> {
  const settings = await getLearnerSettings();
  const contentHash = hashParagraphText(text);
  const cacheKey = contentCacheKey(contentHash, settings.level, settings.currentTopic);

  try {
    const cached = await getCachedVariant(cacheKey);
    if (cached) {
      const vocab = await getAllVocabulary();
      const spans = [...cached.markedVocab]
        .sort((a, b) => a.start - b.start)
        .flatMap((span) => {
          const russian = vocab[span.vocabId]?.russian;
          return russian ? [{ start: span.start, end: span.end, russian }] : [];
        });
      return { ok: true, text: cached.text, spans };
    }

    const started = performance.now();
    const translated = await translateParagraph(text, settings.level, settings.currentTopic);
    void recordEvent({
      name: "paragraph_translated",
      cache: translated.cache ?? "miss",
      latencyMs: Math.round(performance.now() - started),
    });
    const vocabIdByGerman = await recordVocabEncounters(translated.markedVocab, Date.now());
    const markedVocab = translated.markedVocab.map((span) => ({
      start: span.start,
      end: span.end,
      vocabId: vocabIdByGerman[span.german] ?? vocabIdFor(span.german),
    }));
    await putCachedVariant(cacheKey, {
      id: cacheKey,
      contentHash,
      level: settings.level,
      topic: settings.currentTopic,
      text: translated.text,
      markedVocab,
      fetchedAt: Date.now(),
      model: translated.model,
      promptVersion: translated.promptVersion,
    });
    const spans = [...translated.markedVocab]
      .sort((a, b) => a.start - b.start)
      .map(({ start, end, russian }) => ({ start, end, russian }));
    return { ok: true, text: translated.text, spans };
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
