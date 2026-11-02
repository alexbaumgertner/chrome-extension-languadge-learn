import { defineConfig } from "wxt";

// Integration tests can't click Chrome's context menu, so they never get the activeTab grant a
// real menu click gives. Test builds (pnpm test:integration sets WXT_TEST_MODE) therefore get the
// fixture page's host as a host permission; the production manifest has none (Constitution I).
const testOrigin =
  process.env.WXT_TEST_MODE === "true" && process.env.WXT_TEST_ORIGIN
    ? `*://${new URL(process.env.WXT_TEST_ORIGIN).hostname}/*`
    : undefined;

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: ".",
  zip: { artifactTemplate: "sprachweise-{{version}}-{{browser}}.zip" },
  manifest: {
    // public/_locales/{en,ru}: the store shows the summary in the viewer's language. It must stay
    // within 132 characters (store limit; checked by scripts/build-store-zip.mjs).
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    // No host permissions at all. Page access comes only from activeTab, which Chrome grants for
    // one tab when the learner picks our context-menu item or presses our shortcut; the
    // background then injects the content script into that tab (lib/page-actions.ts).
    // - "storage": chrome.storage.local / IndexedDB for progress and cached translations
    //   (Constitution IV). No site data.
    // - "activeTab": the temporary, gesture-only access above.
    // - "scripting": chrome.scripting.executeScript, to inject the content script on that gesture.
    // - "contextMenus": the "Sprachweise" submenu on a selection ("Translate to German", "Translate
    //   to my level", "Read aloud") and the "Restore original text" item.
    // - "sidePanel": shows the result of "Translate to my level" and "Read aloud" in Chrome's side
    //   panel (an extension page, opened from the menu click). Reads no page.
    // None of the five shows an install or update warning.
    permissions: ["storage", "activeTab", "scripting", "contextMenus", "sidePanel"],
    // The fallback for sites that replace the right-click menu. Also grants activeTab.
    commands: {
      "translate-selection": {
        suggested_key: { default: "Alt+Shift+G" },
        description: "__MSG_commandTranslate__",
      },
    },
    ...(testOrigin ? { host_permissions: [testOrigin] } : {}),
  },
});
