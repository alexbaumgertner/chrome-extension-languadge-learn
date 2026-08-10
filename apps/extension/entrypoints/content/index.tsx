import ReactDOM from "react-dom/client";
import type {
  GetProgressSnapshotResponse,
  GetSiteStatusResponse,
  LearnerSettings,
  StorageChangedMessage,
  TranslateParagraphResponse,
  VocabularyItem,
} from "@sprachweise/shared";
import { applyDensityLimit, findEligibleParagraphs } from "@/lib/dom/paragraph-parser";
import { hashParagraphText } from "@/lib/dom/content-hash";
import { applyVariant, isTranslated, restoreOriginal } from "@/lib/dom/substitution";
import { VOCAB_SPAN_CLASS, renderVariantHtml } from "@/lib/dom/render-variant";
import { createShadowPortal, positionBelow, type ShadowPortal } from "@/lib/dom/shadow-portal";
import { sendMessage } from "@/lib/messaging/send";
import { setExerciseSession } from "@/lib/state/exercise-session";
import Panel from "./overlay/Panel";

const errorPortals = new WeakMap<Element, ShadowPortal>();
let activeTooltip: ShadowPortal | null = null;
let vocabDictionaryPromise: Promise<Record<string, VocabularyItem>> | null = null;
/** Regular (non-weak) map so a site-disable event can enumerate and detach every listener it attached. */
const attachedListeners = new Map<HTMLElement, (e: MouseEvent) => void>();

function extractParagraphText(el: HTMLElement): string {
  return (el.innerText ?? el.textContent ?? "").trim();
}

async function translateAndApply(el: HTMLElement): Promise<void> {
  const paragraphText = extractParagraphText(el);
  const contentHash = hashParagraphText(paragraphText);

  const settings = await sendMessage<LearnerSettings>({ type: "GET_LEARNER_SETTINGS" });
  const response = await sendMessage<TranslateParagraphResponse>({
    type: "TRANSLATE_PARAGRAPH",
    contentHash,
    paragraphText,
    level: settings.level,
    topic: settings.currentTopic,
  });

  if (!response.ok) {
    showInlineError(el, response.reason);
    return;
  }

  errorPortals.get(el)?.remove();
  errorPortals.delete(el);
  applyVariant(el, renderVariantHtml(response.variant), contentHash);
  setExerciseSession({ exercises: response.exercises, sourceParagraphHash: contentHash });
  vocabDictionaryPromise = null; // newly encountered vocab may have been added — refetch on next reveal
}

function showInlineError(el: HTMLElement, reason: "fetch-failed" | "offline-no-cache"): void {
  errorPortals.get(el)?.remove();

  const message =
    reason === "offline-no-cache"
      ? "Translation unavailable offline for this paragraph."
      : "Couldn't translate this paragraph. Click it to try again.";

  const portal = createShadowPortal(
    ".err{background:#fdecea;color:#611a15;padding:6px 10px;border-radius:6px;font:13px/1.4 system-ui,sans-serif;display:flex;gap:8px;align-items:center;max-width:320px;}" +
      "button{border:none;background:none;cursor:pointer;font-weight:bold;font-size:14px;color:inherit;padding:0;}",
  );
  const wrap = document.createElement("div");
  wrap.className = "err";
  const text = document.createElement("span");
  text.textContent = message;
  const dismiss = document.createElement("button");
  dismiss.textContent = "×";
  dismiss.setAttribute("aria-label", "Dismiss");
  dismiss.addEventListener("click", (e) => {
    e.stopPropagation();
    portal.remove();
    errorPortals.delete(el);
  });
  wrap.append(text, dismiss);
  portal.root.appendChild(wrap);
  positionBelow(portal.host, el);
  errorPortals.set(el, portal);
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

function onParagraphClick(el: HTMLElement, event: MouseEvent): void {
  const vocabSpan = (event.target as HTMLElement).closest<HTMLElement>(`.${VOCAB_SPAN_CLASS}`);
  if (vocabSpan) {
    event.stopPropagation();
    void revealVocab(vocabSpan);
    return;
  }

  if (isTranslated(el)) {
    restoreOriginal(el);
    errorPortals.get(el)?.remove();
    errorPortals.delete(el);
    return;
  }

  void translateAndApply(el);
}

async function activate(): Promise<void> {
  const settings = await sendMessage<LearnerSettings>({ type: "GET_LEARNER_SETTINGS" });
  const eligible = applyDensityLimit(findEligibleParagraphs(document), settings.translationDensity);
  for (const el of eligible) {
    if (attachedListeners.has(el)) continue;
    const handler = (e: MouseEvent): void => onParagraphClick(el, e);
    el.addEventListener("click", handler);
    attachedListeners.set(el, handler);
  }
}

/** Site-disable while the page is live: detach every listener and restore every translated paragraph verbatim (Acceptance Scenario 4.3). */
function deactivate(): void {
  for (const [el, handler] of attachedListeners) {
    el.removeEventListener("click", handler);
    if (isTranslated(el)) restoreOriginal(el);
    errorPortals.get(el)?.remove();
    errorPortals.delete(el);
  }
  attachedListeners.clear();
}

export default defineContentScript({
  matches: ["*://*/*"],
  async main(ctx) {
    const status = await sendMessage<GetSiteStatusResponse>({
      type: "GET_SITE_STATUS",
      hostname: location.hostname,
    });
    if (status.status !== "enabled") return;

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

    await activate();

    chrome.runtime.onMessage.addListener((message: unknown) => {
      const msg = message as Partial<StorageChangedMessage>;
      if (msg.type !== "STORAGE_CHANGED" || msg.slice !== "siteRules") return;
      void sendMessage<GetSiteStatusResponse>({
        type: "GET_SITE_STATUS",
        hostname: location.hostname,
      }).then((next) => {
        if (next.status !== "enabled") deactivate();
      });
    });
  },
});
