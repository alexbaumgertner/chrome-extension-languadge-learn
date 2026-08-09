# Contract: Payload CMS Boundary

Owner module: `packages/shared/src/schemas/cms.ts` (Zod). This is the *only* boundary where the extension talks to the network, and it is called exclusively from the background service worker (research.md §10). The CMS server implementation is out of scope for this feature; this document fixes the shape the background worker requires from it.

## POST /api/translate

Request body (sent by background, on behalf of a `TRANSLATE_PARAGRAPH` message):
```
{ text: string, level: 'A1-A2' | 'B1-B2' | 'C1+', topic: string }
```
Constraints: `text` MUST be exactly the clicked paragraph's extracted text — no URL, no learner/device identifier, no surrounding page context (FR-015, Constitution III).

Response body (validated before use):
```
{
  text: string,               // German HTML fragment, safe subset only
  markedVocab: Array<{ start: number; end: number; german: string; russian: string }>
}
```
A response failing schema validation is treated identically to a network failure (`fetch-failed`), never partially trusted.

## POST /api/exercises

Request body:
```
{ variantText: string, markedVocab: [...], level: Level, topic: string }
```
Response body:
```
{
  exercises: Array<
    | { kind: 'fill-blank'; sourceSentence: string; blankedSentence: string; answer: string }
    | { kind: 'multiple-choice'; sourceSentence: string; blankedSentence: string; options: string[]; correctIndex: number }
    | { kind: 'word-pairing'; pairs: Array<{ german: string; russian: string }> }
    | { kind: 'audio-dictation'; sourceSentence: string; answer: string }
  >
}
```
Constraints: 0–4 entries; the CMS (or background, post-validation) omits kinds it cannot construct from short/low-vocabulary paragraphs rather than returning a malformed entry (Edge Case).

## POST /api/tts

Request body:
```
{ sentence: string, rate: 'normal' | 'slow' }
```
Response: audio blob (`audio/mpeg` or similar) + `Content-Type` header; background stores it in the IndexedDB content cache keyed with the same `contentHash:level:topic` family as its parent German Variant. On request failure or while offline with nothing cached, the content script falls back to `SpeechSynthesisUtterance` client-side (research.md §8) — this fallback never calls this endpoint.

## Error handling

Any non-2xx response, network error, or schema-validation failure on any of the three endpoints surfaces to the requesting context as the message-contract's `{ ok: false, reason: 'fetch-failed' }` (see `messaging-contract.md`) — the background worker does not retry silently or partially apply a malformed response.
