import { PageActionResponseSchema, type PageActionMessage } from "@sprachweise/shared";

/** WXT's build output path for `entrypoints/content/index.tsx`. */
const CONTENT_SCRIPT_FILE = "content-scripts/content.js";

export const TRANSLATE_MENU_ID = "sprachweise-translate";
export const RESTORE_MENU_ID = "sprachweise-restore";
export const TRANSLATE_COMMAND = "translate-selection";

/**
 * Both items are created on install/update (Chrome keeps them across service-worker restarts).
 * "Translate" shows only on a selection. "Restore original" uses the plain "page" context, so a
 * right-click on a selection never shows both items — Chrome would fold two items into a
 * "Sprachweise" submenu — and it stays hidden until the active tab has a translation.
 */
export async function createContextMenus(): Promise<void> {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: TRANSLATE_MENU_ID,
    title: chrome.i18n.getMessage("menuTranslate"),
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: RESTORE_MENU_ID,
    title: chrome.i18n.getMessage("menuRestore"),
    contexts: ["page"],
    visible: false,
  });
}

async function askTab(
  tabId: number,
  action: PageActionMessage["action"],
  frameId?: number,
): Promise<{ ok: true; hasTranslations: boolean } | null> {
  const message: PageActionMessage = { type: "PAGE_ACTION", action };
  try {
    const response: unknown =
      frameId === undefined
        ? await chrome.tabs.sendMessage(tabId, message)
        : await chrome.tabs.sendMessage(tabId, message, { frameId });
    const parsed = PageActionResponseSchema.safeParse(response);
    return parsed.success ? parsed.data : null;
  } catch {
    return null; // No content script in that tab/frame (never injected, or the page reloaded).
  }
}

const tabQueues = new Map<number, Promise<void>>();

/**
 * Runs a menu or shortcut action in the page. The click (or shortcut) gives this extension
 * activeTab access to the tab, which is what lets the content script be injected now — there is
 * no host permission. The script is injected only if it isn't already running in that frame:
 * a second copy would replace the first and lose its translated paragraphs. Actions on one tab
 * run one at a time so two quick clicks can't inject twice.
 */
export function runPageAction(
  tabId: number,
  frameId: number,
  action: "translate-selection" | "restore",
): Promise<void> {
  const previous = tabQueues.get(tabId) ?? Promise.resolve();
  const next = previous.then(async () => {
    if (action === "restore") {
      // Every frame that holds translations restores them; frames without the script ignore it.
      await askTab(tabId, "restore");
      return;
    }
    if (!(await askTab(tabId, "status", frameId))) {
      await chrome.scripting.executeScript({
        target: { tabId, frameIds: [frameId] },
        files: [CONTENT_SCRIPT_FILE],
      });
    }
    await askTab(tabId, "translate-selection", frameId);
  });
  const settled = next.catch((err: unknown) =>
    // Pages Chrome doesn't let extensions script (chrome://, the Web Store, a cross-origin frame).
    console.error("Sprachweise: page action failed", err),
  );
  tabQueues.set(tabId, settled);
  void settled.then(() => {
    if (tabQueues.get(tabId) === settled) tabQueues.delete(tabId);
  });
  return settled;
}

/** Shows "Restore original" only while the focused window's active tab shows a translation. */
export async function refreshRestoreMenu(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const status = tab?.id === undefined ? null : await askTab(tab.id, "status", 0);
  await new Promise<void>((resolve) =>
    chrome.contextMenus.update(
      RESTORE_MENU_ID,
      { visible: status?.hasTranslations ?? false },
      () => {
        // Read so Chrome doesn't log it: the item isn't created yet when the worker started before
        // onInstalled ran — there is nothing to show then anyway.
        void chrome.runtime.lastError;
        resolve();
      },
    ),
  );
}
