# Phase 1 Data Model: Translation Backend

Entities below map onto the spec's Key Entities section, split into request/response shapes (already partly defined in `packages/shared/src/schemas/cms.ts`) and this backend's own persistence records (SQLite).

## Request/response entities (shared contract, `packages/shared`)

### Translation Request

Reuses `TranslateRequestSchema` (`packages/shared/src/schemas/cms.ts`, already exists — no change needed):

| Field | Type | Validation |
|---|---|---|
| `text` | `string` | non-empty (`min(1)`); backend additionally enforces FR-003a's max-length cap (not in the shared schema, since that cap is a backend operating parameter, not a cross-context contract shape — see `Config` below) |
| `level` | `'A1-A2' \| 'B1-B2' \| 'C1+'` | closed enum (`LevelSchema`, `packages/shared/src/schemas/storage.ts`) |
| `topic` | `string` | non-empty (`min(1)`); accepted as an opaque string, no whitelist (FR-003b) |

Carries no learner/device/site identity (Constitution III, FR-007) — enforced by omission from the schema, not by stripping fields at runtime.

### Translation Result / Marked Vocabulary Span

Reuses `TranslateResponseSchema` (`packages/shared/src/schemas/cms.ts`), **extended** with an HTML safe-subset refinement (new — see below):

| Field | Type | Validation |
|---|---|---|
| `text` | `string` | non-empty; **new**: every tag in the string must be an allowlisted `<strong>` or `<em>` open/close tag with no attributes (research.md §7) — anything else fails validation |
| `markedVocab` | `Array<MarkedVocabSpan>` | existing refinement: `start < end && end <= text.length` for every span |

`MarkedVocabSpan`: `{ start: number (int, ≥0), end: number (int, ≥0), german: string (min 1), russian: string (min 1) }` — unchanged.

**Schema change required**: `packages/shared/src/schemas/cms.ts` gains an `isSafeHtmlSubset(text: string): boolean` helper (or equivalent Zod `.refine`) that both this backend (producer, rejects/discards invalid LLM output per FR-012) and the extension (consumer, per Constitution V "no `any` at a boundary") validate against identically. This is a Phase 1 design output, not yet implemented — tracked as a task for `/speckit-tasks`.

### Error responses

Two distinguishable non-2xx shapes the backend returns (extending, not replacing, the existing `{ ok: false, reason: 'fetch-failed' }` messaging-contract shape the extension already expects for CMS failures):

| Case | HTTP status | Body |
|---|---|---|
| Validation failure (FR-003, FR-003a, FR-003b) | `400` | `{ error: 'invalid-request', detail: string }` |
| Allowance exhausted (FR-010) | `429` | `{ error: 'allowance-exhausted' }` |
| Upstream unreachable/timeout/malformed (FR-011, FR-012) | `502` | `{ error: 'upstream-failure' }` |

The extension's background worker already collapses any non-2xx/validation-failure into its own `fetch-failed` reason (per `specs/001-in-page-reading-practice/contracts/cms-api-contract.md`); the distinct `error` values above exist so this backend's own operator/logs and tests can tell the three cases apart (FR-010's "distinguishable from a normal translation failure"), even though the extension itself currently treats them uniformly.

## Persistence entities (this backend's SQLite store)

### Cache Entry

| Field | Type | Notes |
|---|---|---|
| `cache_key` | `TEXT PRIMARY KEY` | `sha256(normalize(text) + "\0" + level + "\0" + topic)` hex digest (research.md §6) |
| `result_text` | `TEXT NOT NULL` | the validated safe-subset HTML German rewrite |
| `marked_vocab_json` | `TEXT NOT NULL` | JSON-serialized `MarkedVocabSpan[]` |
| `created_at` | `TEXT NOT NULL` | ISO 8601 timestamp, informational only — **no TTL/expiry field**, per FR-004/spec Session 2026-08-14 Q5 ("persist indefinitely") |

No columns for learner id, device id, site, or URL exist on this table at all (FR-007) — there is no field to accidentally populate.

**State/lifecycle**: write-once, read-many. A row is inserted exactly once, on first successful, validated translation for that key (§ Request coalescing ensures only one pipeline run reaches the insert per key). Rows are never updated or deleted by this feature (no eviction, FR-004).

### Usage Counter

| Field | Type | Notes |
|---|---|---|
| `provider` | `TEXT` | `'google-translate' \| 'gemini'` — part of composite primary key |
| `period_key` | `TEXT` | e.g. `'2026-08'` for the Translation API's monthly counter, `'2026-08-15'` for Gemini's daily counter — part of composite primary key |
| `usage` | `INTEGER NOT NULL` | characters (Translation API) or requests (Gemini), depending on `provider` |
| `allowance` | `INTEGER NOT NULL` | the configured cap this row is measured against, copied in at row-creation time from `Config` (so a later config change doesn't retroactively alter what a past period was judged against) |

Primary key: `(provider, period_key)`. A request that would proceed reads-then-conditionally-increments both providers' current-period rows inside a single SQLite transaction (SQLite's default serialized-writer behavior gives this atomicity for free in a single process) before either external call is made, so a refused request never partially increments one provider's counter (research.md §8).

**State/lifecycle**: `usage` increments monotonically within a period; a new `period_key` naturally starts a fresh row at `usage = 0` (no explicit "reset" operation — the period rollover is just a new primary-key value, satisfying the spec's Edge Case "usage tracking roll[s] over cleanly with no manual intervention").

### Config (not persisted — process env, documented here since other entities reference it)

| Var | Purpose | Example default |
|---|---|---|
| `TRANSLATE_MAX_CHARS` | FR-003a request-text length cap | `5000` |
| `TRANSLATE_MONTHLY_CHAR_ALLOWANCE` | Translation API usage-ledger cap | `500000` |
| `GEMINI_DAILY_REQUEST_ALLOWANCE` | Gemini usage-ledger cap | `1500` |
| `GOOGLE_TRANSLATE_API_KEY` | provider auth | — (secret) |
| `GEMINI_API_KEY` | provider auth | — (secret) |
| `CMS_DB_PATH` | SQLite file location | `./data/cms.sqlite` |
| `CMS_PORT` | listen port | `8787` (matches `apps/extension/lib/config.ts`'s dev default `CMS_BASE_URL`) |

## Relationships

```
Translation Request ──(cache_key)──> Cache Entry ──> Translation Result (text + markedVocab)
                                          ▲
                                          │ written once, on first validated
                                          │ pipeline success for that key
Translation Request ──(not cached)──> in-process coalescing map ──> pipeline run:
                                          1. Usage Counter check+reserve (both providers)
                                          2. Google Translate call  → raw German text
                                          3. Gemini call            → adapted text + vocab terms
                                          4. Google Translate call  → Russian glosses for vocab terms
                                          5. validate (span bounds + HTML safe-subset)
                                          6. on success: write Cache Entry, return result
                                          7. on failure: no Cache Entry written, return upstream-failure
```
