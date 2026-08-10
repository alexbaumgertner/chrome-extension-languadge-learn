import {
  RequestMessageSchema,
  type GermanVariant,
  type PlayTtsResponse,
  type ProgressProfile,
  type RequestMessage,
  type StorageChangedMessage,
  type TranslateParagraphResponse,
} from "@sprachweise/shared";
import {
  getAllSiteRules,
  getLearnerSettings,
  getSiteRule,
  setLearnerSettings,
  setSiteRule,
} from "@/lib/storage/settings";
import {
  getAllReviewQueue,
  getAllVocabulary,
  getProgressProfile,
  recordAttempt,
} from "@/lib/storage/progress";
import { effectiveProgress } from "@/lib/progress/logic";
import { formatLocalDate } from "@/lib/srs/scheduler";
import {
  contentCacheKey,
  findExerciseById,
  getCachedExercises,
  getCachedTtsAudio,
  getCachedVariant,
  markExerciseAnswered,
  putCachedExercises,
  putCachedTtsAudio,
  putCachedVariant,
  ttsCacheKey,
} from "@/lib/storage/content-cache";
import {
  fetchTtsAudio,
  generateExercises,
  isNetworkError,
  translateParagraph,
} from "@/lib/cms/client";
import { mapCmsExercisesToEntities } from "@/lib/exercises/generate";
import { checkExerciseAnswer } from "@/lib/exercises/match";
import { recordVocabEncounters, vocabIdFor } from "@/lib/vocab/upsert";

async function blobToDataUrl(blob: Blob, mimeType: string): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return `data:${mimeType};base64,${btoa(binary)}`;
}

async function handlePlayTts(
  message: Extract<RequestMessage, { type: "PLAY_TTS" }>,
): Promise<PlayTtsResponse> {
  const cacheKey = ttsCacheKey(message.contentHash, message.level, message.topic, message.rate);

  const cached = await getCachedTtsAudio(cacheKey);
  if (cached) {
    return {
      ok: true,
      audioDataUrl: await blobToDataUrl(cached.blob, cached.mimeType),
      mimeType: cached.mimeType,
    };
  }

  try {
    const { blob, mimeType } = await fetchTtsAudio(message.sentence, message.rate);
    await putCachedTtsAudio(cacheKey, blob, mimeType);
    return { ok: true, audioDataUrl: await blobToDataUrl(blob, mimeType), mimeType };
  } catch (error) {
    return { ok: false, reason: isNetworkError(error) ? "offline-no-cache" : "fetch-failed" };
  }
}

async function handleTranslateParagraph(
  message: Extract<RequestMessage, { type: "TRANSLATE_PARAGRAPH" }>,
): Promise<TranslateParagraphResponse> {
  const cacheKey = contentCacheKey(message.contentHash, message.level, message.topic);

  const [cachedVariant, cachedExercises] = await Promise.all([
    getCachedVariant(cacheKey),
    getCachedExercises(cacheKey),
  ]);
  if (cachedVariant && cachedExercises) {
    return { ok: true, variant: cachedVariant, exercises: cachedExercises };
  }

  try {
    const translated = await translateParagraph(
      message.paragraphText,
      message.level,
      message.topic,
    );
    const vocabIdByGerman = await recordVocabEncounters(translated.markedVocab, Date.now());

    const variant: GermanVariant = {
      id: cacheKey,
      contentHash: message.contentHash,
      level: message.level,
      topic: message.topic,
      text: translated.text,
      markedVocab: translated.markedVocab.map((span) => ({
        start: span.start,
        end: span.end,
        vocabId: vocabIdByGerman[span.german] ?? vocabIdFor(span.german),
      })),
      fetchedAt: Date.now(),
    };
    await putCachedVariant(cacheKey, variant);

    const cmsExercises = await generateExercises(
      translated.text,
      translated.markedVocab,
      message.level,
      message.topic,
    );
    const exercises = mapCmsExercisesToEntities(cmsExercises, message.contentHash);
    await putCachedExercises(cacheKey, exercises);

    return { ok: true, variant, exercises };
  } catch (error) {
    return { ok: false, reason: isNetworkError(error) ? "offline-no-cache" : "fetch-failed" };
  }
}

async function handleSubmitExerciseAttempt(
  message: Extract<RequestMessage, { type: "SUBMIT_EXERCISE_ATTEMPT" }>,
): Promise<{ ok: true; correct: boolean; updatedProgress: ProgressProfile }> {
  const found = await findExerciseById(message.exerciseId);
  const correct = found ? checkExerciseAnswer(found.exercise, message.submittedAnswer) : false;
  const timestamp = Date.now();

  if (found) {
    const lastAttempt = {
      exerciseId: message.exerciseId,
      submittedAnswer: message.submittedAnswer,
      correct,
      affectedVocabIds: message.affectedVocabIds,
      topic: message.topic,
      timestamp,
    };
    await markExerciseAnswered(found.cacheKey, message.exerciseId, lastAttempt);
  }

  const updatedProgress = await recordAttempt({
    correct,
    affectedVocabIds: message.affectedVocabIds,
    topic: message.topic,
    timestamp,
  });
  return { ok: true, correct, updatedProgress };
}

function originPatternFor(hostname: string): string {
  return `*://${hostname}/*`;
}

async function handleGetSiteStatus(
  message: Extract<RequestMessage, { type: "GET_SITE_STATUS" }>,
): Promise<{ status: "enabled" | "disabled" | "undecided" }> {
  const rule = await getSiteRule(message.hostname);
  if (rule?.status === "enabled") {
    const origin = rule.grantedPermissionOrigin ?? originPatternFor(message.hostname);
    const stillGranted = await chrome.permissions.contains({ origins: [origin] });
    if (!stillGranted) {
      // Out-of-band revocation (chrome://extensions) — treat as disabled for
      // this response without necessarily rewriting the stored rule yet.
      return { status: "disabled" };
    }
  }
  return { status: rule?.status ?? "undecided" };
}

async function handleSetSiteStatus(
  message: Extract<RequestMessage, { type: "SET_SITE_STATUS" }>,
): Promise<{ ok: true } | { ok: false; reason: "permission-denied" }> {
  const origin = originPatternFor(message.hostname);

  if (message.status === "enabled") {
    const granted = await chrome.permissions.request({ origins: [origin] });
    if (!granted) {
      return { ok: false, reason: "permission-denied" };
    }
    await setSiteRule({
      hostname: message.hostname,
      status: "enabled",
      grantedPermissionOrigin: origin,
    });
    return { ok: true };
  }

  await setSiteRule({
    hostname: message.hostname,
    status: "disabled",
    grantedPermissionOrigin: null,
  });
  await chrome.permissions.remove({ origins: [origin] }).catch(() => {
    // Best-effort release — leaving it granted isn't a correctness issue, GET_SITE_STATUS still gates on the stored rule.
  });
  return { ok: true };
}

/**
 * Parses and dispatches every inbound cross-context message. A message that
 * fails schema validation gets a typed error back to the sender — never a
 * silent drop (Constitution V).
 */
async function routeMessage(rawMessage: unknown): Promise<unknown> {
  const parsed = RequestMessageSchema.safeParse(rawMessage);
  if (!parsed.success) {
    return { ok: false, reason: "invalid-message", issues: parsed.error.issues };
  }
  return dispatch(parsed.data);
}

async function dispatch(message: RequestMessage): Promise<unknown> {
  switch (message.type) {
    case "TRANSLATE_PARAGRAPH":
      return handleTranslateParagraph(message);

    case "SUBMIT_EXERCISE_ATTEMPT":
      return handleSubmitExerciseAttempt(message);

    case "GET_SITE_STATUS":
      return handleGetSiteStatus(message);

    case "SET_SITE_STATUS":
      return handleSetSiteStatus(message);

    case "GET_LEARNER_SETTINGS":
      return getLearnerSettings();

    case "SET_LEARNER_SETTINGS":
      await setLearnerSettings(message.settings);
      return { ok: true };

    case "PLAY_TTS":
      return handlePlayTts(message);

    case "GET_SITE_RULES":
      return { siteRules: await getAllSiteRules() };

    case "GET_PROGRESS_SNAPSHOT": {
      const [profile, vocabRecord, reviewQueueRecord] = await Promise.all([
        getProgressProfile(),
        getAllVocabulary(),
        getAllReviewQueue(),
      ]);
      return {
        // A streak/today-count more than one local day stale displays as
        // reset even if nothing has been solved since (data-model.md).
        profile: effectiveProgress(profile, formatLocalDate(new Date())),
        vocab: Object.values(vocabRecord),
        reviewQueue: Object.values(reviewQueueRecord),
      };
    }
  }
}

const STORAGE_KEY_TO_SLICE: Record<string, StorageChangedMessage["slice"]> = {
  settings: "settings",
  siteRules: "siteRules",
  vocabulary: "vocab",
  reviewQueue: "vocab",
  progress: "progress",
};

function broadcastStorageChanged(slice: StorageChangedMessage["slice"]): void {
  const message: StorageChangedMessage = { type: "STORAGE_CHANGED", slice };
  chrome.runtime.sendMessage(message).catch(() => {
    // No popup/options page listening — expected, not an error.
  });
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id === undefined) continue;
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // No content script listening on this tab — expected, not an error.
      });
    }
  });
}

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    routeMessage(message).then(sendResponse);
    return true; // keep the message channel open for the async response
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    const slices = new Set<StorageChangedMessage["slice"]>();
    for (const key of Object.keys(changes)) {
      const slice = STORAGE_KEY_TO_SLICE[key];
      if (slice) slices.add(slice);
    }
    for (const slice of slices) broadcastStorageChanged(slice);
  });

  console.log("Sprachweise background worker started", { id: browser.runtime.id });
});
