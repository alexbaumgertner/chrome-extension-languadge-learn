# Sprachweise

A Chrome extension for learning German by reading real web content. Click any
paragraph on an enabled site to have it translated to German at your chosen
level, then practice with exercises generated from that paragraph while the
extension tracks your progress over time.

## Features

- **In-page reading practice** — click a paragraph on any enabled site to see
  it rendered in German.
- **Level control** — set your CEFR level (e.g. A1-A2 through B1-B2) and how
  much of the text gets translated ("translation density") from the Settings
  page.
- **Exercises generated from what you read**, including:
  - Match German words to their Russian meanings
  - Fill in the missing word
  - Dictation ("type what you heard"), with audio playback at normal or slow
    speed
  - Reveal meaning for a quick vocabulary check
- **Per-site control** — enable or disable Sprachweise for the current site
  from the toolbar popup, or manage rules for multiple sites from
  Settings → Site Rules.
- **Progress tracking** — Settings → Progress shows your day streak,
  exercises solved today, active vocabulary size, review queue, per-topic
  accuracy, and current grammar topic.

## Installation

This repo doesn't currently include a packaged `.crx`/Chrome Web Store
listing, so install it as an unpacked extension:

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select `apps/extension/.output/chrome-mv3` from this repo.
5. Sprachweise should now appear in your extensions list and toolbar.

If you edit and rebuild the extension, click the refresh icon on its card in
`chrome://extensions` to pick up the new build.

## Usage

1. Click the Sprachweise icon in the toolbar and choose **Enable on this
   site** for any site you want to practice on.
2. Browse the site normally; click a paragraph to have it translated to
   German.
3. Use the exercises that appear (match, fill-in-the-blank, dictation,
   reveal) to practice the words and grammar from that paragraph.
4. Open **Settings** (right-click the toolbar icon → Options, or via the
   popup) to:
   - Change your level and translation density
   - Enable/disable additional sites under Site Rules
   - Review your stats and vocabulary under Progress

## Running from source

The `main` branch's working tree only contains the built extension and
installed dependencies — the application source lives on the
`spike/dom-swap` branch (commit `c39cf25`) and hasn't been merged yet. To
build or develop it:

```sh
git checkout spike/dom-swap
pnpm install
```

This is a pnpm workspace (`apps/extension` + `packages/shared`). Useful
scripts from the root `package.json`:

| Command                    | What it does                                                            |
| --------------------------- | ------------------------------------------------------------------------ |
| `pnpm --filter apps/extension dev` | Starts the WXT dev server with hot-reload (`wxt`).               |
| `pnpm build`                | Builds the extension into `apps/extension/.output/chrome-mv3`.          |
| `pnpm test:unit`            | Runs the Vitest unit tests.                                             |
| `pnpm test:integration`     | Builds a test bundle and runs the Playwright integration suite.         |

### Translation backend

The background worker talks to a "Payload CMS" backend
(`apps/extension/lib/cms/client.ts`) through three endpoints:
`/api/translate`, `/api/exercises`, `/api/tts`. Its base URL is:

- `WXT_CMS_BASE_URL` env var at build time, if set, otherwise
- `http://localhost:8787` by default.

That real backend isn't part of this repo, so `dev`/`build` builds won't be
able to translate anything unless you point `WXT_CMS_BASE_URL` at a CMS
instance that implements those endpoints yourself.

For local testing without a real backend, `pnpm test:integration` runs
`build:test`, which bakes in `WXT_CMS_BASE_URL=http://127.0.0.1:58733` and
`WXT_TEST_ORIGIN=http://127.0.0.1:58732`, then starts Playwright. Playwright's
fixtures (`apps/extension/tests/integration/fixtures.ts`) automatically spin
up a mock CMS server (`mock-cms-server.ts`) and a fixture content server
(`fixture-server.ts`) on those exact ports for the duration of the test run,
then tear them down — they aren't standalone servers you start and leave
running.

This also explains the `.output/chrome-mv3` build already present in this
repo: it was produced by `build:test`, so its background script has
`http://127.0.0.1:58733` hardcoded in and will only translate successfully
while a Playwright integration run (or a manually-started
`createMockCmsServer()` from `mock-cms-server.ts`) is listening on that port.
