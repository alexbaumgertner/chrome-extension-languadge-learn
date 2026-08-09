# Phase 1 Data Model: In-Page Reading Practice

Entities below map 1:1 to the spec's Key Entities section. Each is a Zod schema in `packages/shared/src/schemas/` (persisted ones in a `storage.ts` schema module, transient in-page ones live only as TS types in `apps/extension`). Storage column notes which persistence tier owns the record (per `research.md` §3).

## Paragraph *(in-page, transient — not persisted)*

Represents a currently-tracked clickable block in the live DOM. Not itself stored; identity lives only in a content-script-local `WeakMap<Element, ParagraphState>` for the lifetime of the page.

| Field | Type | Notes |
|---|---|---|
| element | `Element` (not serialized) | the live DOM node; map key, not a field |
| originalHtml | `string` | exact `innerHTML` snapshot taken before first substitution, used for restoration |
| contentHash | `string` | hash of extracted plain text, used as the cache key into IndexedDB content-cache |
| displayState | `'original' \| 'translated'` | toggled on each click |

**Validation rules**: `originalHtml` is captured exactly once, on first click, and never overwritten while `displayState === 'translated'`. A host-driven DOM replacement of the element invalidates the `WeakMap` entry automatically (garbage collected with the old node) — per Edge Case, the paragraph is then treated as fresh/untranslated, no explicit invalidation logic needed.

**State transitions**: `original → translated` (on click, if a variant can be produced) → `original` (on second click, restore). A failed translation attempt leaves `displayState` at `original` and does not create a `WeakMap` entry.

## German Variant *(IndexedDB — content cache)*

| Field | Type | Notes |
|---|---|---|
| id | `string` | `${contentHash}:${level}:${topic}` |
| contentHash | `string` | FK-equivalent to the source paragraph's extracted text hash |
| level | `'A1-A2' \| 'B1-B2' \| 'C1+'` | learner level at generation time |
| text | `string` | German HTML fragment (safe subset: text + `<strong>`/`<em>`/marked-vocab spans only — no arbitrary host markup is ever re-injected as German content) |
| markedVocab | `Array<{ start: number; end: number; vocabId: string }>` | character offsets into `text` for target-vocabulary spans |
| fetchedAt | `number` (epoch ms) | for cache-freshness/debugging, not used for expiry (offline-first: cached entries never auto-expire) |

**Validation rules**: `markedVocab` offsets MUST be within `text` bounds and non-overlapping (Zod `.refine`). `level`/`topic` MUST match the current Learner Settings enum values.

## Vocabulary Item *(chrome.storage.local)*

| Field | Type | Notes |
|---|---|---|
| id | `string` | stable id (e.g. normalized German lemma) |
| german | `string` | |
| russian | `string` | meaning shown on demand |
| encounterCount | `number` | incremented once per paragraph where it's marked (not per occurrence — Edge Case rule) |
| status | `'new' \| 'active' \| 'due' \| 'learned'` | derived display status; `due` is derived from the linked Review Queue Entry's due date at read time, not stored redundantly — kept here only if a denormalized read-path proves necessary; default to computing from Review Queue Entry |
| firstEncounteredAt | `number` (epoch ms) | |

**Validation rules**: `id` uniqueness enforced at write time (upsert by id). `encounterCount` only increments when a paragraph containing this vocab is translated for the first time in that paragraph's session (not per repeated view).

## Exercise *(in-page/session, transient — not persisted)*

Generated fresh per paragraph translation; discarded (not archived) when a new paragraph replaces the panel's contents, per FR-007 and the 2026-08-10 clarification.

| Field | Type | Notes |
|---|---|---|
| id | `string` | unique per generation |
| kind | `'fill-blank' \| 'multiple-choice' \| 'word-pairing' \| 'audio-dictation'` | |
| sourceParagraphHash | `string` | traceability back to the paragraph (Acceptance Scenario 2.1) |
| sourceSentence | `string` | verbatim sentence used, referenced in wrong-answer feedback (FR-010) |
| prompt | kind-specific: `{ blankedSentence, options? , pairs?, audioSentence? }` | |
| correctAnswer | kind-specific | e.g. string for fill-blank/dictation, index for multiple-choice, mapping for word-pairing |
| answered | `boolean` | |
| lastAttempt | `ExerciseAttempt \| null` | preserved across panel collapse/reopen (FR-012) |

**Validation rules**: A paragraph that cannot support all 4 kinds yields fewer Exercise records, never a malformed/empty one (Edge Case). `sourceSentence` MUST be a verbatim substring of the German Variant's `text` for fill-blank/audio-dictation.

## Exercise Attempt *(chrome.storage.local, append-informs-aggregate — not stored as a full log)*

Only the *effect* of an attempt is persisted (updates to Vocabulary Item, Review Queue Entry, Progress Profile); the attempt record itself lives on the in-session `Exercise.lastAttempt` for UI state, not as a durable log, per Constitution VII (no speculative history feature the spec doesn't ask for).

| Field | Type | Notes |
|---|---|---|
| exerciseId | `string` | |
| submittedAnswer | `string \| number \| Record<...>` | kind-specific raw input |
| correct | `boolean` | after lenient matching (research.md §5) |
| affectedVocabIds | `string[]` | |
| topic | `string` | current grammar topic at time of attempt, for per-topic accuracy |
| timestamp | `number` (epoch ms) | used to resolve the local-calendar-day for streak purposes |

## Progress Profile *(chrome.storage.local, singleton)*

| Field | Type | Notes |
|---|---|---|
| currentStreak | `number` | consecutive local-calendar-days with ≥1 solved exercise |
| lastSolvedLocalDate | `string` (`YYYY-MM-DD`, local) | drives streak increment/reset logic |
| activeVocabCount | `number` | derived count of Vocabulary Items with status `active`/`due`/`learned`; recomputed on read or updated incrementally on write |
| topicAccuracy | `Record<string, { correct: number; total: number }>` | per-topic running tally |
| solvedTodayCount | `number` | resets at local-midnight rollover |

**Validation rules**: `currentStreak` increments by exactly 1 the first time `solvedTodayCount` goes from 0→1 on a new local date; resets to 0 (then to 1 on next solve) if `lastSolvedLocalDate` is more than one local day before today at read time (Acceptance Scenario 3.2).

## Review Queue Entry *(chrome.storage.local)*

| Field | Type | Notes |
|---|---|---|
| vocabId | `string` | FK to Vocabulary Item |
| repetitions | `number` | SM-2-style counter (research.md §6) |
| intervalDays | `number` | |
| dueDate | `string` (`YYYY-MM-DD`, local) | |

**State transitions**: correct attempt → `repetitions += 1`, `intervalDays` grows per SM-2-style curve, `dueDate = today + intervalDays`. Incorrect attempt → `repetitions = 0`, `intervalDays = 1`, `dueDate = tomorrow`.

## Site Rule *(chrome.storage.local)*

| Field | Type | Notes |
|---|---|---|
| hostname | `string` | |
| status | `'enabled' \| 'disabled' \| 'undecided'` | `undecided` is the implicit default for any hostname with no record — no record needs to be written until the learner acts |
| grantedPermissionOrigin | `string \| null` | the `optional_host_permissions` origin actually granted by Chrome, checked against `chrome.permissions.contains` on load to detect out-of-band revocation (Edge Case) |

**Validation rules**: `status === 'enabled'` MUST correspond to a live Chrome permission grant for that origin, re-verified on every page load; if `chrome.permissions.contains` returns false for an `enabled` Site Rule, the extension treats the site as disabled for that load (Edge Case) without necessarily rewriting the stored record until the learner next opens the popup.

## Learner Settings *(chrome.storage.local, singleton)*

| Field | Type | Notes |
|---|---|---|
| level | `'A1-A2' \| 'B1-B2' \| 'C1+'` | |
| currentTopic | `string` | grammar topic id |
| translationDensity | `'low' \| 'medium' \| 'max'` | how much of a page may be translated at once |

**Validation rules**: Changing any field takes effect only for paragraphs translated *after* the change (Assumptions — no retroactive retranslation of already-translated paragraphs in the current page session).

## Relationships

```
Site Rule ──gates──> Paragraph (in-page)
Learner Settings ──parameterizes──> German Variant, Exercise generation
Paragraph ──translated into──> German Variant ──contains──> marked Vocabulary Item spans
German Variant ──source for──> Exercise (0–4 per paragraph)
Exercise Attempt ──updates──> Vocabulary Item, Review Queue Entry, Progress Profile
Vocabulary Item ──1:1──> Review Queue Entry
```
