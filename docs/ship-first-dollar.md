# Ship to first dollar — audit, decisions, plan

Goal: one stranger pays $4/month. Ship the smallest public version that can take money.
Branch: `ship/first-dollar`, one PR per phase. Spec-kit governs from Phase 2 on (constitution
2.0.0, `specs/003-private-beta`).

> **2026-10-19 — change of plan:** Phase 2 is now a **private beta** (owner + 3–5 friends): install
> ID, usage metrics + `/admin/metrics`, "Плохой перевод" reports, unlisted store release, privacy
> policy. **Payments, paywall, license keys and the Pro tier are deferred until the beta review on
> 16 Nov 2026.** Decision 4 and the original Phase 2 below are on hold, not cancelled.

**The one scenario:** install from Chrome Web Store → set level → click a paragraph on any site →
see it in German → do 3 exercises → hit the free daily limit → pay → enter license key → unlimited.

**Hard cuts:** Turkish/English targets, studio page, grammar topics, progress-dashboard polish,
password accounts, social login, UI i18n beyond RU + EN, new exercise types.

## Phase 0 audit (2026-10-19)

### State before this work

| Check | Result |
| --- | --- |
| `pnpm build`, typecheck, lint | pass |
| `pnpm test:unit` (shared 39, cms 15, extension 36) | pass |
| CMS integration tests (vitest, mocked providers) | 14 pass |
| Extension Playwright suite (mock CMS) | 12 pass — but root `pnpm test:integration` matched no package (`--filter apps/extension`) |
| `/api/translate` | implemented: Google Translate → Gemini adapt → Translate glosses; SQLite cache, coalescing, retry, global ledger |
| `/api/exercises`, `/api/tts` | **missing** — exist only in the Playwright mock CMS |

Against the real backend the product did not work end-to-end:

1. The background worker fetches translate + exercises in one `try`, so the `/api/exercises` 404
   failed every paragraph with "fetch-failed".
2. `gemini-2.0-flash` (hardcoded) was shut down 2026-06-01, so `/api/translate` returned 502.

Other findings:

- Server 429 was mapped to the generic "fetch-failed" in the extension — no hook for a paywall.
- The free-text "topic" setting is the cut grammar-topics feature and fragments the cache key.
- Gemini free-tier content is used to improve Google products → run on paid-tier billing; say so in
  the privacy policy.
- README was stale (claimed source lives on a spike branch and the backend isn't in the repo).

### Cost model (per ~500-char Russian paragraph)

| | Old pipeline | Gemini-only (chosen) |
| --- | --- | --- |
| Google Translate raw + glosses (~600 chars × ~$20/1M) | ~$0.012 | — |
| Gemini (~450 in / ~400 out tokens, 3.5 Flash-Lite $0.30/$2.50 per 1M) | ~$0.001 | ~$0.0011 |
| Exercises (deterministic from `markedVocab`) | $0 | $0 |
| TTS | — | $0 (browser `speechSynthesis`) |
| **Total** (server cache hit = $0) | **~$0.013** | **~$0.001** |

Free cap 5/day → ≤ ~$0.17/month per daily free user. Pro cap 1,000/month → ≤ ~$1.10/month per Pro
user against ~$3.30 net of a $4 price.

## Decisions

1. **Gemini-only pipeline.** One structured-output call does translate + CEFR adaptation + Russian
   glosses. Google Translate removed (code, config, secret).
2. **Model `gemini-3.8-flash`** (since 2026-10-19; was `gemini-3.5-flash-lite`), set via
   `GEMINI_MODEL=gemini-3.8-flash` and `GEMINI_THINKING_LEVEL=low` (3.8 rejects `minimal`).
   `apps/cms/scripts/quality-check.ts` runs 20 real Russian paragraphs (news/blog/forum, A2 + B1)
   through the pipeline and writes `quality-report.md` (source / German / glosses) for model
   comparison by switching the env var.
3. **No server TTS for launch.** `/api/tts` call removed; browser `speechSynthesis` is the main
   path, preferring a `de-DE` Google voice. No TTS caps.
4. **(On hold until 16 Nov review.) Limits:** Free 5 paragraphs/day per install + a second free cap per hashed IP (daily salt, raw
   IPs never stored). Pro 1,000/month + 100/day. Price $4/month. The existing global provider
   ledger stays as a budget kill switch.
5. **Domain `sprachweise.com`** (being bought). Use the `*.vercel.app` URL until DNS is confirmed;
   the base URL stays in config (`WXT_CMS_BASE_URL`).
6. **Hosting:** Vercel project in `fra1` (Fastify zero-config, entry `apps/cms/src/server.ts`),
   Neon Postgres in `eu-central-1` replacing SQLite. Created via MCP after the user approves names.
   CORS limited to the extension origin(s) from config. Privacy + landing as static files in the
   same Vercel project.

## Plan

- **Phase 1 — deploy backend:** Postgres storage; Gemini-only pipeline + `GEMINI_MODEL`;
  deterministic `/api/exercises`; drop `/api/tts` client call, `speechSynthesis` main path; CORS;
  hide topic (fixed `general`); fix root integration script; quality-check script; deploy; prod
  `WXT_CMS_BASE_URL`.
- **Phase 2 — private beta (current):** see `specs/003-private-beta` — model judge pass, install
  ID, usage metrics + `/admin/metrics`, "Плохой перевод" reports, per-origin content scripts,
  privacy policy, unlisted store release.
- **Deferred to after the 16 Nov review — free tier, license, paywall:** install ID, per-install + hashed-IP ledger, distinct
  `limit-reached` reason, Russian paywall card ("Get Pro" checkout link from config, "Enter key"),
  key field in Settings, `LicenseProvider` interface with a stub + test key. **Stop and ask which
  merchant of record before the real provider** (seller: Georgian sole proprietorship).
- **Phase 3 — store-ready:** prod zip, `STORE_LISTING.md` (RU + EN, screenshots plan, permission
  justifications), privacy page, RU landing page.
- **Phase 4 — verify:** tests for limit reached / valid key / invalid key / provider outage;
  10-minute manual checklist; README rewrite (store install, no "Load unpacked" for users).

## Progress log

- 2026-10-19 — Phase 0 audit approved; decisions above recorded. Phase 1 started.
- 2026-10-19 — Phase 1 done (PR from `ship/first-dollar`).
  - Infra: Vercel project `sprachweise` (team `alexbaumgertner`, functions `fra1`, root
    `apps/cms`, deployed from the repo root with `vercel deploy --prod`; not Git-connected).
    Neon `sprachweise-postgresql` (`holy-wave-92980856`, aws-eu-central-1) provisioned through the
    Vercel Marketplace — Neon refuses direct creation in the Vercel-managed org. DB name is the
    marketplace default `neondb`.
  - Prod API: `https://sprachweise.vercel.app` (`/api/translate`, `/api/exercises`, `/api/health`).
    Env on Vercel: `GEMINI_API_KEY`, `DATABASE_URL` (marketplace), `CORS_ALLOWED_ORIGINS`
    (currently only the unpacked dev ID `ciljphedapbigafgeeihmkibcgfkppjo` — add the store ID
    in Phase 3).
  - Vercel's Fastify builder type-checks TS entries without strict mode, so the build bundles
    `src/main.ts` → `server.mjs` with esbuild and Vercel deploys that.
  - Quality check (gemini-3.5-flash-lite, 20 paragraphs): 20/20 OK, avg 1.3 s, $0.00064 per
    paragraph. Spotted errors: wrong article ("Der Ticket"), wrong verb ("mit Stress umkehre"),
    lost meaning at A1-A2 ("колесо обозрения" → "Rad fahren"), a bad gloss span ("Lebensmittel
    ein"). Re-run with another `GEMINI_MODEL` to compare.
  - Integration suite: one flaky run seen in four (element-not-found in unrelated specs).
- 2026-10-19 — Constitution amended to 2.0.0 (Principle III: random install ID for usage metrics;
  bad-translation report only on click). Plan changed to a private beta; payments deferred until the
  16 Nov 2026 beta review. Spec: `specs/003-private-beta`.
- 2026-10-19 — Model judge pass (blind, `gemini-3.1-pro-preview`, 20 paragraphs): 3.8-flash 4.86,
  3.6-flash 4.61, 3.1-flash-lite 4.30, 3.5-flash-lite 4.15. Production switched to
  `gemini-3.8-flash` / thinking `low` (Vercel production env). Prompt v2 glosses nouns with article
  and separable verbs with prefix (`lemma` field). Per-call model/tokens/cost/latency now recorded
  in `provider_calls`. Cache key includes model, thinking level and prompt version.
