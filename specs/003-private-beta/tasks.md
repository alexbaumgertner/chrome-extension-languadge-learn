# Tasks: Private Beta

**Input**: [spec.md](./spec.md), [plan.md](./plan.md). Small commits, one concern each.

- [ ] T1 Model quality judge pass (pick the launch model) — **STOP for the owner's choice**
- [ ] T2 Shared schemas: `installId` on translate request; report request; report message (+ tests)
- [x] T3 Extension: generate/persist install ID on first run; send only with metric events (not with translate or reports)
- [ ] T4 Backend: `install_daily_usage` counting (hit / miss / failure; never fails the request)
- [ ] T5 Backend: `POST /api/report` + `translation_reports` (no install ID)
- [ ] T6 Extension: "Плохой перевод" button with thank-you / retry
- [ ] T7 Backend: `/admin/metrics` behind `ADMIN_PASSWORD` (daily totals, per-install, reports)
- [ ] T8 Backend: 90-day retention cleanup via Vercel Cron
- [x] T9 Extension: per-origin content script registration; verify no install-time warning
- [ ] T10 Privacy policy page; `STORE_LISTING.md` (RU/EN short copy, permission justifications)
- [ ] T11 Deploy, smoke test, production zip, unlisted store submission checklist; PR
