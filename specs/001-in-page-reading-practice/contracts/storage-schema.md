# Contract: Local Persistence Schema

Owner module: `packages/shared/src/schemas/storage.ts` (Zod, one schema per entity in `data-model.md`). Read/write access is mediated exclusively by the background worker's `lib/storage/*` modules (`apps/extension/lib/storage/`); no other context touches `chrome.storage` or IndexedDB directly (see `messaging-contract.md`).

## chrome.storage.local keys

| Key | Schema | Notes |
|---|---|---|
| `settings` | `LearnerSettings` | singleton |
| `siteRules` | `Record<hostname, SiteRule>` | absent hostname = `undecided`, no write needed until acted on |
| `vocabulary` | `Record<vocabId, VocabularyItem>` | |
| `reviewQueue` | `Record<vocabId, ReviewQueueEntry>` | 1:1 with `vocabulary` entries |
| `progress` | `ProgressProfile` | singleton |

Quota note: this tier is expected to stay well under `chrome.storage.local`'s 10MB default quota — all fields are small scalars/short strings; no blob or large-text data lives here (research.md §3).

## IndexedDB (`sprachweise-content-cache` database)

| Object store | Key | Value schema | Notes |
|---|---|---|---|
| `variants` | `${contentHash}:${level}:${topic}` | `GermanVariant` | |
| `exercises` | `${contentHash}:${level}:${topic}` | `Exercise[]` | regenerated (overwritten) if settings change and the paragraph is retranslated |
| `ttsAudio` | `${contentHash}:${level}:${topic}:${rate}` | `Blob` + `{ mimeType: string }` | populated lazily, only when a dictation exercise is actually played, not prefetched speculatively (Constitution VII, Technology Constraints — "never bulk-fetched speculatively") |

**Invalidation**: entries are never time-expired (offline-first — a cached variant is always considered usable). An entry is only overwritten, never merged, when a retranslation under the same key is explicitly requested (e.g. content changed enough to hash differently, which naturally produces a new key rather than a collision).

## Schema-contract test obligation (Constitution VI)

Every schema in this file and in `messaging-contract.md` / `cms-api-contract.md` MUST have a round-trip test in `apps/extension/tests/contract/`: construct a valid fixture, `schema.parse()` it, assert equality; construct an invalid fixture (missing field, wrong enum value, out-of-bounds `markedVocab` offset), assert `schema.safeParse()` fails.
