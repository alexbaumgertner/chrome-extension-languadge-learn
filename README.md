# Sprachweise

A Chrome extension for learning German by reading real web content. Select text
on any page, right-click and choose **Translate to German (Sprachweise)**: the
selection is replaced by a German version at your level, with glosses for new
words and exercises built from that text. Progress is tracked locally.

## Features

- **Translate a selection from the right-click menu** — on any page, no
  per-site setup and no reload. Exactly the selected text is replaced, one
  paragraph at a time; a fully selected paragraph is replaced whole. At most
  1,500 characters at a time. Selections that include code or form fields,
  or text outside a paragraph, are refused with a message.
- **Keyboard shortcut** — `Alt+Shift+G` (changeable at
  `chrome://extensions/shortcuts`) does the same as the menu item, for sites
  that replace the right-click menu.
- **Restore original text (Sprachweise)** — right-click the page to put every
  translated passage back exactly as it was.
- **Level control** — A1–A2, B1–B2 or C1+, in Settings.
- **Exercises generated from what you read**: match German words to their
  Russian meanings, fill in the missing word, multiple choice and dictation
  (normal or slow speed). Click an underlined word to see its meaning.
- **"Плохой перевод"** — report a bad translation for review in one click.
- **Progress tracking** — Settings → Progress shows your day streak, exercises
  solved today, active vocabulary, review queue and per-topic accuracy.

The extension asks for no website access at install. It uses `activeTab`:
Chrome lets it read a page only when you pick its menu item or press its
shortcut, and only that tab. Permissions: `storage`, `activeTab`, `scripting`,
`contextMenus`; no host permissions.

## Installation (unpacked)

1. `pnpm install && pnpm build` (builds `apps/extension/.output/chrome-mv3`
   against the production API, `https://sprachweise.vercel.app`).
2. Open `chrome://extensions`, enable **Developer mode**, click **Load
   unpacked** and select `apps/extension/.output/chrome-mv3`.

After rebuilding, click the refresh icon on the extension's card. Pages that
were open keep working: the next menu click injects the new script.

## Usage

1. Select a sentence or paragraphs on any page.
2. Right-click → **Translate to German (Sprachweise)** (or press
   `Alt+Shift+G`).
3. Use the exercise panel on the right; click underlined words for their
   meaning.
4. Right-click the page → **Restore original text (Sprachweise)** to undo.
5. Open **Settings** (right-click the toolbar icon → Options) to change your
   level and see your progress.

## Development

pnpm workspace: `apps/extension` (WXT + React), `apps/cms` (Fastify API on
Vercel, Neon Postgres, Gemini), `packages/shared` (zod schemas for every
message and API contract).

| Command                                             | What it does                                                  |
| --------------------------------------------------- | ------------------------------------------------------------- |
| `pnpm --filter @sprachweise/extension dev`          | WXT dev server with hot reload.                               |
| `pnpm --filter @sprachweise/cms dev`                | Local API on `http://localhost:8787` (needs `apps/cms/.env`). |
| `pnpm build`                                        | Builds every package.                                         |
| `pnpm test:unit`                                    | Vitest unit tests.                                            |
| `pnpm test:integration`                             | API tests (PGlite) and the extension's Playwright suite.      |
| `pnpm store:zip`                                    | Production Chrome Web Store package, with manifest checks.    |
| `pnpm --filter @sprachweise/extension store:assets` | Re-renders icons and store screenshots.                       |

The extension's API base URL is `WXT_CMS_BASE_URL` at build time; otherwise
production builds use `https://sprachweise.vercel.app` and dev builds
`http://localhost:8787` (`apps/extension/lib/config.ts`).

### Integration tests

`pnpm --filter @sprachweise/extension test:integration` runs `build:test`
(fixture page `http://127.0.0.1:58732`, mock API `http://localhost:58733`) and
then Playwright in headless Chromium. The fixtures start a fixture page server
and a mock API with real CORS for each test. Playwright can't open Chrome's
native context menu or press an extension shortcut, so test builds expose the
same handlers on the service worker (`sprachweiseTest`) and get the fixture
host as a host permission in place of the activeTab grant. Neither exists in
production builds (`pnpm store:zip` checks).
