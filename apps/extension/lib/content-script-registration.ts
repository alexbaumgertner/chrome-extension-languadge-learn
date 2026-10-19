import { getAllSiteRules } from "@/lib/storage/settings";

const CONTENT_SCRIPT_ID = "sprachweise-content";
/** WXT's build output path for `entrypoints/content/index.tsx`. */
const CONTENT_SCRIPT_FILE = "content-scripts/content.js";

export function originPatternFor(hostname: string): string {
  return `*://${hostname}/*`;
}

/**
 * The origins the content script should run on: enabled sites whose host permission is actually
 * granted. A site revoked from chrome://extensions drops out here even while its stored rule still
 * says "enabled" (GET_SITE_STATUS reports it as disabled for the same reason).
 */
async function grantedEnabledOrigins(): Promise<string[]> {
  const rules = Object.values(await getAllSiteRules()).filter((r) => r.status === "enabled");
  const origins = rules.map((r) => r.grantedPermissionOrigin ?? originPatternFor(r.hostname));
  const granted = await Promise.all(
    origins.map((origin) => chrome.permissions.contains({ origins: [origin] })),
  );
  return origins.filter((_, i) => granted[i]);
}

async function sync(): Promise<void> {
  const matches = await grantedEnabledOrigins();
  const [existing] = await chrome.scripting.getRegisteredContentScripts({
    ids: [CONTENT_SCRIPT_ID],
  });

  if (matches.length === 0) {
    if (existing) await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
    return;
  }
  const script = {
    id: CONTENT_SCRIPT_ID,
    matches,
    js: [CONTENT_SCRIPT_FILE],
    runAt: "document_idle" as const,
    persistAcrossSessions: true,
  };
  if (existing) await chrome.scripting.updateContentScripts([script]);
  else await chrome.scripting.registerContentScripts([script]);
}

let queue: Promise<void> = Promise.resolve();

/**
 * Makes the registered content script's `matches` equal the granted enabled origins. Serialized
 * so overlapping triggers (a site-rule write plus the permission event it causes) can't race into
 * a duplicate-ID registration.
 */
export function syncContentScriptRegistration(): Promise<void> {
  queue = queue
    .then(sync)
    .catch((err: unknown) => console.error("Sprachweise: content script sync failed", err));
  return queue;
}
