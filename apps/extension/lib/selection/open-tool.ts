import {
  SelectionPayloadSchema,
  type SelectionPayload,
  type SelectionTool,
  type SelectionToolMessage,
} from "@sprachweise/shared";
import { toFragment } from "@/lib/selection/fragment";

const PENDING_KEY = "pendingSelection";

/**
 * A menu click on a side-panel tool: opens the panel for that tab and hands it the selected
 * fragment. Only `selectionText` is read from the click — never the page or frame address. The
 * panel is opened first and with nothing awaited before it, because `sidePanel.open` only works
 * while the click's user gesture is alive.
 *
 * The fragment is also kept in session storage (memory only, trusted extension pages only), so a
 * panel that was closed and only now finishes loading still finds it; one that is already open
 * gets it from the broadcast. Latest choice wins.
 */
export async function openSelectionTool(
  tool: SelectionTool,
  tabId: number,
  selectionText: string | undefined,
): Promise<void> {
  const fragment = toFragment(selectionText);
  if (!fragment) return;

  const opened = chrome.sidePanel.open({ tabId }).catch((err: unknown) => {
    console.error("Sprachweise: opening the side panel failed", err);
  });
  const selection: SelectionPayload = { id: crypto.randomUUID(), tool, ...fragment };
  await chrome.storage.session.set({ [PENDING_KEY]: selection });
  await opened;

  const message: SelectionToolMessage = { type: "SELECTION_TOOL", selection };
  await chrome.runtime.sendMessage(message).catch(() => {
    // The panel isn't listening (not open, or still loading): it reads the pending selection.
  });
}

export async function getPendingSelection(): Promise<SelectionPayload | null> {
  const stored = await chrome.storage.session.get(PENDING_KEY);
  const parsed = SelectionPayloadSchema.safeParse(stored[PENDING_KEY]);
  return parsed.success ? parsed.data : null;
}
