# Contract: Cross-Context Messages

Owner module: `packages/shared/src/schemas/messages.ts` (Zod, discriminated union on `type`). Every message crossing a `chrome.runtime` boundary (content ↔ background, popup ↔ background, options ↔ background) is parsed against this schema on receipt; a failed parse is a typed error surfaced to the sender, never a silent drop (Constitution V).

All requests below are content/popup/options → background unless noted. Background is the only context with network access (research.md §10) and the only writer of `chrome.storage`/IndexedDB — other contexts read via these messages, never touch storage directly, so state stays consistent under concurrent surfaces (panel + popup + options open at once).

## TRANSLATE_PARAGRAPH

Request (content → background):
```
{ type: 'TRANSLATE_PARAGRAPH', contentHash: string, paragraphText: string, level: Level, topic: string }
```
Response:
```
{ ok: true, variant: GermanVariant, exercises: Exercise[] }
| { ok: false, reason: 'fetch-failed' | 'offline-no-cache' }
```
Notes: `paragraphText` is the only page content ever sent (FR-015). On success, background has already written the variant+exercises into the IndexedDB content cache before responding, so a later `TRANSLATE_PARAGRAPH` for the same `contentHash`+`level`+`topic` is served from cache without a network round-trip.

## SUBMIT_EXERCISE_ATTEMPT

Request (content → background):
```
{ type: 'SUBMIT_EXERCISE_ATTEMPT', exerciseId: string, submittedAnswer: AnswerPayload, sourceParagraphHash: string, affectedVocabIds: string[], topic: string }
```
Response:
```
{ ok: true, correct: boolean, updatedProgress: ProgressProfile }
```
Notes: background performs lenient matching (research.md §5), updates Vocabulary Item / Review Queue Entry / Progress Profile atomically, and returns the fresh Progress Profile so the panel can render updated counters without a second round-trip.

## GET_SITE_STATUS

Request (content on load, or popup → background):
```
{ type: 'GET_SITE_STATUS', hostname: string }
```
Response:
```
{ status: 'enabled' | 'disabled' | 'undecided' }
```
Notes: background re-verifies via `chrome.permissions.contains` before answering `enabled` (Edge Case: out-of-band Chrome permission revocation).

## SET_SITE_STATUS

Request (popup → background):
```
{ type: 'SET_SITE_STATUS', hostname: string, status: 'enabled' | 'disabled' }
```
Response:
```
{ ok: true } | { ok: false, reason: 'permission-denied' }
```
Notes: `status: 'enabled'` triggers `chrome.permissions.request` for that origin as part of handling this message (the explicit user gesture Constitution I requires); if the learner declines the Chrome prompt, response is `permission-denied` and the stored Site Rule stays `disabled`/`undecided`.

## GET_LEARNER_SETTINGS / SET_LEARNER_SETTINGS

Request/response mirror the `Learner Settings` entity in `data-model.md` directly; `SET_LEARNER_SETTINGS` never retroactively touches already-cached German Variants (Assumptions).

## GET_PROGRESS_SNAPSHOT

Request (options progress view / popup → background):
```
{ type: 'GET_PROGRESS_SNAPSHOT' }
```
Response:
```
{ profile: ProgressProfile, vocab: VocabularyItem[], reviewQueue: ReviewQueueEntry[] }
```

## STORAGE_CHANGED (background → all contexts, broadcast)

```
{ type: 'STORAGE_CHANGED', slice: 'progress' | 'settings' | 'siteRules' | 'vocab' }
```
Notes: thin wrapper over `chrome.storage.onChanged` so popup/options/content can invalidate their local read cache without re-deriving from raw storage events; payload carries no data, just an invalidation hint.
