# Tasks: Private Beta

**Input**: [spec.md](./spec.md), [plan.md](./plan.md). Small commits, one concern each.

> **Handoff (2026-10-19, end of Part 1, branch `003-private-beta-part1`)**
> - **Done:** T9 per-site content scripts (no install warning), install ID, event collection +
>   `metrics.sql`, "Плохой перевод" reports, `/privacy`, store package (`pnpm store:zip`,
>   `docs/store-listing.md`, `docs/store-assets/`).
> - **Not done:** production deploy of this branch. It was blocked by a permission check in the
>   session, so `/privacy`, `/api/events` and `/api/report` are not live yet and `metrics.sql`
>   has only run against PGlite, not production.
> - **Next (Part 2):** deploy; run `metrics.sql` against production; T7 `/admin/metrics`; store
>   upload; add the store item ID to `CORS_ALLOWED_ORIGINS`.
> - **Contact email:** `alex.baumgertner+sprachweise@gmail.com` (privacy policy).
> - **Open questions:** confirm the Gemini API key's project is on paid billing (Gemini API terms allow only Paid Services for
>   users in the EEA, Switzerland or the UK); whether to tick "Location" in the store's data form
>   (see `docs/store-listing.md`).

- [x] T1 Model quality judge pass (pick the launch model) — owner chose `gemini-3.8-flash` / thinking `low` (PR #2)
- [x] T2 Shared schemas: `installId`, metric events batch, `cache` on translate response; report request; report message (+ tests)
- [x] T3 Extension: generate/persist install ID on first run; send only with metric events (not with translate or reports)
- [x] T4 Backend + extension: `events` table, `POST /api/events`, offline queue; `metrics.sql` (DAU, D1/D3/D7, per install, errors, latency)
- [x] T5 Backend: `POST /api/report` + `translation_reports` (no install ID; 90-day deletion on write)
- [x] T6 Extension: "Плохой перевод" button (exercise panel footer) with thank-you / retry
- [ ] T7 Backend: `/admin/metrics` behind `ADMIN_PASSWORD` (daily totals, per-install, reports)
- [x] T8 Backend: 90-day retention cleanup (on the first write of each day, events in T4, reports in T5; no cron needed)
- [x] T9 Extension: per-origin content script registration; verify no install-time warning
- [x] T10 Privacy policy at `/privacy` (RU + EN, server route) — store listing moved to T11 (`docs/store-listing.md`)
- [ ] T11 Release
  - [x] Production zip: `pnpm store:zip` (builds, checks manifest/permissions/API URL/description length)
  - [x] `docs/store-listing.md` (RU/EN copy, category, Unlisted, permission justifications, data-usage answers); icons + 1280×800 screenshots + promo tile via `store:assets`
  - [x] PR `003-private-beta-part1` → `main`
  - [ ] Deploy backend to production; smoke test `/privacy`, `/api/events`, `/api/report`
  - [ ] Run `metrics.sql` against production
  - [ ] Store upload (Unlisted); add store item ID to `CORS_ALLOWED_ORIGINS`; redeploy
