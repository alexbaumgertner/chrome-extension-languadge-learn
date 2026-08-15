# Quickstart: Translation Backend

Validates the feature end-to-end (User Stories 1–4) against a running `apps/cms` instance.

## Prerequisites

- Node.js 20+, pnpm (already required by the workspace root `package.json`).
- A Google Cloud Translation API key (Basic v2, "Cloud Translation API" enabled on the project) and a Gemini API key (Google AI Studio), for real-provider validation. For local/CI validation without real keys, use the mock providers described below.
- Workspace installed: `pnpm install` from repo root.

## Environment

Create `apps/cms/.env` (or export in shell):

```
GOOGLE_TRANSLATE_API_KEY=...
GEMINI_API_KEY=...
CMS_DB_PATH=./data/cms.sqlite
CMS_PORT=8787
TRANSLATE_MAX_CHARS=5000
TRANSLATE_MONTHLY_CHAR_ALLOWANCE=500000
GEMINI_DAILY_REQUEST_ALLOWANCE=1500
```

`CMS_PORT=8787` matches `apps/extension/lib/config.ts`'s dev-default `CMS_BASE_URL` (`http://localhost:8787`), so a locally running extension dev build points here with no extra config.

## Run

```
pnpm --filter apps/cms dev
```

Starts the Fastify server on `CMS_PORT`, creating `CMS_DB_PATH` (and its parent directory) on first run if absent.

## Manual validation — User Story 1 (leveled, glossed translation)

```
curl -s -X POST http://localhost:8787/api/translate \
  -H 'Content-Type: application/json' \
  -d '{"text":"Der Bundestag hat heute ein neues Gesetz beschlossen.","level":"A1-A2","topic":"politics"}' | jq
```

Expect `200` with `text` containing only `<strong>`/`<em>` markup (or none) and `markedVocab` entries whose `start`/`end` slice `text` to exactly the `german` value.

Repeat with `"level":"C1+"` for the same `text`/`topic` — expect a different `text` (Acceptance Scenario 3: different levels must not return identical output).

Empty-text check: `-d '{"text":"","level":"A1-A2","topic":"politics"}'` → expect `400 { error: 'invalid-request', ... }`, and confirm (via provider request logs, or the mock provider's call counter in tests) that no external call was made.

## Manual validation — User Story 2 (cache reuse)

Send the same request from User Story 1 twice in a row. First response's latency reflects a full pipeline run (§ Success Criteria SC-001: a few seconds); second response should be near-instant and byte-identical to the first. Cross-check against the provider's own usage dashboard (or the mock provider's call counter) that the external services were called once, not twice.

Concurrency check (Acceptance Scenario 4): fire two identical never-before-seen requests at the same time (e.g. `curl ... & curl ... & wait`) and confirm only one pipeline run occurred (mock provider call counter == 1).

## Manual validation — User Story 3 (allowance enforcement)

With `GEMINI_DAILY_REQUEST_ALLOWANCE` set low (e.g. `1` for a test run), send two distinct (non-cached) requests. First succeeds; second returns `429 { error: 'allowance-exhausted' }` with no external call made. A third request for the *already-cached* first combination still returns `200` (allowance exhaustion never blocks cache hits).

## Manual validation — User Story 4 (resilience)

Point `GOOGLE_TRANSLATE_API_KEY`/`GEMINI_API_KEY` at invalid values (or block network egress to the provider hosts) and re-run:
- A request for an already-cached combination still returns `200` from cache.
- A request for a new combination returns `502 { error: 'upstream-failure' }`, not a hang or a malformed `200`.

## Automated tests

```
pnpm --filter apps/cms test:unit          # cache-key normalization, HTML safe-subset validator, usage-ledger threshold math, coalescing map
pnpm --filter apps/cms test:integration   # Fastify .inject() against the routes, with the two providers mocked — covers all four user stories' acceptance scenarios above
pnpm --filter @sprachweise/shared test    # schema round-trip tests, including the new HTML safe-subset refinement
```

Mocked providers used by `test:integration` return deterministic canned responses (mirroring the pattern already established by `apps/extension/tests/integration/mock-cms-server.ts` for the extension side) so tests don't depend on real API keys or network access, and can assert exact call counts for the coalescing/caching/allowance scenarios above.
