  # Implementation Plan: In-Page Reading Practice

**Branch**: `001-in-page-reading-practice` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-in-page-reading-practice/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Let a Russian-speaking German learner click any eligible paragraph on an enabled site and see it swapped, in place, for a German version at their level with target vocabulary marked; work exercises built from that same paragraph in a right-edge Shadow DOM panel; and have every answer update streak, active vocabulary, per-topic accuracy, and the SRS review queue — all reversible, per-site opt-in, and offline-capable once content has been fetched once.

Technical approach: a WXT-built MV3 extension (content script + background service worker + popup + options page, all React 19 / TypeScript strict) with a `packages/shared` workspace holding Zod schemas for every cross-context message and every CMS response. The content script owns a DOM paragraph parser/substitution engine (save-original-innerHTML-and-restore, per the validated spike in `docs/spike-findings.md`) and mounts one Shadow-DOM-isolated `createShadowRootUi` panel. A background service worker proxies all network calls to the external Payload CMS (translation, exercise generation, TTS) so the content script never talks to the network directly, and mediates `chrome.storage`/IndexedDB access. Local persistence is offline-first: `chrome.storage.local` for settings, site rules, SRS/vocabulary/progress state (small, frequently-read), and IndexedDB for cached paragraph translations and exercise sets (larger, keyed by paragraph content hash).

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode, Node.js 24 for tooling/build

**Primary Dependencies**: WXT (extension framework, MV3), React 19, Zod (`packages/shared` contracts), Web Speech API (`SpeechSynthesisUtterance`) for offline/fallback TTS

**Storage**: `chrome.storage.local` (settings, site rules, vocabulary/SRS state, progress profile — small, source of truth per Constitution IV) + IndexedDB (cached German variants, exercise sets, TTS audio blobs — larger, offline cache, keyed by paragraph content hash + level + topic)

**Testing**: Vitest (unit: paragraph parser, SRS scheduler, answer-normalization, Zod contract schemas) + Playwright (integration: real-DOM substitution/restoration across representative site markup, content-script ↔ background messaging, offline mode via CDP network throttling)

**Target Platform**: Chrome (MV3), desktop, per `docs/spike-findings.md` DOM behavior validated across 11 real news/reference/social sites

**Project Type**: Browser extension (Chrome MV3) monorepo — extension app + shared contracts package

**Performance Goals**: Paragraph → German version in <2s warm cache / <5s cold fetch (SC-001); no synchronous long task or layout thrash from content-script injection (Constitution VIII); exercise submit → feedback perceived as immediate (<100ms local evaluation, matching normalization is synchronous/local)

**Constraints**: No `<all_urls>` / no default `host_permissions` — `activeTab` + `optional_host_permissions` only (Constitution I); 100% DOM-restoration fidelity across plain text/links/inline formatting (SC-002); all injected UI Shadow-DOM-isolated in both style directions (FR-016); previously-fetched translations/exercises/vocabulary fully usable offline (FR-013); no page content leaves device beyond the clicked paragraph's own text (FR-015)

**Scale/Scope**: Single learner per device/profile, one language pair (DE target / RU native), 4 surfaces (content overlay, popup, options, progress view), 4 exercise kinds, no account/sync in scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Least Privilege | No `<all_urls>`/default `host_permissions`; `activeTab` + `optional_host_permissions` requested only on explicit per-site enable (User Story 4, FR-002) | PASS — no new permission beyond what the constitution already names; site-enable gesture is the trigger |
| II. Host Page Integrity | Shadow DOM for all injected UI; substitution fully reversible; no mutation outside the clicked paragraph | PASS — validated by spike (`docs/spike-findings.md`: clean restore on 11/11 sites); design confirms save-innerHTML/restore approach |
| III. Privacy | Only clicked-paragraph text sent, never URL/user id/history; enabling a site is the consent (FR-015, clarified 2026-08-10) | PASS — background worker is the sole egress point, scoped to paragraph text + level/topic params |
| IV. Offline-First | Vocabulary, SRS, and already-fetched translations/exercises work with no network | PASS — `chrome.storage.local` + IndexedDB cache design; User Story 5 is explicitly offline |
| V. Typed Contracts | Every content↔background↔popup↔options message and every CMS response validated by Zod in `packages/shared`; strict TS | PASS — see `contracts/` below; no `any` at boundaries |
| VI. Test What Breaks | Mandatory tests: DOM substitution/restoration, paragraph parser, SRS scheduler, contract schemas | PASS — Vitest + Playwright plan above covers all four explicitly |
| VII. Simplicity (YAGNI) | No speculative abstraction; duplicate before a 3rd use case | PASS — single exercise-generation pipeline reused by all 4 kinds rather than 4 bespoke services; no multi-language-pair abstraction (RU/DE hardcoded per Assumptions) |
| VIII. Performance & Unobtrusive UX | No layout thrash/long tasks; dismissible, non-modal UI | PASS — Shadow DOM panel is fixed-position and collapsible; substitution touches only the clicked node's subtree |

No violations requiring justification — Complexity Tracking table is empty.

**Amendment (implementation, T003)**: `manifest.permissions` is `["storage"]`, not `[]` as originally sketched — `chrome.storage` (the offline-first source of truth Constitution IV names) requires the "storage" permission at the manifest level; it grants no host/site access and carries none of the review-friction cost Principle I guards against, so it doesn't change the PASS verdict above.

**Amendment (implementation, T056)**: `manifest.permissions` also includes `"activeTab"` — the exact permission Principle I's own gate text names ("`activeTab` + `optional_host_permissions`"), needed for the popup to read the current tab's hostname for its enable/disable toggle. Temporary and user-gesture-scoped only; no change to the PASS verdict.

### Post-Design Re-Check

Re-verified after Phase 1 (`data-model.md`, `contracts/`, `quickstart.md`):

- **I. Least Privilege** — `SET_SITE_STATUS` (`contracts/messaging-contract.md`) is the only path that calls `chrome.permissions.request`, gated on the popup toggle gesture; no schema or entity introduces a broader permission. PASS.
- **II. Host Page Integrity** — `Paragraph` entity (`data-model.md`) confirms restoration is a verbatim `innerHTML` snapshot/replay with no host-node mutation outside the clicked element; `German Variant.text` is restricted to a safe markup subset, never host markup passthrough. PASS.
- **III. Privacy** — `cms-api-contract.md` request bodies carry only `text`/`level`/`topic`, never URL or identifier; background is the sole egress point per `messaging-contract.md`. PASS.
- **IV. Offline-First** — storage split in `contracts/storage-schema.md` keeps all offline-needed state (settings, vocab, SRS, cached variants/exercises/audio) local with no TTL/expiry; `GET_SITE_STATUS`/`TRANSLATE_PARAGRAPH` responses have explicit offline-failure shapes (`offline-no-cache`) rather than throwing. PASS.
- **V. Typed Contracts** — every message, CMS response, and storage record now has a named Zod schema location (`messages.ts`, `cms.ts`, `storage.ts`); `storage-schema.md` mandates round-trip contract tests. PASS.
- **VI. Test What Breaks** — `quickstart.md` automated section runs unit tests over parser/scheduler/matcher/schemas and integration tests over substitution/restoration/offline, matching Constitution VI's four mandatory areas exactly. PASS.
- **VII. Simplicity** — no per-item ease-factor UI, no attempt-history log entity, no multi-language abstraction were introduced in the data model; `Exercise`/`Exercise Attempt` deliberately stay transient rather than becoming a persisted log. PASS.
- **VIII. Performance & Unobtrusive UX** — `TRANSLATE_PARAGRAPH` is async/message-based (no synchronous main-thread network call from the content script); TTS audio is fetched lazily on first play, never prefetched. PASS.

No new violations surfaced by design; Complexity Tracking remains empty.

### Post-Implementation Re-Check (T071)

Re-verified against the finished code and test suite (68 unit + 12 Playwright integration tests, all passing):

- **I. Least Privilege** — `apps/extension/wxt.config.ts`: production manifest is `permissions: ["storage", "activeTab"]`, `optional_host_permissions: ["*://*/*"]`, no `host_permissions` key at all (confirmed via `pnpm -r build` manifest output). `chrome.permissions.request` is called only from `handleSetSiteStatus` in `entrypoints/background.ts`, itself only reachable via the popup's toggle button. PASS.
- **II. Host Page Integrity** — `lib/dom/substitution.ts`'s `applyVariant`/`restoreOriginal` are the only writers of paragraph `innerHTML`; `tests/integration/substitution-restoration.spec.ts` asserts byte-identical `outerHTML` across 4 markup patterns, `tests/integration/host-rerender.spec.ts` asserts no throw/orphan on a host-driven replacement. All extension chrome (panel, tooltips, error banners) is Shadow-DOM isolated (`createShadowRootUi` for the panel, `lib/dom/shadow-portal.ts` for the rest) — see research.md §1's amendment for the one implementation deviation (inline `<style>` instead of `cssInjectionMode: 'ui'`), which preserves the same isolation guarantee. PASS.
- **III. Privacy** — `lib/cms/client.ts`'s `translateParagraph` sends only `{text, level, topic}`; background (`entrypoints/background.ts`) is the only module importing it. PASS.
- **IV. Offline-First** — `tests/integration/offline.spec.ts` proves cached translate/exercise/progress flows work with the CMS unreachable, and a never-cached paragraph gets the distinct `offline-no-cache` message rather than a generic error. PASS.
- **V. Typed Contracts** — every schema in `packages/shared/src/schemas/*.ts` is exercised by `packages/shared/tests/schemas.test.ts` (32 round-trip tests); `grep` across `packages/shared/src` and `apps/extension/lib`/`entrypoints` finds zero `any` usages. PASS.
- **VI. Test What Breaks** — all four mandatory areas covered: `tests/unit/paragraph-parser.test.ts`, `tests/integration/substitution-restoration.spec.ts`, `tests/unit/scheduler.test.ts`, `packages/shared/tests/schemas.test.ts`. PASS.
- **VII. Simplicity** — no scope crept in beyond the plan; the one deliberate simplification (audio-dictation exercises don't claim a specific `affectedVocabId`, since a whole-sentence dictation isn't tied to one target word) is documented inline in `AudioDictationCard.tsx` rather than left implicit. PASS.
- **VIII. Performance & Unobtrusive UX** — confirmed by code audit (T069): no synchronous XHR anywhere in the codebase; `PLAY_TTS` is sent only from `AudioDictationCard`'s play-button handler, never prefetched. PASS.

No violations found; Complexity Tracking remains empty. Two additive, non-violating manifest-permission amendments are recorded above (`storage`, `activeTab`).

## Project Structure

### Documentation (this feature)

```text
specs/001-in-page-reading-practice/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/extension/
├── wxt.config.ts
├── entrypoints/
│   ├── content/
│   │   ├── index.ts            # content script entry: mounts createShadowRootUi panel, wires paragraph clicks
│   │   └── overlay/             # React tree for the right-edge panel (collapsed tab + expanded panel + 4 exercise cards)
│   ├── background.ts             # MV3 service worker: CMS fetch orchestration, message router, permission requests, storage mediation
│   ├── popup/                     # browser-action popup (site toggle, today's numbers)
│   └── options/                    # options page: learning settings, vocabulary table, site rules, progress view (route/tab per design handoff)
├── lib/
│   ├── dom/
│   │   ├── paragraph-parser.ts    # eligible-block detection (per spike-snippet.js, tightened to article/main root)
│   │   └── substitution.ts        # save-original/apply-variant/restore-original engine
│   ├── srs/
│   │   └── scheduler.ts           # spaced-repetition scheduling (Review Queue Entry transitions)
│   ├── exercises/
│   │   ├── generate.ts            # build up to 4 exercise kinds from a German Variant
│   │   └── match.ts               # lenient answer normalization (case/punctuation/whitespace/umlaut)
│   └── storage/
│       ├── settings.ts            # chrome.storage.local: Learner Settings, Site Rule
│       ├── progress.ts            # chrome.storage.local: Progress Profile, Vocabulary Item, Review Queue Entry
│       └── content-cache.ts       # IndexedDB: German Variant + Exercise + TTS audio cache, keyed by paragraph hash/level/topic
├── components/                     # shared React components (cards, tags, progress bars) per design_handoff_sprachweise/README.md tokens
└── tests/
    ├── unit/                        # paragraph-parser, scheduler, match.ts, Zod schemas
    ├── integration/                  # Playwright: substitution/restoration on representative markup, offline mode, message flows
    └── contract/                      # schema round-trip tests for every message/CMS-response contract

packages/shared/
├── src/
│   ├── schemas/
│   │   ├── messages.ts            # content↔background↔popup↔options message contracts (Zod)
│   │   └── cms.ts                 # Payload CMS response contracts: translation, exercise set, TTS (Zod)
│   ├── types/                      # inferred TS types from the above (z.infer), no hand-duplicated types
│   └── index.ts
└── tests/
    └── schemas.test.ts
```

**Structure Decision**: pnpm-workspace monorepo with a single extension app (`apps/extension`, WXT + React 19) and one shared package (`packages/shared`) holding the Zod contracts the constitution requires at every boundary. This matches the constitution's explicit references to `packages/shared` as the cross-context contract source of truth (Principle V, Technology Constraints) and keeps the extension itself a single WXT project rather than splitting content/background/popup/options into separate packages — they share too much UI and domain logic (exercise cards, storage, DOM engine) to justify the extra indirection (Principle VII).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — no gate violations.
