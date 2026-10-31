import {
  RequestMessageSchema,
  type CmsExercisesRequest,
  type Exercise,
  type GermanVariant,
  type ProgressProfile,
  type ReportBadTranslationResponse,
  type RequestMessage,
  type StorageChangedMessage,
  type TranslateParagraphResponse,
} from "@sprachweise/shared";
import { getLearnerSettings, setLearnerSettings } from "@/lib/storage/settings";
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
  getCachedVariant,
  markExerciseAnswered,
  putCachedExercises,
  putCachedVariant,
} from "@/lib/storage/content-cache";
import {
  CmsFetchError,
  classifyTranslateFailure,
  generateExercises,
  sendReport,
  translateParagraph,
} from "@/lib/cms/client";
import { mapCmsExercisesToEntities } from "@/lib/exercises/generate";
import { checkExerciseAnswer } from "@/lib/exercises/match";
import { recordVocabEncounters, vocabIdFor } from "@/lib/vocab/upsert";
import { flushEvents, recordEvent, recordInstallIfNew } from "@/lib/metrics/events";
import { translateSelection } from "@/lib/selection/translate-selection";
import { getPendingSelection, openSelectionTool } from "@/lib/selection/open-tool";
import {
  RESTORE_MENU_ID,
  SPEAK_MENU_ID,
  TRANSLATE_COMMAND,
  TRANSLATE_LEVEL_MENU_ID,
  TRANSLATE_MENU_ID,
  createContextMenus,
  refreshRestoreMenu,
  runPageAction,
} from "@/lib/page-actions";

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

  let variant = cachedVariant;
  let cmsVocab: CmsMarkedVocab;
  if (variant) {
    cmsVocab = await cmsVocabFromVariant(variant);
  } else {
    try {
      const started = performance.now();
      const translated = await translateParagraph(
        message.paragraphText,
        message.level,
        message.topic,
      );
      void recordEvent({
        name: "paragraph_translated",
        cache: translated.cache ?? "miss",
        latencyMs: Math.round(performance.now() - started),
      });
      const vocabIdByGerman = await recordVocabEncounters(translated.markedVocab, Date.now());

      variant = {
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
        model: translated.model,
        promptVersion: translated.promptVersion,
      };
      await putCachedVariant(cacheKey, variant);
      cmsVocab = translated.markedVocab;
    } catch (error) {
      const failure = await classifyTranslateFailure(error);
      void recordEvent({
        name: "client_error",
        error: failure.code,
        httpStatus: failure.httpStatus,
      });
      return { ok: false, reason: failure.reason };
    }
  }

  // A failed exercise fetch never discards a good translation: the paragraph still renders, and
  // the next click on it retries just the exercises from the cached variant (no new translation).
  let exercises: Exercise[] = [];
  try {
    const cmsExercises = await generateExercises(
      variant.text,
      cmsVocab,
      message.level,
      message.topic,
    );
    exercises = mapCmsExercisesToEntities(cmsExercises, message.contentHash);
    await putCachedExercises(cacheKey, exercises);
  } catch (error) {
    // Left uncached on purpose so it's retried.
    void recordEvent({
      name: "client_error",
      error: "exercises-failed",
      httpStatus: httpStatusOf(error),
    });
  }

  return { ok: true, variant, exercises };
}

type CmsMarkedVocab = CmsExercisesRequest["markedVocab"];

function httpStatusOf(error: unknown): number | null {
  return error instanceof CmsFetchError ? (error.status ?? null) : null;
}

/** Rebuilds the CMS-shaped glossed spans for a cached variant from the local vocabulary store. */
async function cmsVocabFromVariant(variant: GermanVariant): Promise<CmsMarkedVocab> {
  const vocab = await getAllVocabulary();
  return variant.markedVocab.flatMap((span) => {
    const item = vocab[span.vocabId];
    if (!item?.russian) return [];
    return [
      {
        start: span.start,
        end: span.end,
        german: variant.text.slice(span.start, span.end),
        lemma: item.german,
        russian: item.russian,
      },
    ];
  });
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

  void recordEvent({ name: "exercise_completed" });
  const updatedProgress = await recordAttempt({
    correct,
    affectedVocabIds: message.affectedVocabIds,
    topic: message.topic,
    timestamp,
  });
  return { ok: true, correct, updatedProgress };
}

/**
 * The "Плохой перевод" click: the only path that sends a fragment for review (constitution III).
 * Output, level and model come from the cached variant the content script is showing; no install ID.
 */
async function handleReportBadTranslation(
  message: Extract<RequestMessage, { type: "REPORT_BAD_TRANSLATION" }>,
): Promise<ReportBadTranslationResponse> {
  const [variant, settings] = await Promise.all([
    getCachedVariant(message.variantId),
    getLearnerSettings(),
  ]);
  if (!variant) return { ok: false };
  try {
    await sendReport({
      source: message.sourceText,
      output: variant.text,
      level: variant.level,
      density: settings.translationDensity,
      model: variant.model ?? null,
      promptVersion: variant.promptVersion ?? null,
    });
    return { ok: true };
  } catch (error) {
    void recordEvent({
      name: "client_error",
      error: "report-failed",
      httpStatus: httpStatusOf(error),
    });
    return { ok: false };
  }
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

    case "TRANSLATIONS_CHANGED":
      await refreshRestoreMenu();
      return { ok: true };

    case "RECORD_CLIENT_ERROR":
      void recordEvent({ name: "client_error", error: message.error, httpStatus: null });
      return { ok: true };

    case "GET_LEARNER_SETTINGS":
      return getLearnerSettings();

    case "SET_LEARNER_SETTINGS":
      await setLearnerSettings(message.settings);
      return { ok: true };

    case "REPORT_BAD_TRANSLATION":
      return handleReportBadTranslation(message);

    case "GET_PENDING_SELECTION":
      return { selection: await getPendingSelection() };

    case "TRANSLATE_SELECTION":
      return translateSelection(message.text);

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

function onMenuClicked(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab): void {
  if (tab?.id === undefined) return;
  const frameId = info.frameId ?? 0;
  // A plain switch: each further selection tool (explain, rewrite, ...) is one more case that
  // opens the side panel. No synchronous work may precede openSelectionTool (user gesture).
  switch (info.menuItemId) {
    case TRANSLATE_MENU_ID:
      void runPageAction(tab.id, frameId, "translate-selection");
      break;
    case RESTORE_MENU_ID:
      void runPageAction(tab.id, frameId, "restore");
      break;
    case TRANSLATE_LEVEL_MENU_ID:
      void openSelectionTool("translate", tab.id, info.selectionText);
      break;
    case SPEAK_MENU_ID:
      void openSelectionTool("speak", tab.id, info.selectionText);
      break;
  }
}

/** The keyboard-shortcut fallback for sites that replace the context menu. Top frame only. */
function onCommand(command: string, tab?: chrome.tabs.Tab): void {
  if (command === TRANSLATE_COMMAND && tab?.id !== undefined) {
    void runPageAction(tab.id, 0, "translate-selection");
  }
}

/**
 * Builds before the context-menu trigger registered a content script per enabled site and kept
 * site rules; neither is used any more. Clears them for installs updated from such a build.
 */
async function removeSiteRuleLeftovers(): Promise<void> {
  await chrome.storage.local.remove("siteRules");
  await chrome.scripting.unregisterContentScripts();
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

  chrome.contextMenus.onClicked.addListener(onMenuClicked);
  chrome.commands.onCommand.addListener(onCommand);

  // "Restore original" follows the tab the learner is looking at.
  chrome.tabs.onActivated.addListener(() => void refreshRestoreMenu());
  chrome.windows.onFocusChanged.addListener(() => void refreshRestoreMenu());
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (tab.active && changeInfo.status !== undefined) void refreshRestoreMenu();
  });

  chrome.runtime.onInstalled.addListener((details) => {
    void createContextMenus();
    void recordInstallIfNew();
    if (details.reason === "update") {
      void removeSiteRuleLeftovers().catch((err: unknown) =>
        console.error("Sprachweise: removing site-rule leftovers failed", err),
      );
    }
  });
  chrome.runtime.onStartup.addListener(() => void flushEvents());

  // Playwright can't click Chrome's native context menu or press an extension shortcut, so test
  // builds expose the same handlers. Compiled out of production builds.
  if (import.meta.env.WXT_TEST_MODE === "true") {
    Object.assign(globalThis, { sprachweiseTest: { onMenuClicked, onCommand } });
  }

  console.log("Sprachweise background worker started", { id: browser.runtime.id });
});
