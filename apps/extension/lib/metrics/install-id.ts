import { InstallIdSchema } from "@sprachweise/shared";

const INSTALL_ID_KEY = "installId";

let pending: Promise<string> | null = null;

/**
 * The install's random ID (constitution III): created once, kept in chrome.storage.local, and sent
 * only with usage-metric events — never with a translation request or a bad-translation report.
 * `created` is true only for the one call that generated it (fresh install, or storage cleared), so
 * exactly one install event is recorded; concurrent first calls join that generation.
 */
export async function getOrCreateInstallId(): Promise<{ installId: string; created: boolean }> {
  if (pending) return { installId: await pending, created: false };

  const stored = chrome.storage.local.get(INSTALL_ID_KEY);
  let created = false;
  pending = stored.then(async (items) => {
    const parsed = InstallIdSchema.safeParse(items[INSTALL_ID_KEY]);
    if (parsed.success) return parsed.data;
    const installId = crypto.randomUUID();
    await chrome.storage.local.set({ [INSTALL_ID_KEY]: installId });
    created = true;
    return installId;
  });
  try {
    return { installId: await pending, created };
  } finally {
    pending = null;
  }
}
