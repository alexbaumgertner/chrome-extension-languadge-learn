# Backend Requirements Quality Checklist: Translation Backend

**Purpose**: Validate the quality (completeness, clarity, consistency, measurability) of the translation-backend requirements — focused on cost & caching economics, privacy & data minimization, resilience & failure handling, and security & response validation — before implementation proceeds.
**Created**: 2026-08-16
**Feature**: [spec.md](../spec.md)
**Depth**: Standard | **Audience/Timing**: Author, pre-implementation

**Note**: This checklist tests whether the *requirements are written well*, not whether the implementation works. Items ask "is this specified/clear/consistent?", not "does this behave correctly?"

## Requirement Completeness

- [ ] CHK001 Are requirements defined for what happens when the usage-ledger's allowance period rolls over mid-request (a request starts before rollover, completes after)? [Gap, Spec Edge Cases]
- [ ] CHK002 Are requirements defined for how the operator observes/reports cumulative usage (User Story 3 says "the operator can see," FR-009 says "track," but no observation interface/format is specified)? [Gap, Spec §FR-009]
- [ ] CHK003 Are requirements defined for the maximum vocabulary-span count per response, or is an unbounded list acceptable? [Gap, Spec §FR-002]
- [ ] CHK004 Is the character-length cap in FR-003a specified only as "a configured maximum" with no default/example value stated anywhere in the spec? [Completeness, Spec §FR-003a]
- [ ] CHK005 Are requirements defined for whether/how a cache entry could ever be corrected or invalidated after write, given "persist indefinitely, no eviction" (FR-004) allows no mechanism for fixing a bad-but-valid cached entry? [Gap, Spec §FR-004]

## Requirement Clarity

- [ ] CHK006 Is "clear, distinguishable result" for allowance exhaustion (FR-010, User Story 3) defined precisely enough to be distinguished from "clear failure result" for upstream failure (FR-011, User Story 4), or do both rely on the same vague adjective "clear"? [Clarity, Spec §FR-010, §FR-011]
- [ ] CHK007 Is "a normal page-interaction wait (a few seconds)" (SC-001) quantified with an exact upper-bound threshold, or left qualitative? [Clarity, Spec §SC-001]
- [ ] CHK008 Is "typical expected usage pattern (a small, steady population of learners...)" (SC-003) quantified with concrete traffic/volume numbers? [Clarity, Spec §SC-003]
- [ ] CHK009 Is "the external translation service is slow" (User Story 4 title/description) quantified with a threshold, or left to be inferred from SC-001's latency target? [Clarity, Spec User Story 4]
- [ ] CHK010 Does FR-004's whitespace normalization rule ("trimmed and collapsed") specify whether it covers only ASCII spaces or all Unicode whitespace/line-break variants, precisely enough for independent, identical implementation? [Clarity, Spec §FR-004, Session 2026-08-14 Q6]

## Requirement Consistency

- [x] CHK011 Does the spec's single "configured allowance" concept (FR-009, FR-010) stay internally consistent given the pipeline requires two distinct external calls (translation service + level-adaptation step, per Session 2026-08-14 Q1) that could plausibly have independent allowances? [Consistency, Spec §FR-009, §FR-010, Session 2026-08-14 Q1]
- [ ] CHK012 Are the three refusal/failure outcomes (validation failure FR-003/003a/003b, allowance-exhausted FR-010, upstream-failure FR-011) defined with non-overlapping trigger conditions throughout the spec? [Consistency, Spec §FR-003, §FR-010, §FR-011]
- [ ] CHK013 Is the Assumptions section's claim that "identical inputs always produce identical output" consistent with FR-005's cache-serving rule being based on exact text/level/topic match rather than any stated determinism guarantee as a functional requirement? [Consistency, Spec §FR-005, Assumptions]
- [ ] CHK014 Is FR-002's vocabulary-marking requirement worded to explicitly permit an empty `markedVocab` list as a valid success case, consistent with User Story 1 Acceptance Scenario 4? [Consistency, Spec §FR-002, User Story 1 Scenario 4]

## Cost & Caching Economics

- [ ] CHK015 Does FR-008's coalescing requirement specify what all coalesced concurrent callers receive if the shared in-flight pipeline run fails? [Gap, Spec §FR-008]
- [ ] CHK016 Are requirements defined for what happens if the allowance is reached *during* a pipeline run that already started (i.e., was permitted) before the allowance was hit? [Edge Case, Gap, Spec §FR-010]
- [x] CHK017 Does FR-010 specify whether "reached" is evaluated as "would this call exceed the allowance" (pre-check) or "has the allowance already been exceeded" (post-check), given FR-008 coalescing could make usage attribution timing-sensitive? [Ambiguity, Spec §FR-010, §FR-008]
- [ ] CHK018 Is SC-002's "at least 95%" cache-hit threshold traceable to a defined measurement window or population, or left unanchored? [Measurability, Spec §SC-002]
- [ ] CHK019 Does the Edge Cases section's question about allowance reset ("does usage tracking roll over cleanly with no manual intervention") have a corresponding functional requirement, or does it remain an open question with no FR resolving it? [Gap, Spec Edge Cases]
- [x] CHK020 Are requirements defined for whether the allowance period length/boundary (e.g., monthly) is itself a stated requirement, or only an unstated implementation default? [Gap, Spec Edge Cases, Assumptions]

## Security & Response Validation

- [ ] CHK021 Does the safe-subset HTML requirement (FR-001, FR-012) address malformed/unusual tag variants (self-closing, uppercase, unbalanced, nested) explicitly, or only the well-formed allowlisted case? [Clarity, Spec §FR-001, §FR-012]
- [x] CHK022 Does FR-012 specify behavior when a vocabulary span is structurally valid (`start < end <= text.length`) but its claimed `german` term doesn't actually match the substring at that position? [Gap, Spec §FR-012]
- [x] CHK023 Does FR-012 clarify whether a response with *some* valid spans and *some* invalid spans causes the whole response to be discarded, or only the invalid spans dropped — distinct from the legitimate all-empty case in User Story 1 Scenario 4? [Ambiguity, Spec §FR-012, User Story 1 Scenario 4]
- [ ] CHK024 Does the Edge Cases question about "content unsafe to render...in the paragraph text" input have a resolving functional requirement, or does it remain open with no FR addressing input-side sanitization responsibility? [Gap, Spec Edge Cases, Assumptions]
- [ ] CHK025 Is FR-012's validation requirement explicit about applying to every response path (including whether cached entries are re-validated on read), or only to freshly-generated pipeline output? [Clarity, Spec §FR-012, §FR-005]

## Privacy & Data Minimization

- [x] CHK026 Does FR-007's "MUST NOT persist or log any data beyond..." define what counts as a "log" precisely enough to cover infrastructure/access/error logs, not just application-level data logging? [Ambiguity, Spec §FR-007]
- [ ] CHK027 Does SC-005's verification method ("verifiable by inspecting stored cache entries") extend to covering logs and the usage ledger, or only the cache table? [Gap, Spec §SC-005, §FR-007]
- [ ] CHK028 Are requirements defined for whether error-response detail messages (FR-011's failure results) could leak paragraph text or upstream provider payloads? [Gap, Spec §FR-011, §FR-007]
- [ ] CHK029 Does FR-007's data-minimization requirement apply only to this backend's own persistence, or does it also constrain what's sent onward to the external translation service, given a two-step pipeline is implied (Session 2026-08-14 Q1)? [Ambiguity, Spec §FR-007, Session 2026-08-14 Q1]

## Resilience & Failure Handling

- [ ] CHK030 Given the pipeline involves two sequential external steps (translation + level-adaptation, Session 2026-08-14 Q1), does FR-011 distinguish a failure of the first step from a failure of the second, or treat "the external translation service" as a single undifferentiated dependency? [Ambiguity, Spec §FR-011, Session 2026-08-14 Q1]
- [x] CHK031 Are retry-vs-no-retry requirements stated for timeouts, separate from the eventual failure-result requirement (FR-011)? [Gap, Spec §FR-011]
- [ ] CHK032 Are requirements defined for partial degradation (one of the two external steps slow/unavailable while the other functions), or does the spec only address total unavailability? [Gap, Spec User Story 4, §FR-011]
- [x] CHK033 Is there a requirement covering backend-internal persistence unavailability (e.g., the cache/ledger store itself failing), distinct from external-service unreachability (FR-011 covers only the latter)? [Gap, Spec §FR-011]

## Acceptance Criteria Quality

- [ ] CHK034 Can SC-003's "zero unexpected charges" be objectively verified given FR-010 treats the allowance as a hard code-enforced cap — is the verification method (billing check vs. cap-enforcement test) specified? [Measurability, Spec §SC-003, §FR-010]
- [ ] CHK035 Do User Story 1's four acceptance scenarios verify FR-002 (vocabulary marking) independently of FR-001 (level-adapted rewrite), or do they conflate both requirements into shared scenarios? [Coverage, Spec User Story 1, §FR-001, §FR-002]

## Dependencies & Assumptions

- [ ] CHK036 Is the Assumption "identical inputs always produce identical output" flagged anywhere as unverified/unvalidated, with no fallback requirement if the underlying external services turn out to be non-deterministic? [Assumption, Spec Assumptions]
- [ ] CHK037 Is the dependency on the existing `POST /api/translate` response contract (spec 001) treated as immutable, given FR-001's safe-subset HTML requirement was added later via the Session 2026-08-15 clarification — is backward compatibility with spec 001's original contract explicitly addressed? [Assumption, Spec Assumptions, Clarifications Session 2026-08-15]

## Notes

- Generated per user-selected focus areas: cost & caching economics, privacy & data minimization, resilience & failure handling, security & response validation — at Standard depth, for the spec author reviewing pre-implementation.
- General spec-quality gates (no implementation leakage, testability, etc.) are already covered by `checklists/requirements.md`; this checklist does not duplicate those items.
