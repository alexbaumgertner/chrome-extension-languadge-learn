 # Feature Specification: Translation Backend

**Feature Branch**: `002-translation-backend`

**Created**: 2026-08-14

**Status**: Draft

**Input**: User description: "a backend for translations. Use google translation API or something else. Not pricy. Use translation cache for articles to space tranclation API consumtion. Let's discuss any unclear points."

## Clarifications

### Session 2026-08-14

- Q: The extension's existing contract expects a CEFR-level-adapted German rewrite plus marked vocabulary with Russian glosses, not just a literal translation. What should this backend feature cover? → A: Full pipeline — translation, CEFR-level rewriting, and vocabulary marking with Russian glosses, matching the existing contract. A low-cost translation service handles raw translation/word glosses; a separate low-cost step handles level-adaptation and vocabulary marking.
- Q: How aggressively should translations be cached, and can the cache be shared across learners? → A: Global shared cache keyed only by a content hash of the paragraph text + level + topic — no user/site identity in the key — so any learner hitting the same combination reuses the cached result.
- Q: What's the expected cost/usage scale? → A: Near-zero / free-tier — design to stay within a translation provider's free allowance for expected usage through aggressive caching, treating the allowance as a hard cap rather than a flexible budget.
- Q: Should the backend add any request-rate protection to stop a single client from burning through the whole shared free-translation allowance, given that requests carry no learner or device identity to throttle by? → A: No extra protection — rely solely on the global allowance cap (FR-010); accept the risk of a burst exhausting the shared allowance rather than tracking any identifying signal, consistent with the no-identity-tracking privacy requirement.
- Q: Should cached translation results ever expire or get evicted, or should the shared cache keep every entry forever? → A: Persist indefinitely — no TTL, no eviction; entries are kept forever.
- Q: Should trivial formatting differences (extra whitespace, different line breaks) in otherwise-identical paragraph text be treated as the same cache entry, or as separate entries? → A: Normalize before hashing — trim and collapse whitespace before computing the cache-key hash, so incidental formatting differences reuse the same entry.
- Q: Should the backend impose a maximum length on the submitted paragraph text, rejecting overly long requests before calling the external translation service? → A: Yes — reject requests whose text exceeds a configured character limit before any external call.
- Q: When a request arrives with a grammar topic value the backend doesn't recognize, should the backend validate topic against a known list and reject it, or accept any non-empty topic string as an opaque cache-key component? → A: Accept any non-empty string — the backend treats topic as an opaque identifier and does not maintain its own whitelist; level remains validated against the existing contract's closed enum (`A1-A2` | `B1-B2` | `C1+`).

### Session 2026-08-15

- Q: Should the backend's returned German text be plain text only, or a constrained-safe HTML fragment that preserves inline formatting like bold/italic? → A: Safe-subset HTML fragment — restricted to an allowlist (`<strong>`/`<em>` only, no attributes, no other elements), matching the existing CMS contract's documented response shape.

### Session 2026-08-16

- Q: When a call to Google Translate or Gemini times out or errors, should the backend retry it, or fail immediately? → A: One retry with a short timeout before giving up — a failed provider call is retried once after a short timeout; if the retry also fails, the backend returns the upstream-failure result.
- Q: Does FR-007's "MUST NOT persist or log any data" also cover the web framework's own default access/error logging, or only application code's explicit logging calls? → A: In scope — no learner-submitted text, response text, or full request/response bodies may appear in any log output, application-level or framework-level; framework request/error logging must be configured (or disabled) accordingly.
- Q: Should validation also check that each vocabulary span's `german` field exactly matches the actual substring of `text` at its `start`/`end` positions, or is checking only that the positions are in-bounds enough? → A: Yes — `german` must exactly equal `text.substring(start, end)`; a mismatch fails validation like any other invalid response (the whole response is discarded, consistent with FR-012's existing all-or-nothing framing).
- Q: If the backend's own storage (the SQLite cache/usage-ledger file) fails to read or write, should that be treated the same as an external-provider failure, or reported as a distinguishable error? → A: Distinct error — a storage failure is reported separately from an external-provider failure, so operators/tests can tell the two causes apart.
- Q: Should the spec state explicitly that each provider (translation, level-adaptation) has its own independent usage allowance, checked before either call, rather than describing one unified allowance? → A: Yes — each provider has its own independent allowance, both checked before either call is made, and a request is refused if it would exceed either provider's allowance.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get a leveled, glossed translation of a paragraph (Priority: P1)

A learner clicks a paragraph in the extension. The extension sends that paragraph's text, the learner's level, and their current grammar topic to the backend, and receives back a German version of the paragraph written at that level, with a set of vocabulary words marked and paired with their Russian meaning.

**Why this priority**: This is the entire reason the backend exists — without it, the extension's core reading-practice loop (already specified in the in-page reading practice feature) has nothing to call. Every other capability in this spec (caching, cost control, resilience) only matters because this request exists.

**Independent Test**: Send a request with paragraph text, a level, and a topic to the backend and verify the response contains a German-language rewrite of that text adapted to the requested level, plus a list of marked vocabulary spans each paired with a Russian meaning.

**Acceptance Scenarios**:

1. **Given** paragraph text, a level, and a topic the backend has never seen before, **When** a translation request is made, **Then** the response contains a German rewrite of the text and a non-empty or empty (never malformed) list of marked vocabulary spans, each with a Russian meaning.
2. **Given** a request with missing or empty paragraph text, **When** it is submitted, **Then** the backend rejects it without attempting a translation.
3. **Given** the same paragraph text submitted at two different levels, **When** both are translated, **Then** the two German rewrites reflect their respective levels (e.g., differ in vocabulary/sentence complexity) rather than returning identical output.
4. **Given** a paragraph too short or too generic to support vocabulary marking, **When** it is translated, **Then** the response still returns a valid German rewrite with an empty vocabulary list, never an error.

---

### User Story 2 - Reuse prior translations instead of paying for them again (Priority: P2)

When a paragraph, level, and topic combination has already been translated for any learner, a later request for that exact combination — from the same or a different learner — is served from a cache instead of triggering a new call to the paid translation service.

**Why this priority**: This is the mechanism that makes the backend affordable to run at all; without it, every click by every learner (including the same learner re-reading, or two learners reading the same popular article) would consume paid quota for output that already exists.

**Independent Test**: Submit the same paragraph text, level, and topic twice (optionally as two different simulated learners) and verify the second response is identical to the first and does not increase the external translation service's usage count.

**Acceptance Scenarios**:

1. **Given** a paragraph/level/topic combination already translated once, **When** it is requested again, **Then** the response is served without a new call to the external translation service and matches the original result exactly.
2. **Given** two different (simulated) learners requesting the same paragraph/level/topic combination, **When** the second request arrives after the first has completed, **Then** it is also served from the cache.
3. **Given** the same paragraph text but a different level or a different topic, **When** each is requested, **Then** each is treated as a separate entry and translated independently.
4. **Given** two requests for the same never-before-seen paragraph/level/topic combination arriving at nearly the same time, **When** both are in flight, **Then** the external translation service is called at most once for that combination, not once per concurrent request.

---

### User Story 3 - Stay within a controlled, predictable cost (Priority: P3)

The person operating the backend can see how much of the translation service's free allowance has been used, and the backend protects itself from generating unexpected charges by limiting new (non-cached) translation calls once the allowance is exhausted.

**Why this priority**: Cost control is a stated requirement ("not pricy") and a precondition for running this backend at all without financial risk, but it only matters once real traffic is flowing through Stories 1 and 2, so it is correctly sequenced after them.

**Independent Test**: Drive a volume of distinct (non-cached) translation requests and verify usage tracking increases accordingly; simulate reaching the configured allowance and verify further non-cached requests are refused with a clear, distinguishable result rather than silently incurring a charge.

**Acceptance Scenarios**:

1. **Given** a series of distinct, non-cached translation requests, **When** each completes, **Then** the operator can observe cumulative usage against the configured allowance.
2. **Given** the configured allowance has been reached, **When** a new (non-cached) translation request arrives, **Then** it is refused with a result the caller can distinguish from a normal translation failure, and no external translation call is made.
3. **Given** the allowance has been reached, **When** a request arrives for a combination already in the cache, **Then** it is still served successfully from the cache.

---

### User Story 4 - Keep serving what's already known when the translation service misbehaves (Priority: P4)

If the external translation service is slow, unavailable, or returns something unusable, learners requesting already-cached paragraphs are unaffected, and learners requesting new content get a clear failure instead of a hang or a corrupted result.

**Why this priority**: Resilience matters for a good learner experience but is a refinement on top of a working translate-and-cache pipeline (Stories 1–2) rather than a precondition for it.

**Independent Test**: Simulate the external translation service being unreachable or returning invalid data; verify cached-combination requests still succeed and new-combination requests return a clear, well-formed failure result.

**Acceptance Scenarios**:

1. **Given** the external translation service is unreachable, **When** a request for an already-cached combination is made, **Then** it still succeeds using the cached result.
2. **Given** the external translation service is unreachable, **When** a request for a never-before-seen combination is made, **Then** the backend returns a clear failure result rather than hanging or returning partial/corrupted content.
3. **Given** the external translation service returns a malformed or unsafe response, **When** the backend processes it, **Then** the backend discards it and returns a failure result rather than caching or forwarding it.

---

### Edge Cases

- What happens when the paragraph text contains content unsafe to render (e.g., embedded markup) — is it sanitized before or after translation/caching?
- A vocabulary span whose position is out of bounds, or whose `german` field does not exactly match the text substring at that position, fails validation and discards the entire response (FR-012).
- What happens when a provider's allowance period resets — does usage tracking roll over cleanly with no manual intervention, for each provider's own independent period?
- An unrecognized `level` is rejected (FR-003b); an unrecognized `topic` is accepted as an opaque value, not validated against a whitelist (FR-003b).
- If the backend's own local storage (cache/usage-ledger) fails to read or write, the request fails with a result distinguishable from an external-provider failure (FR-013).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Backend MUST accept a translation request consisting of paragraph text, a target proficiency level, and a grammar topic, and return a German-language rewrite of that text adapted to the requested level, as a safe-subset HTML fragment (only `<strong>`/`<em>` tags permitted, no attributes, no other elements).
- **FR-002**: Backend MUST identify vocabulary within the returned German text and mark spans of it, each paired with its Russian meaning, following the same response shape the extension already expects (text plus a list of marked spans with start/end position, German term, and Russian meaning).
- **FR-003**: Backend MUST reject requests missing paragraph text, level, or topic before making any call to the external translation service.
- **FR-003a**: Backend MUST reject requests whose paragraph text exceeds a configured maximum length, before making any call to the external translation service.
- **FR-003b**: Backend MUST validate `level` against the closed set of recognized values (`A1-A2`, `B1-B2`, `C1+`) and reject requests with an unrecognized level; `topic` MUST be accepted as any non-empty string without validation against a whitelist.
- **FR-004**: Backend MUST cache every successful translation result, keyed only by a combination of the paragraph text (whitespace-normalized — trimmed and collapsed — before hashing, so trivial formatting differences reuse the same entry), the requested level, and the requested topic — never by learner identity, device identity, site, or URL.
- **FR-005**: Backend MUST serve a cached result instead of invoking the external translation service whenever an incoming request's text, level, and topic exactly match an existing cache entry.
- **FR-006**: The cache MUST be shared across all learners and requesting contexts — a cache entry created by one learner's request MUST be reusable by any other learner's matching request.
- **FR-007**: Backend MUST NOT persist or log any data beyond the paragraph text, level, topic, and the resulting translation — no URLs, learner identifiers, device identifiers, or IP-linked history. This applies to every log output the backend produces, including the web framework's own default request/access/error logging, not only explicit application-level logging calls — framework logging MUST be configured (or disabled) so it never prints request/response bodies or full URLs.
- **FR-008**: Backend MUST coalesce concurrent requests for the same never-before-cached text/level/topic combination so the external translation service is called at most once for that combination.
- **FR-009**: Backend MUST track cumulative usage of each external provider it calls (the translation service and the level-adaptation service) separately, each against its own independently configured free allowance.
- **FR-010**: Backend MUST check both providers' usage against their respective allowances before making either external call for a new (non-cached) request, and refuse the request — returning a result distinguishable from a normal translation failure, while continuing to serve cached results — if proceeding would exceed either provider's allowance.
- **FR-011**: Backend MUST return a distinguishable failure result — never a partial, malformed, or silently empty success — when the external translation service is unreachable, times out, or returns a response that fails validation. A provider call that times out or errors MUST be retried exactly once after a short timeout; only a second consecutive failure of the same call produces the failure result.
- **FR-012**: Backend MUST discard and never cache a response from the external translation service that fails validation (e.g., vocabulary spans whose position is out of bounds, whose `german` field does not exactly equal the substring of the returned text at that span's position, or text containing markup outside the safe subset defined in FR-001 — anything beyond bare `<strong>`/`<em>` tags with no attributes counts as unsafe content). Any single invalid span fails the entire response, not just that span.
- **FR-013**: Backend MUST report a failure of its own local storage (the cache/usage-ledger persistence layer) as a result distinguishable from an external-provider failure (FR-011) or an allowance-exhausted refusal (FR-010), so operators and tests can tell a storage problem apart from a provider or quota problem.

### Key Entities

- **Translation Request**: The input to a translation — paragraph text, requested proficiency level, and grammar topic. Carries no learner, device, or site identity.
- **Translation Result**: The German-language rewrite of the requested text at the requested level, together with its marked vocabulary spans.
- **Marked Vocabulary Span**: A position within a Translation Result's text, the German term at that position, and its Russian meaning.
- **Cache Entry**: A stored Translation Result, keyed by a content hash of the paragraph text combined with the requested level and topic; shared across all requesters; persists indefinitely with no expiry or eviction.
- **Usage Ledger**: A running count of consumption for each external provider (translation service, level-adaptation service) over its own current allowance period, each checked independently to decide whether a new (non-cached) request may proceed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner requesting a paragraph/level/topic combination for the first time receives a complete translation result within a normal page-interaction wait (a few seconds), without the extension appearing to hang.
- **SC-002**: At least 95% of requests for a paragraph/level/topic combination that has already been served once are answered without a new call to the external translation service.
- **SC-003**: For a typical expected usage pattern (a small, steady population of learners reading ordinary articles), monthly external translation usage stays within the configured free allowance with zero unexpected charges.
- **SC-004**: When the external translation service is completely unavailable, 100% of requests for already-cached combinations still succeed, and requests for new combinations fail clearly rather than hanging or returning corrupted content.
- **SC-005**: No cached or logged data ever includes a URL, learner identifier, or device identifier, verifiable by inspecting stored cache entries and all log output the backend produces (application-level and framework-level).

## Assumptions

- This feature implements the translation capability the in-page reading practice feature already depends on (see `specs/001-in-page-reading-practice/contracts/cms-api-contract.md`, `POST /api/translate`) — it does not cover exercise generation or text-to-speech, which remain separate concerns.
- Vocabulary marking is driven by the requested level and topic, not by an individual learner's personal vocabulary history — consistent with the request carrying no learner identity, and with the decision to share cache entries across learners (identical inputs always produce identical output).
- "Not pricy" is interpreted as: design the system to operate within a translation provider's free usage allowance for the expected traffic volume, treating that allowance as a hard cap. Selecting a specific provider (Google Cloud Translation or an alternative) is an implementation decision made during planning, not part of this specification.
- The paragraph text a learner's browser extracts and sends is assumed to already exclude non-translatable markup (this matches the extraction behavior specified in the in-page reading practice feature); this backend is not responsible for stripping page markup before translation.
- Each external provider (translation service, level-adaptation service) tracks usage against its own independently configured allowance and reset period (e.g., monthly for one, daily for the other); the exact period length per provider is an implementation decision made during planning, matched to that provider's real free-tier terms.
- Abuse protection beyond the global usage allowance (FR-010) is out of scope for this feature — no per-IP or per-client rate limiting is applied, since requests intentionally carry no identifying signal to throttle by.
