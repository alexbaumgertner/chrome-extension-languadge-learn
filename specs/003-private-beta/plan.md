# Implementation Plan: Private Beta

**Branch**: `ship/first-dollar` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

## Summary

Add a random install ID to translation requests, count per-install daily usage server-side, show
it on a password-protected `/admin/metrics` page with recent "Плохой перевод" reports, and ship an
unlisted Chrome Web Store build with a privacy policy and no install-time host access.

## Technical Context

**Language/Version**: TypeScript 5 strict, Node 24
**Primary Dependencies**: existing only — Fastify, zod (`packages/shared`), Neon serverless
driver, WXT + React. No new runtime dependencies planned.
**Storage**: Neon Postgres — new `install_daily_usage` (install_id, day, translations, cache_hits,
failures) and `translation_reports` (source, output, level, model, created_at; no install ID).
Extension: install ID in `chrome.storage.local`.
**Testing**: vitest + PGlite (backend), vitest + Playwright (extension), as in Phase 1.
**Target Platform**: Chrome MV3; Vercel (fra1).
**Constraints**: constitution 2.0.0; no secrets in repo.

**Key design points**
- `installId` (UUID v4, `crypto.randomUUID`) becomes a required field of the translate request;
  the route upserts `install_daily_usage` after answering (cache hit / success / failure).
- `POST /api/report` `{ source, output, level }` — the server adds the current model; body-size
  capped like translate. Background sends it on the button click; content shows thank-you/error.
- `/admin/metrics`: server-rendered HTML behind HTTP Basic auth (`ADMIN_PASSWORD` env), reads the
  two tables plus the existing `usage_counters` global row.
- Retention: a daily Vercel Cron calls a secret-protected cleanup endpoint (90 days).
- Store: replace the static all-sites content script with per-origin
  `chrome.scripting.registerContentScripts` (adds `scripting`), privacy policy as a static page.

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
| I. Least Privilege | **Conflict found (pre-existing)**: the manifest declares a static content script on `*://*/*`; Chrome counts content-script matches as host access, so installs show an all-sites warning even though `host_permissions` is empty. Fix (FR-010) by registering scripts per granted origin; adds `scripting`, justified in the listing. To verify in a clean profile. |
| II. Host Page Integrity | OK — report button renders in Shadow DOM next to the paragraph, like the existing inline error. |
| III. Privacy (2.0.0) | OK in app code: install ID only on translate, never in cache keys, logs, or reports; report only on click. **Flag**: Vercel's platform request logs record client IPs outside app control — disclose in the privacy policy. |
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
├── entrypoints/content/   # "Плохой перевод" button
└── entrypoints/background.ts  # report message; scripting registration
STORE_LISTING.md
```

## Complexity Tracking

None.
