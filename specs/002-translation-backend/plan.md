# Implementation Plan: Translation Backend

**Branch**: `002-translation-backend` | **Date**: 2026-08-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-translation-backend/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

A new backend service (`apps/cms`) that implements the `POST /api/translate` endpoint the extension's background worker already calls (`specs/001-in-page-reading-practice/contracts/cms-api-contract.md`), currently unimplemented ("that real backend isn't part of this repo," `README.md`). Given paragraph text, a CEFR level, and a grammar topic, it returns a German rewrite at that level (safe-subset HTML) with vocabulary spans glossed in Russian. Technical approach: a two-step external pipeline (Google Cloud Translation API for raw translation + Russian glosses, Gemini Flash for CEFR-level rewriting + vocabulary selection — research.md §1) sits behind a global, indefinitely-persisted, identity-free cache keyed by a normalized-text+level+topic hash, with in-process request coalescing and a per-provider usage ledger that hard-caps new (non-cached) calls once either provider's free allowance is reached.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode, Node.js 20 LTS (matches workspace root `engines.node`)

**Primary Dependencies**: Fastify (HTTP server), `better-sqlite3` (cache + usage-ledger persistence), `zod` via `@sprachweise/shared` (request/response contract validation, reused from `packages/shared/src/schemas/cms.ts`) — no provider SDKs, plain `fetch` to Google Cloud Translation API (Basic v2) and Gemini API REST endpoints (research.md §9)

**Storage**: SQLite file (`CMS_DB_PATH`) — `cache_entries` table (indefinite, no TTL/eviction, per FR-004) and `usage_counters` table (per-provider, per-period, per FR-009/010); no other persistence

**Testing**: Vitest (unit: cache-key normalization, HTML safe-subset validator, usage-ledger threshold math, coalescing map; integration: Fastify `.inject()` against routes with both providers mocked, covering all four user stories) — matches the workspace's existing Vitest convention (`apps/extension`, `packages/shared`)

**Target Platform**: Single always-on Node.js process, any low-cost/free host with a persistent volume (Fly.io, Render, small VPS) — not a distributed/edge deployment (research.md §4)

**Project Type**: New workspace app (`apps/cms`) added to the existing pnpm monorepo (`apps/*`, `packages/*`), consumed over HTTP by `apps/extension`'s background worker

**Performance Goals**: Matches `specs/001-in-page-reading-practice/spec.md` SC-001 as observed from the extension side — cold-fetch translation completes within a normal page-interaction wait (a few seconds, SC-001 of this spec); cache-hit responses near-instant (no external call)

**Constraints**: No learner/device/site/URL identity ever accepted, cached, or logged (FR-007, Constitution III); external service called at most once per never-before-cached combination even under concurrent requests (FR-008); new (non-cached) calls hard-refused once either provider's configured free allowance is reached, with cached results unaffected (FR-010); every returned `text` is a safe-subset HTML fragment (`<strong>`/`<em>` only, no attributes) — anything else is discarded, not forwarded or cached (FR-012)

**Scale/Scope**: One public endpoint (`POST /api/translate`); expected traffic is a small, steady population of learners reading ordinary articles (SC-003) — sized to stay within both providers' standing free tiers via aggressive caching, not to handle high QPS

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This feature adds a new, separate backend service — most of the constitution's principles are written for the browser extension itself (manifest permissions, DOM/Shadow DOM, `chrome.storage`) and don't directly gate a Node.js service with no browser surface. Where a principle's *rationale* still applies to a server-side component, it's evaluated below; where it's extension-specific and structurally inapplicable, it's marked N/A rather than PASS.

| Principle | Gate | Status |
|---|---|---|
| I. Least Privilege | New manifest permissions? | N/A — this feature introduces no browser code and changes no manifest; the extension's existing `activeTab`/`optional_host_permissions` are untouched, it now simply has a real server to call at the URL it already expected |
| II. Host Page Integrity | DOM mutation/Shadow DOM isolation | N/A — no DOM, no content script |
| III. Privacy | Only the fragment sent, never URL/identifier/history | PASS — `TranslateRequestSchema` carries only `text`/`level`/`topic` (unchanged); `Cache Entry`/`Usage Counter` schemas (data-model.md) have no identity columns to populate even accidentally; no request logging beyond what FR-007 permits |
| IV. Offline-First | Local state usable with no network | N/A for this service itself (it *is* the network dependency), but doesn't regress the extension's own offline guarantee — the extension's local IndexedDB cache (spec 001) still serves previously-fetched translations with this backend fully unreachable |
| V. Typed Contracts | Zod validation at every boundary, no `any` | PASS — reuses `TranslateRequestSchema`/`TranslateResponseSchema` from `packages/shared`; the new HTML safe-subset refinement (data-model.md) is added to the *same* shared schema so producer (this backend) and consumer (extension) validate identically, rather than duplicating the rule |
| VI. Test What Breaks | Mandatory tests for the areas where a bug corrupts data or leaks unsafe content | PASS (extended by necessity) — the constitution's four named areas are extension-specific; this service's own highest-risk surfaces are cache-key normalization (a bug silently serves wrong-level content to a learner), the HTML safe-subset validator (a bug here is exactly what Principle II's "no host-page-breaking markup" downstream depends on), the usage-ledger threshold (a bug either burns the free allowance or wrongly refuses valid requests), and the coalescing map (a bug here duplicates paid calls) — all four are unit-tested per quickstart.md |
| VII. Simplicity (YAGNI) | No speculative abstraction | PASS — single Node process, SQLite (not a managed DB), no provider SDKs, no edge/Durable-Objects architecture, no auth layer beyond provider API keys (research.md §4, §9) |
| VIII. Performance & Unobtrusive UX | No long tasks/jank | N/A directly (server-side, no main-thread/content-script concern), but SC-001's latency target is carried forward from spec 001 so the extension-side experience isn't degraded by a slow backend |

No violations requiring justification — Complexity Tracking table is empty.

### Post-Design Re-Check

Re-verified after Phase 1 (`data-model.md`, `contracts/api-contract.md`, `quickstart.md`):

- **III. Privacy** — `data-model.md`'s `Cache Entry` and `Usage Counter` tables have no learner/device/site/URL column, so there is no field for such data to leak into even by accident; `contracts/api-contract.md`'s error responses (`invalid-request`/`allowance-exhausted`/`upstream-failure`) carry no identifying data either. PASS.
- **V. Typed Contracts** — `data-model.md` names the exact schema change (`TranslateResponseSchema` HTML safe-subset refinement in `packages/shared/src/schemas/cms.ts`) rather than a backend-local check, so `apps/cms` and `apps/extension` share one validated definition of "safe." `contracts/api-contract.md`'s external-provider section defines what counts as a malformed Google Translate/Gemini response, closing the gap FR-012 requires. PASS.
- **VI. Test What Breaks** — `quickstart.md`'s Automated Tests section enumerates unit coverage for all four risk areas identified in the pre-design check (cache-key normalization, HTML safe-subset validator, usage-ledger threshold, coalescing map) plus integration coverage mapped to all four user stories. PASS.
- **VII. Simplicity** — design artifacts introduced no additional service, dependency, or abstraction beyond what was scoped pre-design (still: one Fastify app, one SQLite file, two provider REST calls, no SDKs). PASS.

No new violations surfaced by design; Complexity Tracking remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-translation-backend/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/cms/
├── package.json
├── src/
│   ├── server.ts                  # Fastify app: registers routes, starts listener on CMS_PORT
│   ├── routes/
│   │   └── translate.ts           # POST /api/translate handler: validate → cache lookup → coalesce → pipeline → cache write
│   ├── pipeline/
│   │   ├── translate-raw.ts       # Google Translate call: source text → German
│   │   ├── adapt-level.ts         # Gemini call: raw German + level/topic → adapted text + vocabTerms
│   │   └── gloss-vocab.ts         # Google Translate call: vocabTerms (batched) → Russian glosses
│   ├── cache/
│   │   ├── key.ts                 # normalize() + sha256 cache-key construction (research.md §6)
│   │   ├── store.ts                # SQLite cache_entries read/write
│   │   └── coalesce.ts             # in-process Map<cacheKey, Promise<Result>> (research.md §5)
│   ├── usage/
│   │   └── ledger.ts               # SQLite usage_counters read/reserve/increment (research.md §8)
│   ├── validation/
│   │   └── html-safe-subset.ts     # allowlist validator, exported for reuse from packages/shared (data-model.md)
│   └── config.ts                   # env var loading (Config table, data-model.md)
└── tests/
    ├── unit/                        # cache/key.ts, validation/html-safe-subset.ts, usage/ledger.ts, cache/coalesce.ts
    └── integration/                  # routes/translate.ts via Fastify .inject(), providers mocked (mirrors apps/extension/tests/integration/mock-cms-server.ts pattern)

packages/shared/
├── src/schemas/cms.ts              # MODIFIED: TranslateResponseSchema gains the HTML safe-subset refinement (data-model.md), shared by apps/cms and apps/extension
└── tests/schemas.test.ts            # MODIFIED: round-trip tests for the new refinement
```

**Structure Decision**: New workspace app `apps/cms`, matching the existing `apps/extension` + `packages/shared` monorepo shape (`pnpm-workspace.yaml`'s `apps/*` glob already covers it — no workspace config change needed). The HTML safe-subset validation rule is added to `packages/shared` rather than duplicated locally, since it's a rule both this backend (producer) and `apps/extension` (consumer) must agree on byte-for-byte (Constitution V). No `backend/`+`frontend/` split or separate repo — this stays one monorepo with the extension, consistent with how `packages/shared` is already described as the cross-context contract source of truth for CMS response shapes.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — no gate violations (Constitution Check above has no FAIL rows; several rows are N/A because this feature is a new backend service outside the extension's browser surface, not because a violation was waived).
