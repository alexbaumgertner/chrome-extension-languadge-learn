import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "./fixtures";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.resolve(__dirname, "../../.output/chrome-mv3/manifest.json");

/**
 * SC-004 / Constitution I: installing must not warn about anything. The test build adds the
 * fixture origin to host_permissions (wxt.config.ts), so that test-only key is dropped and Chrome's
 * own warning generator is asked about the rest of the manifest as shipped.
 */
test("the shipped manifest asks for no site access and triggers no install-time warnings", async ({
  serviceWorker,
}) => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as Record<string, unknown>;
  expect(manifest.content_scripts ?? []).toEqual([]);
  expect(manifest.optional_host_permissions).toBeUndefined();
  expect([...(manifest.permissions as string[])].sort()).toEqual([
    "activeTab",
    "contextMenus",
    "scripting",
    "storage",
  ]);
  expect(Object.keys(manifest.commands as object)).toEqual(["translate-selection"]);
  delete manifest.host_permissions;

  const warnings = await serviceWorker.evaluate(
    (m) => chrome.management.getPermissionWarningsByManifest(m),
    JSON.stringify(manifest),
  );
  expect(warnings).toEqual([]);

  // Control: the generator does warn about site access, e.g. for a content script on every site.
  const withStaticScript = {
    ...manifest,
    content_scripts: [{ matches: ["*://*/*"], js: ["content-scripts/content.js"] }],
  };
  const controlWarnings = await serviceWorker.evaluate(
    (m) => chrome.management.getPermissionWarningsByManifest(m),
    JSON.stringify(withStaticScript),
  );
  expect(controlWarnings.length).toBeGreaterThan(0);
});
