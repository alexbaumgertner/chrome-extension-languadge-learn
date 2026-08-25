import { expect, test } from "./fixtures";

/**
 * Exercises GET_SITE_STATUS's chrome.permissions.contains re-verification
 * (T054) directly: a hostname that was never actually granted any host
 * permission (unlike the fixture origin, which the test build statically
 * grants and so can never be "revoked") but whose stored Site Rule claims
 * `enabled` must be reported as disabled — this is exactly the out-of-band
 * revocation edge case (learner removes site access from chrome://extensions
 * directly, bypassing the popup toggle).
 */
test("GET_SITE_STATUS reports disabled when the stored rule is enabled but the permission isn't actually granted", async ({
  context,
  serviceWorker,
  extensionId,
}) => {
  const hostname = "never-granted.example";

  await serviceWorker.evaluate(async (h) => {
    const rules = (await chrome.storage.local.get("siteRules")).siteRules ?? {};
    rules[h] = { hostname: h, status: "enabled", grantedPermissionOrigin: `*://${h}/*` };
    await chrome.storage.local.set({ siteRules: rules });
  }, hostname);

  // Send from a page context, not the service worker's own — a script can't
  // reliably deliver chrome.runtime.sendMessage to a listener in its own realm.
  const optionsPage = await context.newPage();
  await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
  const response = await optionsPage.evaluate(
    (h) => chrome.runtime.sendMessage({ type: "GET_SITE_STATUS", hostname: h }),
    hostname,
  );

  expect(response).toEqual({ status: "disabled" });

  // The stored rule itself is left untouched until the learner next opens the popup (data-model.md).
  const storedStatus = await serviceWorker.evaluate(async (h) => {
    const rules = (await chrome.storage.local.get("siteRules")).siteRules ?? {};
    return rules[h]?.status;
  }, hostname);
  expect(storedStatus).toBe("enabled");
});
