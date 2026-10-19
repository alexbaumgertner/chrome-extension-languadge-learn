import ReactDOM from "react-dom/client";
import {
  PageActionMessageSchema,
  TRANSLATE_MAX_CHARS,
  type ClientErrorCode,
  type GetProgressSnapshotResponse,
  type LearnerSettings,
  type PageActionResponse,
  type TranslateParagraphResponse,
  type VocabularyItem,
} from "@sprachweise/shared";
import { hashParagraphText } from "@/lib/dom/content-hash";
import { normalizeWhitespace, resolveSelection, type SelectionProblem } from "@/lib/dom/selection";
import {
  applyVariant,
  applyVariantToRange,
  hasTranslations,
  isTranslated,
  originalText,
  rangeOverlapsTranslation,
  restoreAll,
  restoreOriginal,
  showsOurWrite,
} from "@/lib/dom/substitution";
import { VOCAB_SPAN_CLASS, renderVariantHtml } from "@/lib/dom/render-variant";
import { createShadowPortal, positionBelow, type ShadowPortal } from "@/lib/dom/shadow-portal";
import { sendMessage } from "@/lib/messaging/send";
import { setExerciseSession } from "@/lib/state/exercise-session";
import Panel from "./overlay/Panel";

type FailureReason = Extract<TranslateParagraphResponse, { ok: false }>["reason"];

/** One piece of the selection to translate: a whole block, or an exact range inside one. */
interface TranslationItem {
  block: HTMLElement;
  range: Range | null;
  text: string;
  /** The block's `innerHTML` when the selection was read; committing needs it unchanged. */
  html: string;
}

const NUMBER = new Intl.NumberFormat("en");
const MAX_CHARS = NUMBER.format(TRANSLATE_MAX_CHARS);

const FAILURE_MESSAGES: Record<FailureReason, string> = {
  offline:
    "You're offline. Text you've translated before still works; new text needs a connection.",
  unavailable: "The translation service is unavailable right now. Try again in a few minutes.",
  limit: "Today's translation limit is used up. Try again tomorrow.",
  "too-long": `This text is too long to translate at once. Select at most ${MAX_CHARS} characters.`,
  failed: "Couldn't translate this text. Select it and try again.",
};

const SELECTION_MESSAGES: Record<SelectionProblem, string> = {
  empty: "Select the text you want to translate first.",
  editable: "Sprachweise doesn't translate text you're typing.",
  excluded: "Selection includes code or form fields — select plain text only.",
  mixed: "Selection includes text outside a paragraph — select text inside paragraphs only.",
};

/** Refusals worth counting: the learner selected something real that the extension can't take. */
const SELECTION_ERROR_CODES: Partial<Record<SelectionProblem, ClientErrorCode>> = {
  excluded: "selection-excluded",
  mixed: "selection-mixed",
};

const PAGE_CHANGED_MESSAGE = "The page changed while translating. Select the text again.";

let notice: ShadowPortal | null = null;
/**
 * Bumped by Restore and by invalidation. A translation in flight compares it after every await
 * and stops before touching the page or the panel if it changed: the learner undid it meanwhile.
 */
let generation = 0;
let activeTooltip: ShadowPortal | null = null;
let vocabDictionaryPromise: Promise<Record<string, VocabularyItem>> | null = null;

/** A small dismissible message below `anchor`, or at the top of the viewport without one. */
function showNotice(anchor: Element | null, message: string, tone: "error" | "info"): void {
  notice?.remove();
  const portal = createShadowPortal(
    ".msg{padding:6px 10px;border-radius:6px;font:13px/1.4 system-ui,sans-serif;display:flex;gap:8px;align-items:center;max-width:340px;box-shadow:0 1px 4px rgba(0,0,0,.15);}" +
      ".error{background:#fdecea;color:#611a15;}.info{background:#eef2f6;color:#1f2933;}" +
      "button{border:none;background:none;cursor:pointer;font-weight:bold;font-size:14px;color:inherit;padding:0;}",
  );
  const wrap = document.createElement("div");
  wrap.className = `msg ${tone}`;
  wrap.setAttribute("role", tone === "error" ? "alert" : "status");
  const text = document.createElement("span");
  text.textContent = message;
  wrap.append(text);
  if (tone === "error") {
    const dismiss = document.createElement("button");
    dismiss.textContent = "×";
    dismiss.setAttribute("aria-label", "Dismiss");
    dismiss.addEventListener("click", (e) => {
      e.stopPropagation();
      portal.remove();
      if (notice === portal) notice = null;
    });
    wrap.append(dismiss);
  }
  portal.root.appendChild(wrap);
  if (anchor) {
    positionBelow(portal.host, anchor);
  } else {
    portal.host.style.top = `${window.scrollY + 16}px`;
    portal.host.style.left = `${window.scrollX + 16}px`;
  }
  notice = portal;
}

function clearNotice(): void {
  notice?.remove();
  notice = null;
}

function reportTranslationsChanged(): void {
  void sendMessage({ type: "TRANSLATIONS_CHANGED" }).catch(() => {
    // The extension was reloaded under this page; nothing to update.
  });
}

/**
 * What the selection turns into. Reads only: text already shown in German is translated from the
 * block's saved original, so nothing on the page changes until a translation is committed.
 */
function translationItems(range: Range): TranslationItem[] | SelectionProblem {
  const target = resolveSelection(range);
  if ("problem" in target) return target.problem;
  return target.parts.map(({ block, range, text }) => {
    const html = block.innerHTML;
    // The host changed the block since we wrote it: forget the stale snapshot (this writes
    // nothing) and take the block as it is now.
    if (isTranslated(block) && !showsOurWrite(block)) restoreOriginal(block);
    if (!isTranslated(block) || (range && !rangeOverlapsTranslation(block, range))) {
      return { block, range, text, html };
    }
    // The whole block, or a range over text already shown in German: translate the original.
    return { block, range: null, text: originalText(block)!, html };
  });
}

/** Whether the page still shows what was read, so the German replaces the right text. */
function stillShows(item: TranslationItem): boolean {
  if (!item.block.isConnected || item.block.innerHTML !== item.html) return false;
  return !item.range || normalizeWhitespace(item.range.toString()) === item.text;
}

async function translateSelection(): Promise<void> {
  clearNotice();
  const selection = window.getSelection();
  const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const items = range ? translationItems(range) : "empty";
  if (typeof items === "string") {
    const code = SELECTION_ERROR_CODES[items];
    if (code) void sendMessage({ type: "RECORD_CLIENT_ERROR", error: code });
    showNotice(null, SELECTION_MESSAGES[items], code ? "error" : "info");
    return;
  }

  const first = items[0]!.block;
  const totalChars = items.reduce((sum, item) => sum + item.text.length, 0);
  if (totalChars > TRANSLATE_MAX_CHARS) {
    // Nothing is sent: the learner selects less instead.
    void sendMessage({ type: "RECORD_CLIENT_ERROR", error: "translate-too-long" });
    showNotice(
      first,
      `The selection is too long (${NUMBER.format(totalChars)} characters). Select at most ${MAX_CHARS} characters — about five paragraphs — at a time.`,
      "error",
    );
    return;
  }

  selection?.removeAllRanges();
  showNotice(first, "Translating…", "info");
  const started = generation;
  const settings = await sendMessage<LearnerSettings>({ type: "GET_LEARNER_SETTINGS" });
  if (generation !== started) return;
  let exercisesShown = false;
  for (const item of items) {
    const contentHash = hashParagraphText(item.text);
    const response = await sendMessage<TranslateParagraphResponse>({
      type: "TRANSLATE_PARAGRAPH",
      contentHash,
      paragraphText: item.text,
      level: settings.level,
      topic: settings.currentTopic,
    });
    if (generation !== started) return;
    if (!response.ok) {
      // The rest would almost certainly fail the same way; the learner retries the selection.
      showNotice(item.block, FAILURE_MESSAGES[response.reason], "error");
      reportTranslationsChanged();
      return;
    }
    if (!stillShows(item)) {
      showNotice(item.block, PAGE_CHANGED_MESSAGE, "error");
      continue;
    }

    const html = renderVariantHtml(response.variant);
    if (item.range) applyVariantToRange(item.block, item.range, html, contentHash);
    else applyVariant(item.block, html, contentHash);
    vocabDictionaryPromise = null; // newly encountered vocab may have been added

    // The panel practises the first piece; the learner reads from the top.
    if (!exercisesShown) {
      exercisesShown = true;
      setExerciseSession({
        exercises: response.exercises,
        sourceParagraphHash: contentHash,
        variantId: response.variant.id,
        sourceText: item.text,
      });
    }
  }
  if (notice?.root.querySelector(".info")) clearNotice();
  reportTranslationsChanged();
}

function restoreEverything(): void {
  generation++;
  clearNotice();
  activeTooltip?.remove();
  activeTooltip = null;
  restoreAll();
  reportTranslationsChanged();
}

async function getVocabDictionary(): Promise<Record<string, VocabularyItem>> {
  vocabDictionaryPromise ??= sendMessage<GetProgressSnapshotResponse>({
    type: "GET_PROGRESS_SNAPSHOT",
  }).then((snapshot) => {
    const dict: Record<string, VocabularyItem> = {};
    for (const item of snapshot.vocab) dict[item.id] = item;
    return dict;
  });
  return vocabDictionaryPromise;
}

async function revealVocab(span: HTMLElement): Promise<void> {
  const vocabId = span.getAttribute("data-vocab-id");
  if (!vocabId) return;

  const dictionary = await getVocabDictionary();
  const item = dictionary[vocabId];

  activeTooltip?.remove();
  const portal = createShadowPortal(
    ".tip{background:#1f2933;color:#fff;padding:5px 10px;border-radius:6px;font:13px/1.4 system-ui,sans-serif;}",
  );
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.textContent = item?.russian ?? "…";
  portal.root.appendChild(tip);
  positionBelow(portal.host, span);
  activeTooltip = portal;

  const dismiss = (e: Event): void => {
    if (e.target !== span) {
      portal.remove();
      if (activeTooltip === portal) activeTooltip = null;
      document.removeEventListener("click", dismiss, true);
    }
  };
  setTimeout(() => document.addEventListener("click", dismiss, true), 0);
}

/** A click on a glossed German word shows its meaning (and never follows a surrounding link). */
function onDocumentClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const vocabSpan = target.closest<HTMLElement>(`.${VOCAB_SPAN_CLASS}`);
  if (!vocabSpan) return;
  event.preventDefault();
  event.stopPropagation();
  void revealVocab(vocabSpan);
}

// Not declared in the manifest and never registered: the background injects this script into a
// tab only when the learner picks "Translate to German" or presses the shortcut, using the
// activeTab access that gesture grants (lib/page-actions.ts). No host permission (Constitution I).
export default defineContentScript({
  registration: "runtime",
  async main(ctx) {
    // Registered first, so the background's next message finds it as soon as injection returns.
    const onMessage = (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: PageActionResponse) => void,
    ): void => {
      const parsed = PageActionMessageSchema.safeParse(message);
      if (!parsed.success) return; // STORAGE_CHANGED and others are for the panel.
      if (parsed.data.action === "translate-selection") void translateSelection();
      if (parsed.data.action === "restore") restoreEverything();
      sendResponse({ ok: true, hasTranslations: hasTranslations() });
    };
    chrome.runtime.onMessage.addListener(onMessage);
    ctx.addEventListener(document, "click", onDocumentClick, { capture: true });
    // Back/forward cache: the page comes back with its translations; the menu should know.
    ctx.addEventListener(window, "pageshow", (e) => {
      if ((e as PageTransitionEvent).persisted) reportTranslationsChanged();
    });

    const ui = await createShadowRootUi(ctx, {
      name: "sprachweise-panel",
      position: "inline",
      anchor: "body",
      onMount: (container) => {
        const root = ReactDOM.createRoot(container);
        root.render(<Panel />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });
    ui.mount();

    // A newer copy of this script took over (the extension was updated or reloaded): leave the
    // page as it was, since that copy can't restore what this one translated.
    ctx.onInvalidated(() => {
      generation++;
      chrome.runtime.onMessage.removeListener(onMessage);
      restoreAll();
      notice?.remove();
      activeTooltip?.remove();
      ui.remove();
    });
  },
});
