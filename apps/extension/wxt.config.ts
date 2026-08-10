import { defineConfig } from "wxt";

// Integration tests need the content script to actually run against a local
// fixture origin without simulating Chrome's native permission-grant dialog.
// This adds that single origin to host_permissions ONLY for test builds
// (pnpm test:integration sets WXT_TEST_MODE) — the production manifest keeps
// zero default host permissions (Constitution I). Scheme-wildcarded and
// port-free to exactly match the pattern shape SET_SITE_STATUS/GET_SITE_STATUS
// request and check at runtime (`*://<hostname>/*`) — chrome.permissions.contains
// requires an exact-or-broader match, and match patterns don't encode ports.
const testOrigin =
  process.env.WXT_TEST_MODE === "true" && process.env.WXT_TEST_ORIGIN
    ? `*://${new URL(process.env.WXT_TEST_ORIGIN).hostname}/*`
    : undefined;

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: ".",
  manifest: {
    name: "Sprachweise",
    description:
      "Click any paragraph on an enabled site to read it in German at your level, practice with exercises built from it, and track your progress.",
    // "storage" is a zero-host-access permission (chrome.storage.local /
    // IndexedDB only, no site data) required by Constitution IV's
    // offline-first design — it carries none of the trust cost the
    // least-privilege gate (Constitution I) is guarding against.
    // "activeTab" is the exact permission Constitution I's own gate names
    // ("activeTab + optional_host_permissions") — temporary, user-gesture-only
    // access to the current tab, needed for the popup to read its hostname.
    permissions: ["storage", "activeTab"],
    optional_host_permissions: ["*://*/*"],
    ...(testOrigin ? { host_permissions: [testOrigin] } : {}),
  },
});
