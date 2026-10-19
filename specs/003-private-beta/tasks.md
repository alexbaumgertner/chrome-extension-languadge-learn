# Tasks: Private Beta

**Input**: [spec.md](./spec.md), [plan.md](./plan.md). Small commits, one concern each.

- [ ] T1 Model quality judge pass (pick the launch model) — **STOP for the owner's choice**
- [x] T2 Shared schemas: `installId`, metric events batch, `cache` on translate response; report request; report message (+ tests)
- [x] T3 Extension: generate/persist install ID on first run; send only with metric events (not with translate or reports)
- [x] T4 Backend + extension: `events` table, `POST /api/events`, offline queue; `metrics.sql` (DAU, D1/D3/D7, per install, errors, latency)
- [ ] T5 Backend: `POST /api/report` + `translation_reports` (no install ID)
- [ ] T6 Extension: "Плохой перевод" button with thank-you / retry
- [ ] T7 Backend: `/admin/metrics` behind `ADMIN_PASSWORD` (daily totals, per-install, reports)
- [ ] T8 Backend: 90-day retention cleanup (events: done in T4 on write; reports: T5)
- [x] T9 Extension: per-origin content script registration; verify no install-time warning
- [ ] T10 Privacy policy page; `STORE_LISTING.md` (RU/EN short copy, permission justifications)
- [ ] T11 Deploy, smoke test, production zip, unlisted store submission checklist; PR
