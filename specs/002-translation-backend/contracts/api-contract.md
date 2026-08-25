# Contract: Translation Backend Public API

Owner module: `apps/cms/src/routes/translate.ts`. This supersedes-by-extension the `POST /api/translate` section of `specs/001-in-page-reading-practice/contracts/cms-api-contract.md` — same request/response shape, now with concrete error semantics and the safe-subset HTML requirement (Session 2026-08-15 clarification) made explicit. The other two endpoints that document (`/api/exercises`, `/api/tts`) are out of scope for this feature (see spec.md Assumptions) and unaffected.

## POST /api/translate

### Request

```
Content-Type: application/json

{ text: string, level: 'A1-A2' | 'B1-B2' | 'C1+', topic: string }
```

Validated against `TranslateRequestSchema` (`packages/shared/src/schemas/cms.ts`) plus the backend-local `TRANSLATE_MAX_CHARS` length cap (FR-003a) applied before schema validation short-circuits on an empty-but-oversized string. `topic` is accepted as any non-empty string (FR-003b) — no server-side whitelist.

### Success response — `200`

```
Content-Type: application/json

{
  text: string,               // German rewrite, safe-subset HTML: only <strong>/<em>, no attributes, no other elements
  markedVocab: Array<{ start: number; end: number; german: string; russian: string }>
}
```

Validated against `TranslateResponseSchema` (extended per `data-model.md`'s HTML safe-subset refinement) before being sent — the backend never forwards an LLM/translation-provider response it hasn't itself validated.

May be served either from the shared cache (no external calls made) or from a freshly completed pipeline run — indistinguishable to the caller, both shapes identical (FR-005, User Story 2, Acceptance Scenario 1: "matches the original result exactly").

### Error responses

| Status | Body | When |
|---|---|---|
| `400` | `{ error: 'invalid-request', detail: string }` | missing/empty `text`, `level`, or `topic` (FR-003); `text` exceeds `TRANSLATE_MAX_CHARS` (FR-003a); `level` not one of the closed enum (FR-003b) |
| `429` | `{ error: 'allowance-exhausted' }` | request is not a cache hit, and proceeding would exceed either provider's configured Usage Counter allowance (FR-010) — no external call is made |
| `502` | `{ error: 'upstream-failure' }` | Google Translate or Gemini unreachable, times out, or returns a response that fails internal validation (FR-011, FR-012) — nothing is cached in this case |

No response shape ever includes a partial/malformed success body (FR-011) — every non-`200` is one of the three shapes above, and every `200` passes full schema validation first.

### Idempotency & concurrency

Two concurrent identical requests (same `text` after normalization, same `level`, same `topic`) for a combination not yet cached MUST result in at most one Google Translate raw-translation call and at most one Gemini call, per FR-008 — see `research.md` §5 (in-process coalescing map). Both callers receive the same result once the shared pipeline run settles; if it fails, both callers receive the same `502`.

## External provider contracts (this backend's outbound calls)

These are the shapes this backend depends on from its two upstream providers — documented here because a provider response failing to match them is exactly the "malformed response" case FR-012 requires discarding.

### Google Cloud Translation API (Basic v2, REST)

`POST https://translation.googleapis.com/language/translate/v2?key={GOOGLE_TRANSLATE_API_KEY}`

Request: `{ q: string | string[], target: 'de' | 'ru', format: 'text' }` (`q` is an array for the batched vocabulary-term glossing call, a single string for the whole-paragraph raw-translation call; `target` is `'de'` for the first call, `'ru'` for the glossing call — source language is auto-detected by the API in both cases).

Response (success): `{ data: { translations: Array<{ translatedText: string, detectedSourceLanguage?: string }> } }` — array length and order matches the request's `q` array (or length 1 for a single string).

Any non-2xx, network error, or response missing `data.translations` with the expected length is treated as an upstream failure for this call (feeds into the overall `502` above, per Constitution V — no partial trust of a malformed provider response).

### Gemini API (Flash tier, REST, structured output)

`POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}`

Request: a single prompt containing the raw German translation, `level`, and `topic`, with `generationConfig.responseMimeType: 'application/json'` and `responseSchema` constraining the output to:

```
{ text: string, vocabTerms: string[] }
```

— `text` is the CEFR-adapted German rewrite (safe-subset HTML per this contract's success response above — the backend still independently validates this, since `responseSchema` constrains JSON shape, not string content); `vocabTerms` are substrings the backend locates within `text` (first occurrence per term) to build `MarkedVocabSpan.start`/`.end` before the Google Translate glossing call fills in `.russian`.

A `vocabTerms` entry that cannot be located as a substring of `text` is dropped (not an error) — matches Acceptance Scenario 4 (User Story 1): a paragraph too short/generic for vocabulary marking still returns a valid rewrite with an empty (or shorter) `markedVocab` list, never a hard failure.
