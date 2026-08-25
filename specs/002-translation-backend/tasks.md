# Tasks: Translation Backend

**Input**: Design documents from `/specs/002-translation-backend/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contract.md, quickstart.md

**Tests**: Included. Constitution Principle VI ("Test What Breaks") names this feature's four highest-risk surfaces explicitly — cache-key normalization, the HTML safe-subset validator, the usage-ledger threshold, and the coalescing map — and plan.md/quickstart.md commit to unit-testing all four plus integration-testing every user story's acceptance scenarios via Fastify `.inject()`.

**Organization**: Tasks are grouped by user story (spec.md priorities P1–P4) so each story is independently implementable and testable on top of the shared foundation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can be worked on in parallel (different files; any hard ordering is called out as "(depends on T0XX)")
- **[Story]**: Maps a task to US1–US4
- File paths are exact, per plan.md's Project Structure

## Path Conventions

New workspace app `apps/cms/` (Fastify + better-sqlite3), added to the existing pnpm monorepo alongside `apps/extension/`. One shared-schema change lands in `packages/shared/`. See plan.md's Project Structure section for the full tree.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the new `apps/cms` workspace package so later phases have somewhere to put code.

- [X] T001 Create `apps/cms` package scaffold: `apps/cms/package.json` (name `@sprachweise/cms`, deps `fastify`, `better-sqlite3`, `zod`, `@sprachweise/shared` (workspace:*); devDeps `typescript`, `vitest`, `tsx`, `@types/better-sqlite3`; scripts `dev` (`tsx watch src/server.ts`), `build` (`tsc`), `start` (`node dist/server.js`), `test` (`pnpm run test:unit && pnpm run test:integration`), `test:unit` (`vitest run tests/unit`), `test:integration` (`vitest run tests/integration`), `typecheck` (`tsc --noEmit`)) and `apps/cms/tsconfig.json` (extends root `tsconfig.json`, matching `packages/shared/tsconfig.json`'s pattern)
- [X] T002 [P] Add `apps/cms/vitest.config.ts` (`environment: "node"`, `include: ["tests/**/*.test.ts"]`, matching `packages/shared/vitest.config.ts`)
- [X] T003 [P] Add `apps/cms/.env.example` documenting every Config var from data-model.md (`GOOGLE_TRANSLATE_API_KEY`, `GEMINI_API_KEY`, `CMS_DB_PATH`, `CMS_PORT`, `TRANSLATE_MAX_CHARS`, `TRANSLATE_MONTHLY_CHAR_ALLOWANCE`, `GEMINI_DAILY_REQUEST_ALLOWANCE`) with the example defaults from quickstart.md
- [X] T004 [P] Add `apps/cms/data/` (default `CMS_DB_PATH` parent dir) to `.gitignore`

**Checkpoint**: `pnpm install` resolves the new workspace package; `apps/cms` has no source yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infrastructure every user story's route logic depends on — config, persistence, the shared HTML-safety contract, and the server shell.

**⚠️ CRITICAL**: No user story task can start until this phase is complete.

- [X] T005 [P] Implement env config loader (parses and validates the Config table from data-model.md, applying the documented defaults) in `apps/cms/src/config.ts`
- [X] T006 Implement SQLite connection + schema bootstrap (opens `config.CMS_DB_PATH`, creates its parent directory if absent, creates `cache_entries` and `usage_counters` tables per data-model.md if they don't exist) in `apps/cms/src/db.ts` (depends on T005)
- [X] T007 [P] Add `isSafeHtmlSubset(text: string): boolean` and apply it as a `.refine()` on `TranslateResponseSchema` in `packages/shared/src/schemas/cms.ts` (research.md §7: allowlist-only `<strong>`/`<em>`, no attributes, no other elements, no unclosed tags)
- [X] T008 [P] Add round-trip tests for the safe-subset refinement (accepts bare `<strong>`/`<em>`, rejects other tags, any attribute, and unclosed tags) in `packages/shared/tests/schemas.test.ts` (depends on T007)
- [X] T009 [P] Re-export `isSafeHtmlSubset` from `@sprachweise/shared` for local pipeline use in `apps/cms/src/validation/html-safe-subset.ts` (depends on T007)
- [X] T010 [P] Add a unit test for the local re-export in `apps/cms/tests/unit/html-safe-subset.test.ts` (depends on T009)
- [X] T011 Implement Fastify app bootstrap (creates the Fastify instance, registers a route plugin placeholder, listens on `config.CMS_PORT`) in `apps/cms/src/server.ts` (depends on T005)
- [X] T012 [P] Add a provider-mocking test helper (mocks `fetch` calls to the Google Cloud Translation API and Gemini API REST endpoints with configurable canned responses and call counters, mirroring the pattern of `apps/extension/tests/integration/mock-cms-server.ts`) in `apps/cms/tests/integration/mock-providers.ts`

**Checkpoint**: Config, persistence, the shared safety contract, and an empty server all exist — user story implementation can begin.

---

## Phase 3: User Story 1 - Get a leveled, glossed translation of a paragraph (Priority: P1) 🎯 MVP

**Goal**: `POST /api/translate` runs the full two-step pipeline (Google Translate → Gemini adapt+mark → Google Translate gloss) and returns a validated, level-adapted, glossed response — every call hits the providers fresh (no caching or usage-limiting yet; those are added by US2/US3).

**Independent Test**: Send paragraph text + level + topic and verify the response contains a German rewrite adapted to that level plus marked vocabulary spans each paired with a Russian meaning (spec.md Acceptance Scenarios 1–4).

### Tests for User Story 1 ⚠️

- [X] T013 [US1] Write integration tests for Acceptance Scenarios 1–4 (valid request → adapted `text` + `markedVocab`; missing/empty `text`/`level`/`topic` → `400` with no provider call; same text at two levels → different `text`; short/generic paragraph → valid rewrite with empty `markedVocab`, never an error) in `apps/cms/tests/integration/translate-basic.test.ts`, using `apps/cms/tests/integration/mock-providers.ts` (T012) — confirm they fail against the not-yet-implemented route

### Implementation for User Story 1

- [X] T014 [P] [US1] Implement the Google Translate raw-translation call (source text → German) in `apps/cms/src/pipeline/translate-raw.ts` (contracts/api-contract.md's Google Cloud Translation API shape; non-2xx/missing `data.translations` → treated as upstream failure)
- [X] T015 [P] [US1] Implement the Gemini level-adaptation + vocabulary-term-selection call (raw German + `level` + `topic` → `{ text, vocabTerms[] }` via structured output; a `vocabTerms` entry not found as a substring of `text` is dropped, not an error) in `apps/cms/src/pipeline/adapt-level.ts`
- [X] T016 [P] [US1] Implement the batched Google Translate vocabulary-gloss call (`vocabTerms[]` → Russian glosses, array order preserved) in `apps/cms/src/pipeline/gloss-vocab.ts`
- [X] T017 [US1] Implement the `POST /api/translate` handler — validate the request (FR-003 missing fields, FR-003a `TRANSLATE_MAX_CHARS` cap, FR-003b closed `level` enum / opaque `topic`) before any provider call, run the pipeline (translate-raw → adapt-level → gloss-vocab), assemble `{ text, markedVocab }`, validate it against `TranslateResponseSchema` (T007) before responding, and return `200` on success or `400 { error: 'invalid-request', detail }` on request-validation failure — in `apps/cms/src/routes/translate.ts` (depends on T014, T015, T016)
- [X] T018 [US1] Register the `/api/translate` route on the Fastify app in `apps/cms/src/server.ts` (depends on T017, T011)

**Checkpoint**: User Story 1 is independently functional — `pnpm --filter apps/cms test:integration` passes T013's scenarios; `quickstart.md`'s User Story 1 curl examples work end-to-end.

---

## Phase 4: User Story 2 - Reuse prior translations instead of paying for them again (Priority: P2)

**Goal**: Identical (normalized text, level, topic) requests are served from a shared, indefinitely-persisted cache instead of re-invoking the providers, and concurrent first-time requests for the same combination are coalesced into a single pipeline run.

**Independent Test**: Submit the same paragraph/level/topic twice and verify the second response is byte-identical and made no new provider call; fire two identical never-before-seen requests concurrently and verify only one pipeline run occurred (spec.md Acceptance Scenarios 1–4).

### Tests for User Story 2 ⚠️

- [X] T019 [US2] Write integration tests for Acceptance Scenarios 1–4 (repeat request served from cache with no new provider call and an identical body; a second simulated learner's matching request also hits cache; a different level or topic is translated as a separate entry; two concurrent never-before-seen identical requests result in at most one provider call each) in `apps/cms/tests/integration/translate-cache.test.ts`, using T012's mock helper's call counters

### Implementation for User Story 2

- [X] T020 [P] [US2] Implement `normalize()` (trim + collapse internal whitespace) and `sha256(normalize(text) + "\0" + level + "\0" + topic)` cache-key construction in `apps/cms/src/cache/key.ts` (research.md §6 — NUL-byte separator to prevent field-boundary collisions)
- [X] T021 [P] [US2] Add unit tests for cache-key normalization (whitespace-only differences collapse to the same key; differing level/topic never collide) in `apps/cms/tests/unit/cache-key.test.ts` (depends on T020)
- [X] T022 [P] [US2] Implement `cache_entries` read/write (write-once on first validated pipeline success, never updated/deleted) against the SQLite handle in `apps/cms/src/cache/store.ts` (depends on T006, T020)
- [X] T023 [P] [US2] Implement the in-process `Map<cacheKey, Promise<TranslationResult>>` request-coalescing map (first request creates and stores the pipeline promise; concurrent requests for the same key await it; entry deleted once the promise settles, success or failure) in `apps/cms/src/cache/coalesce.ts` (research.md §5)
- [X] T024 [P] [US2] Add unit tests for the coalescing map (concurrent calls for the same key share one underlying promise/invocation; the map entry is cleared after settling so a later call starts fresh) in `apps/cms/tests/unit/coalesce.test.ts` (depends on T023)
- [X] T025 [US2] Wire a cache lookup (short-circuit to a `200` on hit, no provider call) and cache write (on first validated pipeline success) into the `/api/translate` handler, running the pipeline itself through T023's coalescing map, in `apps/cms/src/routes/translate.ts` (depends on T017, T022, T023)

**Checkpoint**: User Stories 1 and 2 both work independently — repeat/concurrent requests no longer duplicate provider calls.

---

## Phase 5: User Story 3 - Stay within a controlled, predictable cost (Priority: P3)

**Goal**: Every non-cached request checks both providers' usage counters before calling either, and is refused with a distinguishable result once either provider's configured allowance is reached — cached requests are never affected.

**Independent Test**: Drive distinct non-cached requests and observe cumulative usage; exhaust the configured allowance and verify further non-cached requests are refused while cached requests still succeed (spec.md Acceptance Scenarios 1–3).

### Tests for User Story 3 ⚠️

- [X] T026 [US3] Write integration tests for Acceptance Scenarios 1–3 (usage increases after each distinct non-cached request; with `GEMINI_DAILY_REQUEST_ALLOWANCE` set low, a request past the cap returns `429 { error: 'allowance-exhausted' }` with no provider call made; a request for an already-cached combination still returns `200` once the allowance is exhausted) in `apps/cms/tests/integration/translate-allowance.test.ts`

### Implementation for User Story 3

- [X] T027 [P] [US3] Implement `usage_counters` read/reserve/increment — per `(provider, period_key)`, both providers checked-then-conditionally-incremented inside a single SQLite transaction before either external call — in `apps/cms/src/usage/ledger.ts` (data-model.md, research.md §8; depends on T006)
- [X] T028 [P] [US3] Add unit tests for usage-ledger threshold math (refuses once either provider's `allowance` would be exceeded; a new `period_key` starts a fresh `usage = 0` row with no explicit reset; a refusal never partially increments one provider's counter) in `apps/cms/tests/unit/usage-ledger.test.ts` (depends on T027)
- [X] T029 [US3] Wire the usage-ledger check (both providers, before either provider call) into the `/api/translate` handler for non-cache-hit requests, returning `429 { error: 'allowance-exhausted' }` when it would exceed either allowance, in `apps/cms/src/routes/translate.ts` (depends on T025, T027)

**Checkpoint**: User Stories 1, 2, and 3 all work independently — the backend now self-limits before overrunning either provider's free tier.

---

## Phase 6: User Story 4 - Keep serving what's already known when the translation service misbehaves (Priority: P4)

**Goal**: A cached-combination request always succeeds even if the providers are down; a new-combination request fails clearly (`502`) instead of hanging, and a malformed/unsafe provider response is discarded rather than cached or forwarded.

**Independent Test**: Simulate the providers being unreachable or returning invalid data; verify cached requests still succeed and new-combination requests return a clear, well-formed failure (spec.md Acceptance Scenarios 1–3).

### Tests for User Story 4 ⚠️

- [X] T030 [US4] Write integration tests for Acceptance Scenarios 1–3 (providers unreachable + already-cached combination → `200` from cache; providers unreachable + new combination → `502 { error: 'upstream-failure' }`, not a hang or partial body; providers return a malformed/unsafe response → discarded, `502`, nothing cached) in `apps/cms/tests/integration/translate-resilience.test.ts`, using T012's mock helper's failure-injection support

### Implementation for User Story 4

- [X] T031 [US4] Wrap the pipeline calls (T014–T016) and the `TranslateResponseSchema` validation step in the `/api/translate` handler with failure handling — any provider network error, timeout, non-2xx, or response that fails validation (including the HTML safe-subset check, T007) is caught and converted to `502 { error: 'upstream-failure' }` with nothing written to the cache (FR-011, FR-012) — in `apps/cms/src/routes/translate.ts` (depends on T029)

**Checkpoint**: All four user stories are independently functional — the feature is complete per spec.md.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across the whole feature, not tied to a single story.

- [X] T032 [P] Run quickstart.md's manual validation end-to-end (User Stories 1–4) against a locally running `apps/cms` instance
- [X] T033 [P] Run `pnpm --filter apps/cms typecheck` and `pnpm --filter @sprachweise/shared typecheck` and fix any type errors
- [X] T034 [P] Run `pnpm lint` / `pnpm format:check` against `apps/cms` and `packages/shared` and fix any violations

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on Foundational; its route-wiring task (T025) builds on US1's handler (T017)
- **User Story 3 (Phase 5)**: Depends on Foundational; its route-wiring task (T029) builds on US2's handler state (T025)
- **User Story 4 (Phase 6)**: Depends on Foundational; its failure-handling task (T031) wraps US3's handler state (T029)
- **Polish (Phase 7)**: Depends on all four user stories being complete

Note: US2/US3/US4 are *functionally* additive layers on the same `routes/translate.ts` handler (matching the spec's own stated priority rationale — caching only matters once requests exist, cost control only matters once traffic flows, resilience is a refinement on top of a working pipeline). Each story's own integration test suite (T013/T019/T026/T030) is still independently runnable and asserts only that story's acceptance scenarios, so stories remain independently *testable* even though the implementation tasks share one file.

### Within Each User Story

- Integration test task written first (and confirmed failing) before implementation tasks
- Pipeline/cache/usage modules before the route-wiring task that consumes them
- Route-wiring task before that story's checkpoint is considered met

### Parallel Opportunities

- Setup: T002, T003, T004 in parallel (after T001)
- Foundational: T005 → T006/T011 chain runs alongside the independent T007 → {T008, T009 → T010} chain, and T012 in parallel with all of it
- US1: T014, T015, T016 in parallel (different pipeline files), after T013 is written
- US2: T020 → T021 and T023 → T024 chains run in parallel with each other and with T022, after T019 is written
- US3: T027 → T028 in parallel with writing T026
- Polish: T032, T033, T034 all in parallel

---

## Parallel Example: User Story 1

```bash
# After T013 (integration test) is written and failing:
Task: "Implement Google Translate raw-translation call in apps/cms/src/pipeline/translate-raw.ts"
Task: "Implement Gemini level-adaptation + vocab-selection call in apps/cms/src/pipeline/adapt-level.ts"
Task: "Implement batched Google Translate vocabulary-gloss call in apps/cms/src/pipeline/gloss-vocab.ts"
```

## Parallel Example: User Story 2

```bash
# After T019 (integration test) is written and failing:
Task: "Implement normalize() + cache-key construction in apps/cms/src/cache/key.ts"
Task: "Implement in-process coalescing map in apps/cms/src/cache/coalesce.ts"
# Then, once cache/key.ts lands:
Task: "Implement cache_entries read/write in apps/cms/src/cache/store.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run `apps/cms/tests/integration/translate-basic.test.ts` and quickstart.md's User Story 1 curl examples
5. At this point the backend is a real (if uncached, unmetered) implementation of the endpoint `apps/extension`'s background worker already calls

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate → MVP: the endpoint works, but every request pays for a fresh provider call
3. Add User Story 2 → validate → affordable: repeat/concurrent requests stop duplicating provider calls
4. Add User Story 3 → validate → safe: the backend self-limits before overrunning a provider's free tier
5. Add User Story 4 → validate → resilient: provider outages degrade gracefully instead of corrupting responses
6. Polish → typecheck, lint, full quickstart.md pass

---

## Notes

- [P] tasks touch different files and have no completed-task dependency within their own step; a few are annotated "(depends on T0XX)" where a *content* dependency exists (e.g., a test needs its subject to exist) even though the files differ
- Every implementation task lists its exact file path per plan.md's Project Structure — no task requires guessing a location
- Commit after each task or logical group; stop at any checkpoint to validate a story independently
- FR-007/Constitution III (no learner/device/site/URL identity) is structurally satisfied by data-model.md's schemas having no such column — no task exists to "strip" identity because there is never a field to populate
