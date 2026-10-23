# Permission justifications

Source of truth: the production manifest built from `apps/extension/wxt.config.ts`
(`wxt build` → `.output/chrome-mv3/manifest.json`). It requests exactly four permissions and no
hosts. Paste each paragraph into the matching field of Privacy practices in the dashboard.
(`store/permissions.json` holds the same justifications in the form the release workflow reads; keep
the two in step.)

## `storage`

Sprachweise keeps the learner's data in the browser (`chrome.storage.local` and IndexedDB): the
level setting, vocabulary and review schedule, exercise progress and streak, translations already
fetched (so text translated before works offline and isn't sent again), a random install ID, and
usage events that haven't been sent yet. None of it is read from a website, and it is removed with
the extension.

## `contextMenus`

Adds two right-click items: "Translate to German (Sprachweise)", shown only when text is selected,
and "Restore original text (Sprachweise)", shown only while the current tab displays a translation.
Choosing the translate item is how the user starts every translation; no page content is read and no
text is sent before that.

## `activeTab`

Gives temporary access to the current tab only at the moment the user picks a Sprachweise item in
the right-click menu or presses the extension's keyboard shortcut (Alt+Shift+G). The extension uses
it to read the text the user selected and to replace it with the German version. It grants nothing
on any other tab and nothing at any other time. This is why the extension needs no host permissions.

## `scripting`

Used for a single call: `chrome.scripting.executeScript`, which injects the extension's own bundled
script (`content-scripts/content.js`) into the current tab right after the user's menu click or
shortcut, under the `activeTab` grant. The manifest declares no static content scripts, so the
extension never runs on a page the user hasn't acted on. No code is fetched from anywhere: the
injected file is part of the package.

## Host permissions: none

The manifest has no `host_permissions`, no `optional_host_permissions` and no content-script
`matches`, so there is no host to justify. The only server the extension talks to is its own backend,
`https://sprachweise.vercel.app` (translation, exercises, usage events, bad-translation reports),
which is called from the background service worker with a plain `fetch` and needs no host permission.

## Not permissions, for completeness

- The keyboard shortcut (`commands`, `translate-selection`, suggested Alt+Shift+G) does the same as
  the menu item for sites that replace the right-click menu. It needs no permission and shows no
  install warning.
- The popup and the settings/progress page are extension pages; they request nothing extra.
