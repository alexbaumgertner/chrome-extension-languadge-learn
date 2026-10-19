# Implementation Plan: Private Beta

**Branch**: `ship/first-dollar` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

## Summary

Add a random install ID to translation requests, count per-install daily usage server-side, show
it on a password-protected `/admin/metrics` page with recent "Плохой перевод" reports, and ship an
unlisted Chrome Web Store build with a privacy policy and no install-time host access.

*(2026-10-19, branch `context-menu-trigger`)*: translation is now started from a context-menu item
on the selection (plus a keyboard shortcut), with activeTab and on-demand injection instead of
per-site permissions.

## Technical Context

**Language/Version**: TypeScript 5 strict, Node 24
**Primary Dependencies**: existing only — Fastify, zod (`packages/shared`), Neon serverless
driver, WXT + React. No new runtime dependencies planned.
**Storage**: Neon Postgres — new `events` (event_id UNIQUE for resend dedup, install_id, name, occurred_on DATE, cache, latency_ms,
error_code, http_status; no text/URL/IP) and `translation_reports` (source, output, level,
density, model, prompt version, created_at; no install ID). Extension: install ID and an
offline event queue in `chrome.storage.local`.
**Testing**: vitest + PGlite (backend), vitest + Playwright (extension), as in Phase 1.
**Target Platform**: Chrome MV3; Vercel (fra1).
**Constraints**: constitution 2.0.0; no secrets in repo.

**Key design points**
- `installId` (UUID v4, `crypto.randomUUID`) travels only in `POST /api/events`
  `{ installId, events[] }` (install, paragraph_translated, exercise_completed, client_error).
  The translate request carries no ID; its response gains `cache: hit|miss`. Events queue in
  `chrome.storage.local` while offline (cap 200) and carry their client time; the server keeps
  only the UTC day. Events older than 90 days are deleted on the first event write of each day.
  Metric queries: `metrics.sql`. *(Changed 2026-10-19 from per-install counters on the translate
  route, so retention can be computed and the ID never travels with page text.)*
- `POST /api/report` `{ source, output, level, density, model, promptVersion }` — model and
  prompt version come from the variant (the translate response now names them, and the extension
  stores them on the cached variant), so a report on an older cached paragraph names the model
  that actually produced it. The button sits in the exercise panel footer (extension UI, never
  over host text); background sends it; the panel shows thank-you or error + retry. Reports older
  than 90 days are deleted on the first report write of each day.
- `/admin/metrics`: server-rendered HTML behind HTTP Basic auth (`ADMIN_PASSWORD` env), reads the
  two tables plus the existing `usage_counters` global row.
- Retention: a daily Vercel Cron calls a secret-protected cleanup endpoint (90 days).
- ~~Store: replace the static all-sites content script with per-origin
  `chrome.scripting.registerContentScripts` (adds `scripting`).~~ Superseded 2026-10-19 by the
  context-menu trigger below.
- **Context-menu trigger** (`apps/extension/lib/page-actions.ts`). Manifest permissions:
  `storage`, `activeTab`, `scripting`, `contextMenus`; `commands.translate-selection` (suggested
  Alt+Shift+G). No host or optional host permissions, no manifest content scripts. A menu click
  or the shortcut grants activeTab; the background pings the frame (`PAGE_ACTION status`), injects
  `content-scripts/content.js` with `chrome.scripting.executeScript` only if no copy is running
  (a second copy would replace the first and lose its restore state), then sends
  `PAGE_ACTION translate-selection`. "Restore original text" uses the `page` context so it never
  shares a right-click with "Translate" (two items would fold into a submenu), and is shown only
  while the active tab answers `hasTranslations: true` (re-checked on tab switch, window focus,
  tab load, and every `TRANSLATIONS_CHANGED` from a content script).
- **Selection → targets** (`lib/dom/selection.ts`): nearest block ancestor of each selected text
  node; one block not fully covered → exact trimmed range; otherwise the outermost touched blocks.
  Code, form controls and editable fields are excluded.
- **Partial range** (`lib/dom/substitution.ts` `applyVariantToRange`): the block's `innerHTML` is
  saved before its first change; the range is deleted and a `span.sw-segment` with the variant is
  inserted. Restore is per block from that snapshot, so it is byte-identical even when the range
  cut through a link (which `deleteContents` splits). Nested translations are restored before an
  outer block is snapshotted.
- **Length cap**: `TRANSLATE_MAX_CHARS` = 1,500 in `packages/shared`, checked on the whole
  selection by the extension (nothing sent, `translate-too-long` recorded) and per request by the
  backend (`413 text-too-long`; was `400` at 5,000). Exercises accept twice that, since a German
  rewrite can run longer than its source.
- **Error split** (`lib/cms/client.ts` `classifyTranslateFailure`): `CmsFetchError` 413/429/5xx/
  other; a rejected fetch is `offline` if `navigator.onLine` is false, otherwise a `no-cors` probe
  of the API origin tells `cors` (server answered) from `unreachable`. Tests run the mock backend
  on `localhost` (no host permission) so CORS is real.

## Constraints (recorded 2026-10-19)

- **No custom domain for the beta.** Everything is served from `https://sprachweise.vercel.app`.
  The privacy policy lives at `https://sprachweise.vercel.app/privacy` (a route, not
  `/privacy.html`), and it MUST disclose that Vercel's platform request logs record visitor IPs.
- **One API base URL.** The backend base URL is a single build-time value
  (`WXT_CMS_BASE_URL`, read only in `apps/extension/lib/config.ts`, production default
  `https://sprachweise.vercel.app`). It is never hardcoded anywhere else in the extension.
- **No backend host in `host_permissions`.** Server-side CORS for the extension origin already
  lets the background worker call the API, so the backend host MUST NOT be added to
  `host_permissions`. A later domain change then needs no new permission, which Chrome would
  otherwise answer by disabling the extension until each user re-approves it.
- **Per-request latency is stored.** Every translation request (cache hit or miss) records its
  latency in ms, so `/admin/metrics` can show p50/p95. Phase 1 already stores provider-call
  latency in `provider_calls`; the beta adds end-to-end request latency.
- **Model pricing.** Production runs `gemini-3.8-flash` (thinking `low`) at about $0.0012–0.0016
  per new paragraph. Its price doubles on 1 Jan 2027 (to about $0.0023–0.003). Revisit the model and
  pricing at the 16 Nov review.

## Constitution Check

| Principle | Status |
| --- | --- |
| I. Least Privilege | **Conflict found (pre-existing)**: the manifest declares a static content script on `*://*/*`; Chrome counts content-script matches as host access, so installs show an all-sites warning even though `host_permissions` is empty. Fix (FR-010) by registering scripts per granted origin; adds `scripting`, justified in the listing. To verify in a clean profile. **Update 2026-10-19 (context-menu trigger)**: stricter than the principle's own floor — `optional_host_permissions` removed; page access comes only from `activeTab` on a menu click or shortcut. Added `contextMenus` (justified: it is the trigger; no warning) and `commands` (no permission). `getPermissionWarningsByManifest` on the production manifest (Chrome 151): install `[]`; update from the draft adds only `contextMenus` → `[]`. |
| II. Host Page Integrity | OK — report button renders in Shadow DOM next to the paragraph, like the existing inline error. Partial-range replacement only touches the selected block and restores it byte-identically. |
| III. Privacy (2.0.0) | OK in app code: install ID only on translate, never in cache keys, logs, or reports; report only on click. **Flag**: Vercel's platform request logs record client IPs outside app control — disclose in the privacy policy. **Update 2026-10-19**: the consent gesture is now choosing "Translate to German (Sprachweise)" for a selection (the principle's text still says "clicking a paragraph"; same meaning, wording to be amended); the extension cannot read the page before that choice, and a selection is capped at 1,500 characters. New client_error codes are fixed strings, no text. |
| IV. Offline-First | OK — metrics never block translation; a metrics write failure must not fail the request. |
| V. Typed Contracts | New zod schemas for `installId`, the report request, and the report message. |
| VI. Test What Breaks | Tests: usage counting (hit/miss/failure), install-ID validation, report endpoint, admin auth. |
| VII. Simplicity | Server-rendered admin page, no charts, no new dependencies. |
| VIII. Unobtrusive UX | Report button is small and dismissible. |

## Project Structure

```text
apps/cms/src/
├── metrics/           # daily usage upsert, admin queries
├── routes/report.ts   # POST /api/report
├── routes/admin.ts    # GET /admin/metrics (Basic auth)
└── routes/translate.ts  # requires installId, records usage
apps/cms/public/privacy.html   # served at /privacy
apps/extension/
├── lib/install-id.ts
├── entrypoints/content/   # "Плохой перевод" button; selection → translate / restore
├── entrypoints/background.ts  # report message; context menu + shortcut handlers
├── lib/page-actions.ts    # menu items, on-demand injection, Restore visibility
└── lib/dom/selection.ts   # selection → exact range or whole blocks
STORE_LISTING.md
```

## Complexity Tracking

None.
