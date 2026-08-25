# Phase 0 Research: In-Page Reading Practice

All items below were either fully specified by the spec's Clarifications session (2026-08-10) or are resolved here from the constitution, the design handoff, and the DOM spike. No NEEDS CLARIFICATION markers remain in the Technical Context.

## 1. Content-script UI mounting (Shadow DOM isolation)

- **Decision**: Use WXT's `createShadowRootUi` for the right-edge panel, with `cssInjectionMode: 'ui'` so component styles are scoped into the shadow root and never leak to/from the host page.
- **Rationale**: Satisfies Constitution II/FR-016 (bidirectional style isolation) with a framework-native primitive instead of hand-rolled shadow root management; WXT wires teardown/remount automatically on content-script reinjection.
- **Alternatives considered**: Manual `attachShadow` + manual React root — rejected, reinvents what WXT already provides and risks missed cleanup on SPA navigation.
- **Amendment (implementation, T033)**: `cssInjectionMode: 'ui'` was dropped — with no `.css` file imported into the content-script entry, WXT's UI CSS loader tried to fetch a nonexistent stylesheet URL (`chrome-extension://invalid/`) and threw before `onMount` ran, so the panel never rendered. Styles are instead injected as a `<style>` element rendered by `Panel.tsx` itself as the shadow root's first child — shadow roots scope any `<style>` placed inside them regardless of `cssInjectionMode`, so Constitution II's bidirectional isolation guarantee still holds; verified by the Playwright exercise-panel suite.

## 2. Paragraph detection, substitution, and restoration

- **Decision**: Reuse the spike's approach (`docs/spike-snippet.js`) — deepest-block text-node selection (`p`, `article div`, `li`), min-length filter, save each target's `innerHTML` before mutation, restore by reassigning `innerHTML` verbatim — but scope traversal to the page's `article`/main-content root and exclude known teaser/paywall containers to fix the two false positives the spike found (tagesschau.de related-article card, Medium paywall CTA).
- **Rationale**: The spike validated 0-leak restoration across 11 real sites (news, wiki, forum, paywalled, RU and DE content) including nested/lazy-loaded DOM; `innerHTML` save/restore is the simplest mechanism that guarantees byte-identical restoration (SC-002) without needing a virtual-DOM diff.
- **Alternatives considered**: Cloning nodes instead of saving `innerHTML` — rejected, more complex for equivalent guarantee since spike already proved innerHTML round-trips cleanly, including inline formatting and links. MutationObserver-based re-application of translations across host re-renders — explicitly rejected per spec Assumptions (a host re-render is treated as reverting the paragraph to untranslated; no attempt to re-detect and reapply).
- **Node identity**: A `WeakMap<Element, {html, id}>` for currently-translated nodes (not a DOM attribute), so a host-driven subtree replacement naturally drops identity (no stale `data-*` to clean up) — this directly satisfies the Edge Case requirement that a re-rendered paragraph is treated as fresh/untranslated.

## 3. Local persistence split: chrome.storage.local vs IndexedDB

- **Decision**: `chrome.storage.local` holds small, frequently-read state that must be trivially syncable to UI reactively: Learner Settings, Site Rule list, Vocabulary Item records, Review Queue Entries, Progress Profile. IndexedDB (via a thin wrapper, e.g. `idb`) holds larger cached payloads: German Variant text + marked spans, generated Exercise sets, and TTS audio blobs — keyed by `hash(paragraphText) + level + topic`.
- **Rationale**: Constitution IV names `chrome.storage` as the source of truth for *progress*, not necessarily for bulk cached content; `chrome.storage.local` has a default 10MB quota which cached article translations/exercises/audio across many sites would exhaust quickly, while IndexedDB has no such practical ceiling and supports the key-range lookups the cache needs. Keeping progress/settings in `chrome.storage.local` preserves the `chrome.storage.onChanged` reactivity popup/options/content need for live UI updates.
- **Alternatives considered**: Everything in `chrome.storage.local` with `unlimitedStorage` permission — rejected, adds a manifest permission with no per-site gesture behind it (tension with Constitution I's least-privilege spirit even though `unlimitedStorage` isn't host-scoped) and `chrome.storage` is not designed for large-blob/audio storage. Everything in IndexedDB — rejected, loses `chrome.storage.onChanged` push updates for the small hot-path state (streak, toggle state) that popup/options poll.

## 4. Cross-context typed contracts

- **Decision**: All content↔background, popup↔background, and options↔background messages are typed Zod schemas in `packages/shared/src/schemas/messages.ts`, discriminated by a `type` field; background validates every inbound message and every Payload CMS HTTP response against a schema in `packages/shared/src/schemas/cms.ts` before use, and any content sent to background/CMS is asserted against these schemas at the boundary.
- **Rationale**: Constitution V is explicit and non-negotiable; a discriminated-union message schema also gives exhaustive `switch` handling in the background router for free under `strict` TS.
- **Alternatives considered**: Hand-written TS interfaces with runtime `if` narrowing — rejected, no runtime validation at the CMS boundary (an external system), violating Constitution V's "every CMS response" requirement.

## 5. Answer-matching leniency (FR-009)

- **Decision**: Normalize both submitted and expected answers through: lowercase → strip `.,!?;:()"'` → collapse/trim whitespace → apply a fixed umlaut/eszett transliteration map (ä/ae, ö/oe, ü/ue, ß/ss) in both directions before comparing.
- **Rationale**: Matches the design handoff's documented normalization exactly ("lowercase, strip `.,!?;:`, collapse whitespace, trim... accept both umlaut and transliterated forms") and SC-004's 95% acceptance target; a fixed bidirectional map is deterministic and testable without a fuzzy-matching dependency (Constitution VII — no dependency weight for a solved problem).
- **Alternatives considered**: Levenshtein-distance fuzzy matching — rejected as unnecessary scope beyond what FR-009 asks for (case/punctuation/whitespace/umlaut only, not general typo tolerance); would also risk false-accepting wrong answers.

## 6. Spaced-repetition scheduling

- **Decision**: A simplified SM-2-style scheduler: each Review Queue Entry tracks repetitions and an interval; a correct answer advances the interval (1 → 6 → interval×2.5-ish, capped) and increments repetitions; an incorrect answer resets repetitions to 0 and interval to 1 day. Next-due date = today (learner's local calendar day) + interval.
- **Rationale**: SM-2 is the well-understood baseline SRS algorithm (Anki's ancestor), simple enough to implement and unit-test deterministically (Constitution VI/VII), and satisfies FR-011/FR-017/Acceptance Scenario 3.4 (next scheduled review changes based on correctness) without needing a per-word ease-factor UI the spec never asks for.
- **Alternatives considered**: Full SM-2 with per-item ease factor exposed/tunable — rejected as speculative; spec has no requirement for the learner to see or adjust ease factors.

## 7. Streak / "day" boundary

- **Decision**: Already resolved by spec Clarifications — device's local calendar day (`Date` in local time, midnight-to-midnight), computed from the device clock at the moment an exercise is solved and at the moment progress is viewed.
- **Rationale**: Direct from the 2026-08-10 clarification; no further research needed.

## 8. Audio dictation (TTS)

- **Decision**: Background worker requests TTS audio from the Payload CMS-backed endpoint for a given sentence (cached in IndexedDB alongside the paragraph's exercise set); content-script overlay plays the cached blob when available. When offline and nothing is cached, fall back to the browser's native `SpeechSynthesisUtterance` (`lang: 'de-DE'`, rate 0.95 normal / 0.6 slow) as the design handoff specifies, wrapped in try/catch degrading silently if synthesis is unavailable.
- **Rationale**: Matches the design handoff's explicit guidance ("production should prefer a server TTS proxy for consistent voices, with Web Speech as fallback") and satisfies Offline-First (Constitution IV / User Story 5) since Web Speech works with no network for locally installed voices.
- **Alternatives considered**: Web Speech only (no server TTS) — rejected, handoff explicitly calls out inconsistent voice quality as the reason to prefer a server proxy when online.

## 9. Testing strategy

- **Decision**: Vitest for pure-logic unit tests (paragraph parser against fixture HTML strings, SM-2 scheduler transitions, answer-normalization table, Zod schema parse/round-trip). Playwright for integration tests that need a real browser DOM and a loaded MV3 extension: substitution/restoration against representative site markup (drawn from the 11 spike sites' structural patterns), content↔background message flow, and offline behavior via CDP network conditions (`page.route`/context offline mode).
- **Rationale**: Constitution VI names exactly these four areas as mandatory test surfaces; Playwright is the practical way to load an unpacked MV3 extension and drive a real DOM for the substitution/restoration guarantee (jsdom cannot host a real Shadow DOM + content-script-in-page scenario faithfully enough for the reversibility guarantee SC-002 demands).
- **Alternatives considered**: jsdom-only for substitution tests — rejected as insufficient confidence for the reversibility guarantee that is the product's "trust foundation" (spec, User Story 1 rationale).

## 10. CMS integration boundary

- **Decision**: Treat the Payload CMS as an existing external service reachable over HTTP from the background worker only; this plan defines and validates the *contract* (request/response shapes for translation, exercise generation, TTS) via `packages/shared/src/schemas/cms.ts`, but the CMS server implementation itself is out of scope for this feature (per constitution: "Content source: Payload CMS (external)").
- **Rationale**: Constitution frames Payload CMS as an external dependency, not a deliverable of this plan; scoping the CMS server build out keeps this plan aligned with the spec's boundary (in-page reading/substitution, exercise panel, progress recording, per-site enable/disable, settings).
- **Alternatives considered**: none — this is a scope boundary drawn directly from the constitution's own framing, not an engineering trade-off.
