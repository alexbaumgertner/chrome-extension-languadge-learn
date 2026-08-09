---

description: "Task list for In-Page Reading Practice"
---

# Tasks: In-Page Reading Practice

**Input**: Design documents from `/specs/001-in-page-reading-practice/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — Constitution VI ("Test What Breaks") mandates tests for DOM substitution/restoration, the paragraph parser, the SRS scheduler, and contract schemas; `research.md` §9 and `quickstart.md` name Vitest (unit) + Playwright (integration) as the concrete tooling.

**Organization**: Tasks are grouped by user story (P1–P5 from spec.md) so each can be implemented and independently tested/demoed on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to US1–US5 from spec.md
- File paths are exact, per `plan.md`'s Project Structure

## Path Conventions

Monorepo per `plan.md`: `apps/extension/` (WXT MV3 extension) + `packages/shared/` (Zod contracts). All paths below are repo-root-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo scaffold, tooling, and workspace wiring — nothing feature-specific yet.

- [ ] T001 Create pnpm workspace root: `pnpm-workspace.yaml` listing `apps/*` and `packages/*`, root `package.json` (name `sprachweise`, private, `packageManager: pnpm@<version>`), root `tsconfig.json` (strict: true, base for project references), and `.gitignore` entries for `node_modules`, `.output`, `.wxt`, `dist`
- [ ] T002 Scaffold `packages/shared` workspace: `packages/shared/package.json` (name `@sprachweise/shared`, `main`/`types` pointing at `src/index.ts`), `packages/shared/tsconfig.json` (extends root, strict), `packages/shared/src/index.ts` (empty barrel export for now), add `zod` as a dependency
- [ ] T003 Scaffold `apps/extension` as a WXT project: `apps/extension/package.json`, `apps/extension/wxt.config.ts` (MV3, React module, `manifest.permissions: []`, `manifest.optional_host_permissions: ['*://*/*']` per Constitution I — no default `host_permissions`), `apps/extension/tsconfig.json` (extends root, strict, path-maps `@sprachweise/shared`), add `wxt`, `react`, `react-dom` as dependencies and a workspace dependency on `@sprachweise/shared`
- [ ] T004 [P] Configure linting/formatting: root ESLint config (TypeScript strict, React hooks rules) and Prettier config, plus `lint`/`format` scripts in root `package.json`
- [ ] T005 [P] Configure Vitest for both workspaces: `apps/extension/vitest.config.ts` and `packages/shared/vitest.config.ts`, each wired to a `test`/`test:unit` script; add `vitest` as a dev dependency at the root
- [ ] T006 [P] Configure Playwright for `apps/extension`: `apps/extension/playwright.config.ts` set up for loading an unpacked MV3 extension (persistent context, `--load-extension` args pointing at `.output/chrome-mv3`), `test:integration` script, and `pnpm exec playwright install` documented in root README or package script
- [ ] T007 Verify the toolchain end-to-end: `pnpm install` at repo root succeeds, `pnpm --filter apps/extension dev` produces a loadable `.output/chrome-mv3/` unpacked extension with a blank popup, per `quickstart.md` "Build and load"

**Checkpoint**: `pnpm install`, `pnpm -r build`, `pnpm -r test` all run cleanly (trivially, with no feature code yet) — the monorepo is ready for feature work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cross-cutting contracts and infrastructure every user story depends on — Zod schemas, storage access, and the messaging router. No user-facing behavior yet.

**⚠️ CRITICAL**: No user story phase (3–7) may begin until this phase is complete.

### Shared contracts (`packages/shared`)

- [ ] T008 [P] Define storage entity schemas in `packages/shared/src/schemas/storage.ts`: `LearnerSettings`, `SiteRule`, `VocabularyItem`, `ReviewQueueEntry`, `ProgressProfile`, `GermanVariant`, `Exercise` (discriminated union on `kind`) — per `data-model.md` field tables, with the `markedVocab` non-overlapping/in-bounds `.refine()` on `GermanVariant`
- [ ] T009 [P] Define cross-context message schemas in `packages/shared/src/schemas/messages.ts`: discriminated union on `type` for `TRANSLATE_PARAGRAPH`, `SUBMIT_EXERCISE_ATTEMPT`, `GET_SITE_STATUS`, `SET_SITE_STATUS`, `GET_LEARNER_SETTINGS`, `SET_LEARNER_SETTINGS`, `GET_PROGRESS_SNAPSHOT`, `STORAGE_CHANGED`, per `contracts/messaging-contract.md` request/response shapes
- [ ] T010 [P] Define CMS response schemas in `packages/shared/src/schemas/cms.ts`: `POST /api/translate` request/response, `POST /api/exercises` request/response (0–4 exercise entries, discriminated on `kind`), `POST /api/tts` request shape, per `contracts/cms-api-contract.md`
- [ ] T011 [US-shared] Export inferred TS types (`z.infer`) for every schema from T008–T010 in `packages/shared/src/types/index.ts`, re-exported via `packages/shared/src/index.ts` — no hand-duplicated interfaces anywhere else in the codebase
- [ ] T012 [P] Contract round-trip tests in `packages/shared/tests/schemas.test.ts`: for every schema from T008–T010, a valid-fixture parse assertion and an invalid-fixture `safeParse()` failure assertion (missing field, wrong enum, out-of-bounds `markedVocab` offset), per `contracts/storage-schema.md`'s test obligation

### Content-script DOM engine (`apps/extension/lib/dom`)

- [ ] T013 [P] Implement paragraph parser in `apps/extension/lib/dom/paragraph-parser.ts`: deepest-block text-node eligible-block detection (`p`, `article div`, `li`) scoped to the page's `article`/main-content root, excluding teaser/paywall containers, min-length filter — per `research.md` §2 and `docs/spike-snippet.js`
- [ ] T014 Implement substitution/restoration engine in `apps/extension/lib/dom/substitution.ts`: `WeakMap<Element, {originalHtml, contentHash, displayState}>` per `data-model.md` Paragraph entity, `applyVariant(el, variantHtml)` and `restoreOriginal(el)` functions that save `innerHTML` exactly once on first click and restore verbatim on second click (depends on T013 for element selection)

### Background worker skeleton (`apps/extension/entrypoints`, `apps/extension/lib/storage`)

- [ ] T015 [P] Implement `chrome.storage.local` access module in `apps/extension/lib/storage/settings.ts`: typed get/set for `LearnerSettings` and `Record<hostname, SiteRule>` keys, validated against T008 schemas on read/write, per `contracts/storage-schema.md` key table
- [ ] T016 [P] Implement `chrome.storage.local` access module in `apps/extension/lib/storage/progress.ts`: typed get/set for `Record<vocabId, VocabularyItem>`, `Record<vocabId, ReviewQueueEntry>`, and singleton `ProgressProfile` keys, validated against T008 schemas on read/write
- [ ] T017 Implement IndexedDB content-cache wrapper in `apps/extension/lib/storage/content-cache.ts`: `variants`, `exercises`, `ttsAudio` object stores keyed by `${contentHash}:${level}:${topic}[:rate]` via the `idb` package, per `contracts/storage-schema.md` IndexedDB table (depends on T008 for `GermanVariant`/`Exercise` schemas)
- [ ] T018 Implement the background message router in `apps/extension/entrypoints/background.ts`: `chrome.runtime.onMessage` listener that parses every inbound message against T009's schema (typed error to sender on parse failure, never a silent drop), with a `switch` on `type` dispatching to stub handlers for each message from `contracts/messaging-contract.md` (depends on T009, T015, T016, T017)
- [ ] T019 Implement `STORAGE_CHANGED` broadcast in `apps/extension/entrypoints/background.ts`: wrap `chrome.storage.onChanged` and re-broadcast a `{type: 'STORAGE_CHANGED', slice}` message to all contexts on writes from T015/T016 (depends on T018)

**Checkpoint**: Shared schemas exist and round-trip-test green; background worker boots, routes typed messages, and can read/write both storage tiers. No user-visible behavior yet — this is pure plumbing every story below builds on.

---

## Phase 3: User Story 1 - Read the article in German (Priority: P1) 🎯 MVP

**Goal**: On an enabled site, clicking an eligible paragraph replaces it in place with a German version at the learner's level with marked vocabulary; clicking again restores it byte-identical to the original.

**Independent Test**: On an enabled site, click a single paragraph and verify it is replaced with a German version with marked vocabulary; click it again and verify the DOM is byte-identical to its state before the first click; verify no other paragraph on the page changed.

### Tests for User Story 1

- [ ] T020 [P] [US1] Unit tests for the paragraph parser in `apps/extension/tests/unit/paragraph-parser.test.ts`: fixture HTML strings covering plain text, links, inline bold/italic, nested list items, and the two known false positives from the spike (tagesschau.de related-article card, Medium paywall CTA) — assert correct eligible-block selection and exclusion
- [ ] T021 [P] [US1] Playwright integration test in `apps/extension/tests/integration/substitution-restoration.spec.ts`: load the unpacked extension against fixture markup patterns (plain paragraph, paragraph with links, paragraph with inline bold/italic, nested list item per `quickstart.md`), click → assert replaced content + marked vocabulary spans, click again → assert `outerHTML` equality with pre-click snapshot, assert sibling paragraphs are untouched

### Implementation for User Story 1

- [ ] T022 [P] [US1] Implement content-hash utility in `apps/extension/lib/dom/content-hash.ts`: deterministic hash of a paragraph's extracted plain text, used as the cache key into IndexedDB (per `data-model.md` Paragraph.contentHash)
- [ ] T023 [US1] Wire click handling in `apps/extension/entrypoints/content/index.ts`: attach click listeners to parser-eligible blocks (T013), on click send `TRANSLATE_PARAGRAPH` (contentHash from T022, extracted text, current level/topic) to background, on response call `applyVariant` (T014); on click of an already-translated paragraph call `restoreOriginal` (T014) instead of re-sending a message (depends on T013, T014, T022)
- [ ] T024 [US1] Implement `TRANSLATE_PARAGRAPH` handler in `apps/extension/entrypoints/background.ts`: check IndexedDB cache (T017) by `contentHash:level:topic` first; on miss, POST to CMS `/api/translate` (validated against T010's schema), write result to cache, generate exercises via a call to `/api/exercises` (also cached), return `{ok: true, variant, exercises}`; on fetch/validation failure with no cache, return `{ok: false, reason: 'fetch-failed'}`; when offline with no cache, return `{ok: false, reason: 'offline-no-cache'}` (depends on T017, T018, contracts from T009/T010)
- [ ] T025 [US1] Implement German-variant rendering in `apps/extension/entrypoints/content/index.ts` (or a small `apps/extension/lib/dom/render-variant.ts` helper): render the returned `GermanVariant.text` safe-HTML-subset fragment at the paragraph's own font-size/line-height, wrapping `markedVocab` character-offset spans in a visually distinct (but not default-revealing) inline element (depends on T023, T024)
- [ ] T026 [US1] Implement on-demand vocabulary reveal in `apps/extension/entrypoints/content/index.ts`: clicking/tapping a marked vocabulary span reveals its Russian meaning (from the `GermanVariant.markedVocab` → vocab lookup) in a small inline tooltip/popover, hidden by default (Acceptance Scenario 1.4, FR-006) (depends on T025)
- [ ] T027 [US1] Implement inline error state for failed translation in `apps/extension/entrypoints/content/index.ts`: on `{ok: false}` response from `TRANSLATE_PARAGRAPH`, leave the paragraph in its original state and render a dismissible inline error message in place, without disabling future click attempts (FR-018, Edge Case) (depends on T023, T024)
- [ ] T028 [US1] Implement per-site gating on the content-script entry: on load, send `GET_SITE_STATUS` for `location.hostname`; only attach click handlers from T023 if the response is `enabled` (depends on T018, T023) — full site-enable UX is User Story 4, but the gate itself must exist for US1's "no other paragraph changes on a disabled site" guarantee to hold from the start

**Checkpoint**: User Story 1 is fully functional and independently testable — an enabled site's paragraphs translate and restore with full fidelity, matching the Independent Test above.

---

## Phase 4: User Story 2 - Practice with exercises from that paragraph (Priority: P2)

**Goal**: After translating a paragraph, the right-edge panel shows up to 4 exercise kinds built from that paragraph's own content, with lenient answer matching, explanatory feedback, and collapse/reopen state persistence.

**Independent Test**: Given a paragraph already translated (per Story 1), open the panel and verify it shows exercises whose content is traceable to that paragraph; submit correct and incorrect answers for each of the four exercise kinds and verify feedback and lenient matching behavior.

### Tests for User Story 2

- [ ] T029 [P] [US2] Unit tests for answer normalization in `apps/extension/tests/unit/match.test.ts`: table-driven cases for case-insensitivity, punctuation stripping, whitespace collapsing, and bidirectional umlaut/eszett transliteration (ä/ae, ö/oe, ü/ue, ß/ss), per `research.md` §5 and SC-004
- [ ] T030 [P] [US2] Playwright integration test in `apps/extension/tests/integration/exercise-panel.spec.ts`: translate a paragraph, open the panel, assert every rendered exercise's content is traceable to the source paragraph, submit a transliterated-umlaut fill-blank answer and assert acceptance, submit a wrong answer and assert feedback quotes the source sentence, collapse mid-exercise and reopen and assert state preserved

### Implementation for User Story 2

- [ ] T031 [P] [US2] Implement lenient answer matcher in `apps/extension/lib/exercises/match.ts`: normalize (lowercase → strip `.,!?;:()"'` → collapse/trim whitespace → apply umlaut/eszett map both directions) then compare submitted vs. expected, per `research.md` §5
- [ ] T032 [US2] Implement exercise generation orchestration in `apps/extension/entrypoints/background.ts` (extends T024's `TRANSLATE_PARAGRAPH` handler): call CMS `/api/exercises` with the variant text + marked vocab, validate response against T010's schema (0–4 kind-discriminated entries), map to the `Exercise` shape from `data-model.md` (id, sourceParagraphHash, sourceSentence, prompt, correctAnswer, answered: false, lastAttempt: null), cache in IndexedDB alongside the variant (depends on T024, T017)
- [ ] T033 [US2] Mount the Shadow-DOM right-edge panel in `apps/extension/entrypoints/content/index.ts` using WXT's `createShadowRootUi` with `cssInjectionMode: 'ui'` (per `research.md` §1), rendering the `overlay/` React tree; panel receives the current exercise set from the most recent `TRANSLATE_PARAGRAPH` response (depends on T025)
- [ ] T034 [P] [US2] Implement fill-in-the-blank exercise card in `apps/extension/entrypoints/content/overlay/FillBlankCard.tsx`: renders `blankedSentence` with an input, on submit sends `SUBMIT_EXERCISE_ATTEMPT` to background, shows immediate feedback referencing `sourceSentence` on a wrong answer (depends on T033)
- [ ] T035 [P] [US2] Implement multiple-choice exercise card in `apps/extension/entrypoints/content/overlay/MultipleChoiceCard.tsx`: renders `options`, on selection visually indicates both the chosen and correct option, sends `SUBMIT_EXERCISE_ATTEMPT` (depends on T033)
- [ ] T036 [P] [US2] Implement word-pairing exercise card in `apps/extension/entrypoints/content/overlay/WordPairingCard.tsx`: renders German/Russian word columns; selecting a Russian word before a German word prompts to choose German first without registering an attempt; on a valid German→Russian pair selection, sends `SUBMIT_EXERCISE_ATTEMPT` (depends on T033)
- [ ] T037 [P] [US2] Implement audio-dictation exercise card in `apps/extension/entrypoints/content/overlay/AudioDictationCard.tsx`: play button requests TTS audio (via a new `PLAY_TTS`-style path or lazily through background — see T038), typed-answer input reuses the same lenient matching as fill-blank, sends `SUBMIT_EXERCISE_ATTEMPT` (depends on T033, T038)
- [ ] T038 [US2] Implement TTS fetch-and-fallback in `apps/extension/entrypoints/background.ts` + `apps/extension/entrypoints/content/overlay/AudioDictationCard.tsx`: background requests `/api/tts`, caches the returned blob in IndexedDB (`ttsAudio` store); if the request fails or the device is offline with nothing cached, content-side falls back to `SpeechSynthesisUtterance` (`lang: 'de-DE'`, rate 0.95/0.6) wrapped in try/catch, per `research.md` §8 (depends on T017)
- [ ] T039 [US2] Implement `SUBMIT_EXERCISE_ATTEMPT` handler in `apps/extension/entrypoints/background.ts`: run T031's matcher, mark the in-memory `Exercise.answered`/`lastAttempt`, return `{ok: true, correct, updatedProgress}` (progress-update body itself implemented in US3; this task wires the message contract and lenient-match result) (depends on T018, T031, T032)
- [ ] T040 [US2] Implement panel collapse/expand with pending-count badge in `apps/extension/entrypoints/content/overlay/Panel.tsx`: collapsible to a narrow edge tab showing count of `!answered` exercises; reopening renders the exact same exercise/card state (answered flags, `lastAttempt`, in-progress input preserved in component state, not reset) (depends on T033–T037)
- [ ] T041 [US2] Implement panel replacement-on-new-translation behavior in `apps/extension/entrypoints/content/index.ts`: translating a second paragraph while the panel holds a first paragraph's exercises discards the unanswered set entirely and replaces panel contents with the new paragraph's exercises (FR-007, 2026-08-10 clarification) (depends on T033, T023)

**Checkpoint**: User Stories 1 AND 2 both work independently — translated paragraphs produce a working, stateful exercise panel with lenient matching and explanatory feedback.

---

## Phase 5: User Story 3 - See progress update from what was practiced (Priority: P3)

**Goal**: Solving an exercise updates streak, active vocabulary, per-topic accuracy, and the SRS review queue, visible without navigating away.

**Independent Test**: Solve one exercise of each kind and verify, without navigating away, that streak/vocabulary/accuracy counters change accordingly, and involved words appear in the review queue with an updated due state.

### Tests for User Story 3

- [ ] T042 [P] [US3] Unit tests for the SRS scheduler in `apps/extension/tests/unit/scheduler.test.ts`: correct-answer interval progression (1 → 6 → ×2.5-ish, capped) and repetitions increment; incorrect-answer reset to `repetitions: 0, intervalDays: 1`; due-date computed from local-calendar-day, per `research.md` §6
- [ ] T043 [P] [US3] Unit tests for streak logic in `apps/extension/tests/unit/progress.test.ts`: streak increments exactly once on first solve of a new local date, resets to 0 (then 1) when `lastSolvedLocalDate` is more than one local day before today, `solvedTodayCount` rollover at local midnight, per `data-model.md` Progress Profile validation rules and Acceptance Scenario 3.2
- [ ] T044 [P] [US3] Playwright integration test in `apps/extension/tests/integration/progress-update.spec.ts`: solve one exercise of each kind, open the options Progress view without reloading, assert streak/active-vocab/per-topic-accuracy counters updated and the involved word appears in the review queue with a future due date

### Implementation for User Story 3

- [ ] T045 [P] [US3] Implement the SM-2-style scheduler in `apps/extension/lib/srs/scheduler.ts`: pure function `advance(entry: ReviewQueueEntry, correct: boolean, today: LocalDate): ReviewQueueEntry` per `research.md` §6 and `data-model.md` Review Queue Entry state transitions
- [ ] T046 [US3] Implement Progress Profile update logic in `apps/extension/lib/storage/progress.ts` (extends T016): `recordAttempt(attempt: {correct, affectedVocabIds, topic, timestamp})` that upserts `VocabularyItem.encounterCount`/`status`, applies T045's scheduler to each affected `ReviewQueueEntry`, updates `topicAccuracy[topic]`, and applies streak/`solvedTodayCount` logic against the device's local calendar day (depends on T045, T016)
- [ ] T047 [US3] Wire `SUBMIT_EXERCISE_ATTEMPT` in `apps/extension/entrypoints/background.ts` to call T046's `recordAttempt` and return the fresh `ProgressProfile` in the response, and broadcast `STORAGE_CHANGED` (slice: `progress`) via T019 (depends on T039, T046, T019)
- [ ] T048 [US3] Implement `GET_PROGRESS_SNAPSHOT` handler in `apps/extension/entrypoints/background.ts`: returns `{profile, vocab, reviewQueue}` read via T015/T016 (depends on T018, T016)
- [ ] T049 [P] [US3] Implement the options-page Progress view in `apps/extension/entrypoints/options/ProgressView.tsx`: streak, active vocabulary count, per-topic accuracy, review queue listing, driven by `GET_PROGRESS_SNAPSHOT` and live-updated on `STORAGE_CHANGED` (slice: `progress`) (depends on T048)
- [ ] T050 [US3] Reflect encounter-once-per-paragraph rule in exercise submission handling in `apps/extension/entrypoints/background.ts`: a vocabulary word appearing multiple times in one paragraph counts once per paragraph toward `encounterCount`, per Edge Case (depends on T046)

**Checkpoint**: User Stories 1, 2, and 3 all work independently — the full read → practice → progress loop is live.

---

## Phase 6: User Story 4 - Turn practice on for a site and set how it behaves (Priority: P4)

**Goal**: Nothing is touched on a site until the learner explicitly enables it; level/topic/translation-density settings are configurable and apply to subsequently translated paragraphs.

**Independent Test**: Visit a never-enabled site and confirm no paragraph is clickable/modified; enable it and confirm paragraphs become interactive; change level/topic/density and confirm subsequently translated paragraphs reflect the new settings.

### Tests for User Story 4

- [ ] T051 [P] [US4] Playwright integration test in `apps/extension/tests/integration/site-gating.spec.ts`: fresh install on a fixture site — assert no paragraph responds to hover/click and no DOM mutation occurs; toggle on via a simulated popup message — assert paragraphs become click targets on reload; toggle off — assert any translated paragraph reverts to original markup (Acceptance Scenario 4.3)
- [ ] T052 [P] [US4] Playwright integration test in `apps/extension/tests/integration/revoked-permission.spec.ts`: simulate `chrome.permissions.contains` returning false for a previously `enabled` Site Rule — assert the site behaves as disabled on next load, per Edge Case and `data-model.md` Site Rule validation rules

### Implementation for User Story 4

- [ ] T053 [US4] Implement `SET_SITE_STATUS` handler in `apps/extension/entrypoints/background.ts`: on `status: 'enabled'`, call `chrome.permissions.request` for the hostname's origin (the explicit user gesture); on grant, write `SiteRule{status: 'enabled', grantedPermissionOrigin}` via T015; on decline, return `{ok: false, reason: 'permission-denied'}` and leave the stored rule `disabled`/`undecided`; on `status: 'disabled'`, write the rule and (if content script is live on matching tabs) trigger restoration of any translated paragraphs (depends on T015, T018)
- [ ] T054 [US4] Harden `GET_SITE_STATUS` in `apps/extension/entrypoints/background.ts` (extends T028's dependency): before returning `enabled`, re-verify via `chrome.permissions.contains`; if false, treat as disabled for this response without necessarily rewriting the stored Site Rule (Edge Case, `data-model.md` Site Rule validation) (depends on T015, T018)
- [ ] T055 [US4] Implement full site-disable restoration flow in `apps/extension/entrypoints/content/index.ts`: on receiving a disable signal (via `STORAGE_CHANGED` slice `siteRules`, or on next load per T054), call `restoreOriginal` (T014) on every currently-translated paragraph and detach click handlers, leaving the page exactly as untouched (Acceptance Scenario 4.3) (depends on T014, T028, T019)
- [ ] T056 [P] [US4] Implement the popup UI in `apps/extension/entrypoints/popup/App.tsx`: site-enable/disable toggle for the current tab's hostname (sends `SET_SITE_STATUS`/`GET_SITE_STATUS`), today's solved-exercise count (from `GET_PROGRESS_SNAPSHOT`), per design handoff popup surface (depends on T053, T054, T048)
- [ ] T057 [US4] Implement `GET_LEARNER_SETTINGS`/`SET_LEARNER_SETTINGS` handlers in `apps/extension/entrypoints/background.ts`: read/write `LearnerSettings` via T015, broadcast `STORAGE_CHANGED` (slice: `settings`) on write; explicitly does not touch already-cached `GermanVariant`/`Exercise` entries (Assumptions — no retroactive retranslation) (depends on T015, T018, T019)
- [ ] T058 [P] [US4] Implement the options-page Settings view in `apps/extension/entrypoints/options/SettingsView.tsx`: level, current grammar topic, translation-density controls, driven by `GET_LEARNER_SETTINGS`/`SET_LEARNER_SETTINGS` (depends on T057)
- [ ] T059 [P] [US4] Implement the options-page Site Rules view in `apps/extension/entrypoints/options/SiteRulesView.tsx`: lists known `SiteRule` entries with enable/disable controls mirroring the popup toggle, per design handoff options surface (depends on T053, T054)
- [ ] T060 [US4] Apply translation-density to paragraph eligibility in `apps/extension/lib/dom/paragraph-parser.ts` (extends T013): `low`/`medium`/`max` density caps how many paragraphs on a page are simultaneously eligible/clickable, read from `LearnerSettings` at content-script load (depends on T013, T057)
- [ ] T061 [US4] Thread current `LearnerSettings.level`/`currentTopic` into `TRANSLATE_PARAGRAPH` requests in `apps/extension/entrypoints/content/index.ts` (extends T023): read settings before each click-triggered request so subsequently translated paragraphs reflect the latest values (Acceptance Scenario 4.4) (depends on T023, T057)

**Checkpoint**: User Stories 1–4 all work independently — the consent/configuration gate fully controls when and how the rest of the product activates.

---

## Phase 7: User Story 5 - Keep reading and practicing while offline (Priority: P5)

**Goal**: Previously translated paragraphs, their exercises, and vocabulary/progress remain fully usable offline; never-cached paragraphs show a clear "unavailable offline" state.

**Independent Test**: With the device offline, revisit an article containing a previously translated paragraph and confirm translation/exercises/vocabulary lookups still work; confirm a never-translated paragraph shows "unavailable offline" rather than failing silently.

### Tests for User Story 5

- [ ] T062 [P] [US5] Playwright integration test in `apps/extension/tests/integration/offline.spec.ts`: online, translate a paragraph and solve an exercise; go offline (CDP network conditions/context offline mode); reload, revisit and click the same paragraph — assert the cached German version and exercises appear and remain answerable, and progress updates still apply locally; click a never-translated paragraph — assert a distinct "unavailable offline" message (not the generic `fetch-failed` error) appears in place

### Implementation for User Story 5

- [ ] T063 [US5] Differentiate offline-vs-fetch-failure in `apps/extension/entrypoints/background.ts`'s `TRANSLATE_PARAGRAPH` handler (extends T024): detect offline state (`navigator.onLine` / failed-fetch classification) when no cache entry exists and return `{ok: false, reason: 'offline-no-cache'}` distinctly from `{ok: false, reason: 'fetch-failed'}` (depends on T024)
- [ ] T064 [US5] Implement the distinct "unavailable offline" inline UI in `apps/extension/entrypoints/content/index.ts` (extends T027): render a specific "translation unavailable offline" message (not the generic inline error) when the response `reason` is `offline-no-cache` (depends on T027, T063)
- [ ] T065 [US5] Confirm and, if needed, adjust exercise-answer offline path: verify `SUBMIT_EXERCISE_ATTEMPT` (T039/T047) requires no network call — matching (T031) and progress updates (T046) are fully local/synchronous — since exercises are already in memory/IndexedDB once generated (depends on T039, T047)
- [ ] T066 [US5] Verify and, if needed, adjust vocabulary-reveal (T026) and TTS playback (T038) offline paths: confirm on-demand Russian-meaning reveal never requires network (data is already in the cached `GermanVariant`/vocab record), and confirm TTS falls back to `SpeechSynthesisUtterance` cleanly when the audio blob isn't cached and the device is offline (depends on T026, T038)

**Checkpoint**: All five user stories are independently functional — the complete offline-first guarantee holds across translation, exercises, and progress.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements spanning multiple stories; final constitution/quickstart validation.

- [ ] T067 [P] Implement Host Page Integrity regression coverage in `apps/extension/tests/integration/host-rerender.spec.ts`: simulate a client-side framework replacing the DOM subtree containing a translated paragraph — assert no throw, no corrupted surrounding content, no orphaned German node, and the paragraph is treated as fresh/untranslated on next click (Edge Case)
- [ ] T068 [P] Implement partial-exercise-set coverage in `apps/extension/tests/integration/short-paragraph.spec.ts`: a short/low-vocabulary paragraph yields fewer than 4 exercise cards (never a malformed/empty card) and still shows the German translation (Edge Case)
- [ ] T069 [P] Add loading/performance safeguards: verify `TRANSLATE_PARAGRAPH` request/response path never blocks the main thread synchronously (message-based only, per `research.md` §1 Post-Design Re-Check) and that TTS audio is fetched lazily on first play only, never prefetched (`apps/extension/lib/storage/content-cache.ts`, `apps/extension/entrypoints/background.ts`)
- [ ] T070 Run full `quickstart.md` manual scenario walkthrough end-to-end (per-site gate → translate/restore → exercises → progress → offline → revoked permission) against a real Chrome load of `apps/extension/.output/chrome-mv3/`, fixing any gaps found
- [ ] T071 Re-verify the Constitution Check table in `plan.md` (all 8 principles) against the finished implementation and record any deviations as Complexity Tracking entries in `plan.md` if found (expected: none)
- [ ] T072 [P] Code cleanup pass: remove any dead code/unused exports across `apps/extension` and `packages/shared`, confirm no `any` at any schema boundary (`packages/shared/src/schemas/*.ts`), per Constitution V

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (schemas, storage modules, and the message router are load-bearing for every story below)
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on Foundational; depends on US1 for a translated paragraph to exist before exercises can populate (T032 extends T024; T041 extends T023) — not independently deployable before US1, though its own tests are scoped to exercise behavior only
- **User Story 3 (Phase 5)**: Depends on Foundational; depends on US2's `SUBMIT_EXERCISE_ATTEMPT` wiring (T039) to attach progress updates to (T047 extends T039)
- **User Story 4 (Phase 6)**: Depends on Foundational only for its own gating logic (T053/T054 are new handlers); T054 hardens the stub gate US1 already used in T028, and T060/T061 extend US1's parser/click-handler — apply after US1 exists, but the consent gate itself has no functional dependency on US2/US3
- **User Story 5 (Phase 7)**: Depends on US1 (T024/T027 extended) and US2/US3 (T039/T047 verified) having produced cacheable content and local-only attempt handling
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### Within Each User Story

- Tests before implementation (write first, confirm failing, per Constitution VI)
- Parser/matcher/scheduler (pure logic) before the handlers and UI that call them
- Background message handlers before the content-script/UI code that calls them
- Story complete and checkpoint-verified before moving to the next priority

### Parallel Opportunities

- All Setup tasks marked [P] (T004–T006) run in parallel once T001–T003 land
- T008/T009/T010 (three separate schema files) run in parallel; T013 (parser) and T015/T016 (storage modules) run in parallel with each other and with the schema tasks
- Within US1: T020/T021 (tests) in parallel; T022 in parallel with the test tasks
- Within US2: T029/T030 (tests) in parallel; T034–T037 (four independent exercise card components) fully in parallel once T033 (panel mount) lands
- Within US3: T042/T043/T044 (tests) in parallel; T045 in parallel with the test tasks
- Within US4: T051/T052 (tests) in parallel; T056/T058/T059 (three independent UI surfaces) in parallel once their respective handler dependencies land
- Within Phase 8: T067/T068/T069/T072 in parallel

---

## Parallel Example: User Story 2

```bash
# Launch both integration/unit tests for User Story 2 together:
Task: "Unit tests for answer normalization in apps/extension/tests/unit/match.test.ts"
Task: "Playwright integration test in apps/extension/tests/integration/exercise-panel.spec.ts"

# Once the panel is mounted (T033), launch all four exercise cards together:
Task: "Fill-in-the-blank exercise card in apps/extension/entrypoints/content/overlay/FillBlankCard.tsx"
Task: "Multiple-choice exercise card in apps/extension/entrypoints/content/overlay/MultipleChoiceCard.tsx"
Task: "Word-pairing exercise card in apps/extension/entrypoints/content/overlay/WordPairingCard.tsx"
Task: "Audio-dictation exercise card in apps/extension/entrypoints/content/overlay/AudioDictationCard.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (schemas, storage, message router — CRITICAL, blocks everything)
3. Complete Phase 3: User Story 1 (translate/restore with marked vocabulary)
4. **STOP and VALIDATE**: run T020/T021, then the "Translate and restore" manual scenario from `quickstart.md`
5. Demo: click-to-translate reading works end-to-end on a real site

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add US1 → validate independently → demo (MVP!)
3. Add US2 → validate independently → demo (reading + practice loop)
4. Add US3 → validate independently → demo (progress feedback closes the loop)
5. Add US4 → validate independently → demo (consent/config gate — note: US4's gate stub (T028) is already present from US1 for safety; US4 completes the full toggle UX)
6. Add US5 → validate independently → demo (offline resilience)
7. Phase 8: polish, full quickstart run, constitution re-check

### Suggested MVP Scope

User Story 1 alone (Phases 1–3) is the MVP: a learner can click a paragraph, see it translated with marked vocabulary, and restore it perfectly. This is explicitly named as the foundational value in spec.md's User Story 1 rationale — every other capability depends on it.

---

## Notes

- [P] tasks touch different files with no unmet dependency — safe to parallelize
- [Story] labels map every user-story-phase task to its spec.md story for traceability
- US1's site-gate stub (T028) exists early for safety (US1's own Independent Test requires "no other paragraph changed" to hold even pre-US4); US4 (T053–T054) completes the real enable/disable UX and permission lifecycle
- Verify tests fail before implementing (Constitution VI: "every bug fix starts with a failing test" — extended here to every new capability)
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before continuing
- Avoid: vague tasks, same-file conflicts inside a parallel batch, cross-story dependencies that break independent testability beyond the sequencing noted above
