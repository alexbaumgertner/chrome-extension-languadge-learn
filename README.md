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
  (normal or slow speed). Click a highlighted word to see its meaning.
- **"Bad translation"** ("Плохой перевод" in the Russian UI) — report a bad
  translation for review in one click.
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
3. Use the exercise panel on the right; click highlighted words for their
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
| `pnpm build:release`                                | Release zip; requires `WXT_CMS_BASE_URL`, `EXPECTED_VERSION`. |
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

## Releasing

Releases are built by `.github/workflows/release.yml`. Nothing is committed: the version lives
only in the tag.

### Tag → GitHub Release

Push a `vX.Y.Z` tag on a commit that is on `main` (X, Y, Z in 0–65535, no pre-release suffix).
The version must be higher than the one in the Chrome Web Store, or the store refuses the upload.

```sh
git switch main && git pull
git tag v0.2.0
git push origin v0.2.0
```

The `build-release` job then:

1. Checks that the tag's commit is on `origin/main` and that the tag is `vX.Y.Z`.
2. Sets `version` in `apps/extension/package.json` to `X.Y.Z` (working copy only), which becomes
   the manifest version.
3. Checks `vars.WXT_CMS_BASE_URL` (must be `https://host`, no path or trailing slash) and runs
   `pnpm build:release` against it.
4. Renames the zip to `sprachweise-vX.Y.Z-chrome.zip` and re-checks that file with
   `apps/extension/scripts/verify-release.mjs`: no local hosts or test hooks, the expected
   permissions and version. Then computes its SHA-256.
5. Smoke-tests the backend with `.github/scripts/smoke-backend.sh` the way the store extension
   calls it: `/privacy`, `/api/translate`, `/api/exercises`, `/api/tts` and their CORS preflights
   for `chrome-extension://<CWS_ITEM_ID>`. `/api/report` and `/api/events` get a preflight and an
   empty POST that must come back 400 from validation, so nothing is written to production. The preflights must allow the origin, `POST` and
   `Content-Type`; translate and exercises bodies are checked against the extension's response
   schemas (`packages/shared`). No response, 5xx, any other 4xx, a missing CORS grant or a body the
   extension would reject fail the release. Tolerated as warnings: 429 (daily allowance used up)
   on translate and exercises, 404 on `/api/tts` (no such route yet).
6. Creates the GitHub Release `vX.Y.Z` (or updates it on a re-run) with the zip and
   `<zip>.sha256` attached. The body, rendered by `.github/scripts/render-release-notes.mjs` from
   `store/release-notes.md.tmpl`, holds the changelog since the previous tag, the package facts,
   every Chrome Web Store dashboard field ready to copy, and a pre-release checklist filled in by
   the steps that ran. The same body is in the run's summary.

The Chrome Web Store API v2 only uploads, publishes and reports status; it can't edit the listing.
Copy the dashboard fields from the release body by hand. They come from these files at the tagged
commit:

| File                                                 | Dashboard field                              |
| ---------------------------------------------------- | -------------------------------------------- |
| `store/description.txt`                              | Store listing → Description (Russian)        |
| `store/description.en.txt`                           | Store listing → Description (English)        |
| `store/permissions.json` (or `store/permissions.md`) | Privacy practices → Permission justification |
| `store/test-instructions.txt` (or `.md`)             | Test instructions → Additional instructions  |

`permissions.json` maps each permission or host pattern to its justification:
`{"storage": "…"}`. `permissions.md` is pasted as is. A missing file shows up as a PLACEHOLDER in
the body and a warning in the checklist; it doesn't fail the release. The summary comes from the
manifest (`extDescription` in `_locales/*/messages.json`); single purpose, remote code, data usage
and the privacy policy URL are in the template. See `docs/store-listing.md` for the rest of the
listing.

### Upload to the Chrome Web Store

Actions → Release → Run workflow, pick the tag under **Use workflow from → Tags** (a run on a
branch fails), and tick **publish_to_store**. `build-release` runs again, then the
`publish-store` job waits for approval in the `chrome-web-store` environment. Once approved, it
downloads the zip from the GitHub Release, checks its SHA-256 and runs
`.github/scripts/cws-publish.mjs`:

1. Fetches the item's status; stops if the store already has this version or a higher one, or if
   another submission is pending review.
2. Uploads the zip and waits (up to 10 minutes) until the store has processed it, then checks the
   version the store read from it.
3. Submits it for review (`DEFAULT_PUBLISH`). Visibility (unlisted) and rollout stay as set in the
   dashboard.

The submission takes the listing as it is in the dashboard at that moment. Paste the fields from
the release body and save the draft before you approve the `publish-store` job, or the old texts go
to review with the new package.

### Setup

Repository variables (Settings → Secrets and variables → Actions → Variables):

| Variable           | Value                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `WXT_CMS_BASE_URL` | The production API, `https://host` without a trailing slash. Required.                                                                      |
| `CWS_ITEM_ID`      | The store item ID. Optional: when unset, the workflow uses `ahkgdlbpociadhocjjomkkeliiligebj` for the CORS check, the notes and the upload. |

Secrets of the `chrome-web-store` environment (Settings → Environments → `chrome-web-store`; add
required reviewers so every upload needs an approval; repository secrets with the same names also
work, but then any workflow can read them):

| Secret              | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| `CWS_CLIENT_ID`     | OAuth client ID of the Google Cloud project with the Chrome Web Store API. |
| `CWS_CLIENT_SECRET` | That client's secret.                                                      |
| `CWS_REFRESH_TOKEN` | Refresh token for the publisher account, scope `chromewebstore`.           |
| `CWS_PUBLISHER_ID`  | The publisher ID from the developer dashboard.                             |

The secrets are only passed to the upload step. `cws-publish.mjs` masks the access token in the
log and prints only HTTP status and the API's error message, never a credential.
