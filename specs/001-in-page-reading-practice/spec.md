# Feature Specification: In-Page Reading Practice

**Feature Branch**: `001-in-page-reading-practice`

**Created**: 2026-08-09

**Status**: Draft

**Input**: User description: "A Russian-speaking learner of German reads an article on a news site in Chrome, clicks a paragraph to see it rewritten in German at their level with target vocabulary marked, works exercises built from that paragraph in a right-edge panel, and has the results recorded against streak, active vocabulary, per-topic accuracy, and the spaced-repetition queue — scoped to the in-page reading/substitution experience, the exercise panel, progress recording, per-site enable/disable, and the settings that drive level, grammar topic, and translation density."

## Clarifications

### Session 2026-08-10

- Q: When the learner enables Sprachweise for a site, does that action also count as consent to send clicked-paragraph text off-device for translation, or is a separate consent step required the first time it happens? → A: Enabling the site is itself the explicit consent for sending clicked-paragraph text for translation — no separate prompt.
- Q: When a paragraph can't be translated at all (fetch fails, nothing cached), should it stay clickable with an inline error shown after the attempt, or be visually marked unavailable before the learner clicks? → A: Paragraphs stay clickable; if translation can't be produced, an inline error appears in place after the click attempt.
- Q: When the learner translates a second paragraph while the panel still shows exercises from a first, does the panel switch entirely to the new paragraph's exercises, or keep both available together? → A: Replace — the new paragraph's exercises replace whatever was in the panel, discarding unanswered exercises from the previous paragraph.
- Q: For streak purposes, what counts as a "day" — device's local calendar day, fixed UTC calendar day, or a rolling 24-hour window since last activity? → A: Device's local calendar day — streak counts one day per local midnight-to-midnight period with activity.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the article in German (Priority: P1)

A learner is reading an article in their normal browsing. They click a paragraph they want to practice; it is replaced, in place, by a German version written at their current level, with the words they're currently learning visually marked. Clicking the same paragraph again restores the original text exactly as it was — same formatting, same links, same inline markup — as if the extension had never touched it. No other part of the page changes.

**Why this priority**: This is the foundational value of the product — practicing on material the learner chose, without leaving the page. Every other capability (exercises, progress) depends on a paragraph having been translated first, and the reversibility guarantee is the trust foundation the rest of the product stands on.

**Independent Test**: On an enabled site, click a single paragraph and verify it is replaced with a German version with marked vocabulary; click it again and verify the DOM is byte-identical to its state before the first click. Verify no other paragraph on the page changed.

**Acceptance Scenarios**:

1. **Given** an article paragraph containing plain text, links, and inline formatting (bold/italic), **When** the learner clicks it, **Then** the paragraph is replaced by a German version at the learner's configured level, rendered at the paragraph's own size and line-height.
2. **Given** a paragraph currently showing its German version, **When** the learner clicks it again, **Then** the original markup is restored exactly, including links, inline formatting, and any attributes.
3. **Given** a translated paragraph, **When** the learner looks at it, **Then** words from their current vocabulary set are visually distinct from the surrounding text.
4. **Given** a translated paragraph, **When** the learner interacts with a marked vocabulary word, **Then** its Russian meaning is revealed on demand (not shown by default).
5. **Given** an article with multiple paragraphs, **When** the learner clicks only one of them, **Then** every other paragraph on the page remains unmodified, both in content and in markup.

---

### User Story 2 - Practice with exercises from that paragraph (Priority: P2)

Having translated a paragraph, the learner opens the panel at the right edge of the page and works through exercises built from the words and sentences of that same paragraph — not generic drill content. Each exercise gives immediate, explanatory feedback, and answers are matched leniently enough that minor typing differences don't count against the learner.

**Why this priority**: Translation alone is reading, not practice; the exercises are what turn the moment of reading into active recall and are the second half of the product's core loop.

**Independent Test**: Given a paragraph already translated (per Story 1), open the panel and verify it shows exercises whose content (words, sentences) is traceable to that paragraph; submit correct and incorrect answers for each of the four exercise kinds and verify feedback and lenient matching behavior.

**Acceptance Scenarios**:

1. **Given** a paragraph the learner just translated, **When** the panel populates, **Then** every exercise shown is built from words or sentences that appear in that paragraph.
2. **Given** a fill-in-the-blank exercise, **When** the learner submits an answer with different casing, surrounding punctuation, extra whitespace, or a transliterated umlaut (e.g. "moechte" for "möchte"), **Then** the answer is accepted as correct.
3. **Given** any exercise, **When** the learner submits a wrong answer, **Then** the feedback explains what was wrong and points back to the source sentence in the paragraph — never a bare "wrong" indicator.
4. **Given** a multiple-choice exercise, **When** the learner selects an option, **Then** the chosen option and the correct option are both visually indicated.
5. **Given** a word-pairing exercise, **When** the learner selects a Russian word before selecting a German word, **Then** the panel prompts them to choose the German word first, without registering an attempt.
6. **Given** an audio-dictation exercise, **When** the learner plays the audio, **Then** the sentence is spoken aloud, and typed answers are matched with the same leniency as fill-in-the-blank.
7. **Given** the panel is open with exercises pending, **When** the learner collapses it to the edge tab, **Then** the tab shows how many exercises are still pending.
8. **Given** the panel was collapsed mid-exercise, **When** the learner reopens it, **Then** every exercise is exactly as they left it — no answered exercise reverts to unanswered, no in-progress input is lost.

---

### User Story 3 - See progress update from what was practiced (Priority: P3)

Every exercise the learner completes updates their visible progress: their streak, the vocabulary now considered active, per-topic accuracy, and the review schedule for the specific words and sentence patterns involved.

**Why this priority**: Progress feedback is what sustains the habit over days and weeks; it depends on Stories 1 and 2 having produced at least one scored exercise, so it is correctly sequenced after them.

**Independent Test**: Solve one exercise of each kind and verify, without navigating away, that the streak/vocabulary/accuracy counters visible to the learner change accordingly, and that the involved words appear in the review queue with an updated due state.

**Acceptance Scenarios**:

1. **Given** a learner answers an exercise correctly for the first time, **When** the answer is submitted, **Then** the involved vocabulary is recorded as encountered and scheduled for future review.
2. **Given** a learner has solved at least one exercise during the current local calendar day, **When** they view their progress, **Then** the current streak reflects that day's activity; **Given** a full local calendar day passes with no solved exercise, **When** they next view their progress, **Then** the streak has reset.
3. **Given** exercises tagged to the learner's current grammar topic, **When** answers are submitted, **Then** the per-topic accuracy figure for that topic updates to include the new attempt.
4. **Given** a word already in the review queue, **When** the learner answers an exercise containing that word, **Then** its next scheduled review date changes according to whether the answer was correct or not.

---

### User Story 4 - Turn practice on for a site and set how it behaves (Priority: P4)

Before any of the above happens on a given site, the learner explicitly turns Sprachweise on for that site — nothing is touched until they do. They can also set their level, their current grammar topic, and how much of the page may be translated at once.

**Why this priority**: This is the consent and configuration gate around the whole feature; it is a hard constraint (no page is touched without an explicit per-site opt-in) and shapes every other story's preconditions, but by itself does not depend on any of them.

**Independent Test**: Visit a site where Sprachweise has never been enabled and confirm no paragraph is clickable and no page content is modified; enable it for that site and confirm paragraphs become interactive; change level/topic/translation-density settings and confirm subsequently translated paragraphs reflect the new settings.

**Acceptance Scenarios**:

1. **Given** a site the learner has never enabled Sprachweise for, **When** they browse an article on it, **Then** no paragraph is modified and no paragraph responds to clicks as a translation target.
2. **Given** a site where the learner turns Sprachweise on, **When** they return to reading, **Then** paragraphs become click targets and translation becomes available.
3. **Given** the learner disables Sprachweise for a site that had translated paragraphs, **When** the page is restored, **Then** every translated paragraph reverts to its original markup and the page is left exactly as it would be had the extension never run.
4. **Given** the learner changes their level, current grammar topic, or translation density in settings, **When** they next translate a paragraph, **Then** the German version and the exercises drawn from it reflect the newly chosen settings.

---

### User Story 5 - Keep reading and practicing while offline (Priority: P5)

A learner who has already translated paragraphs and worked exercises on previous visits can keep reading those same translations, replaying those exercises, and reviewing vocabulary even with no network connection.

**Why this priority**: Reinforces the habit loop against connectivity gaps, but only has something to offer once Stories 1–3 have produced material to revisit, so it is the lowest priority without being optional.

**Independent Test**: With the device offline, revisit an article containing a previously translated paragraph and confirm the translation, its exercises, and vocabulary lookups still work; confirm a paragraph never translated before shows a clear "unavailable offline" state rather than failing silently.

**Acceptance Scenarios**:

1. **Given** a paragraph translated during a previous, online session, **When** the learner returns offline and clicks it, **Then** the same German version and marked vocabulary appear.
2. **Given** exercises previously generated for a paragraph, **When** offline, **Then** those exercises can still be answered and still update progress locally.
3. **Given** a paragraph that was never translated before going offline, **When** the learner clicks it while offline, **Then** the learner is told the translation isn't available offline rather than seeing a silent failure or a broken paragraph.

---

### Edge Cases

- Host page re-renders (e.g. a client-side framework replaces the DOM subtree containing a translated paragraph): the extension MUST NOT throw, corrupt surrounding content, or leave a duplicated/orphaned German node behind. The paragraph is treated as a fresh, untranslated paragraph after the re-render — any in-progress translated state for that specific node is not preserved across a host-driven replacement.
- A clicked paragraph is too short, contains no eligible vocabulary, or otherwise cannot support one or more exercise kinds: the extension still shows the German translation, and the panel offers only the exercise kinds it can validly build from that paragraph's content (fewer than four cards), rather than showing a broken or empty card.
- No German variant can be produced for a clicked paragraph at all (e.g. content fetch fails and no cached variant exists): the paragraph remains clickable at all times (no pre-check or disabled state); when a click can't produce a translation, the paragraph stays in its original state and shows an inline error in place, rather than the learner being blocked from trying.
- The learner translates a second paragraph while the panel already shows exercises from a first: the newly translated paragraph's exercises replace the panel's contents entirely; any exercises from the previous paragraph that the learner had not yet answered are discarded, not preserved for later.
- Streak calculation: a "day" is the device's local calendar day; the streak increments once for each local midnight-to-midnight period in which the learner solves at least one exercise, and breaks if a full local calendar day passes with no solved exercise.
- The learner enables Sprachweise on a site, then revokes the permission from Chrome's own UI (outside the extension) rather than through the extension's own toggle: the extension must detect it is no longer permitted and behave as if disabled for that site on next load.
- A vocabulary word appears more than once in the same paragraph: it is marked at each occurrence, but counted once per paragraph toward "encountered" for progress purposes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST NOT modify, mark, or otherwise alter any page content until the learner has explicitly enabled it for that site.
- **FR-002**: The system MUST let the learner enable or disable itself on a per-site basis, and MUST NOT request or use access broader than the current site without a further explicit action.
- **FR-003**: On an enabled site, the system MUST make eligible paragraphs clickable, and clicking one MUST replace its content in place with a German version written at the learner's configured level.
- **FR-004**: Clicking a paragraph a second time MUST restore its original content exactly, including formatting, links, and any inline markup, with no observable difference from its pre-translation state.
- **FR-005**: The system MUST NOT modify any paragraph the learner has not clicked.
- **FR-006**: Within a translated paragraph, words belonging to the learner's target vocabulary MUST be visually distinguishable from surrounding text, and MUST reveal their Russian meaning only on the learner's demand (not shown at rest).
- **FR-007**: The system MUST offer, in a panel anchored to the right edge of the page, exercises generated from the specific paragraph the learner most recently translated, using that paragraph's own words and sentences; translating a new paragraph MUST replace the panel's current exercise set, discarding any exercises from the previous paragraph that were not yet answered.
- **FR-008**: The system MUST support four exercise kinds: fill-in-the-blank using a sentence taken verbatim from the paragraph, multiple choice, German-to-Russian word pairing, and audio dictation of a sentence from the paragraph.
- **FR-009**: The system MUST evaluate every exercise answer leniently: ignoring letter case, surrounding punctuation, and extra whitespace, and accepting both umlaut and ASCII-transliterated spellings (e.g. "möchte" / "moechte") as equivalent.
- **FR-010**: Every exercise answer, correct or incorrect, MUST produce immediate feedback; a wrong answer's feedback MUST explain the mistake and reference the source sentence it came from.
- **FR-011**: Solving an exercise MUST update the learner's visible progress counters (streak, active vocabulary, per-topic accuracy) and MUST schedule the involved vocabulary for spaced repetition review.
- **FR-012**: The panel MUST be collapsible to a narrow edge tab that displays the count of pending exercises, and MUST be reopenable without losing any exercise's answered/in-progress state.
- **FR-013**: Previously translated paragraphs, their generated exercises, and the learner's vocabulary/progress data MUST remain usable with no network connection.
- **FR-014**: The system MUST let the learner set their proficiency level, their current grammar topic, and how much of a page may be translated at once, and newly translated paragraphs and exercises MUST reflect the current values of these settings.
- **FR-015**: The system MUST NOT transmit page content off the device without the learner's consent; enabling Sprachweise for a site constitutes that consent for any paragraph subsequently clicked on that site, with no further per-paragraph prompt. When a fragment is sent for processing, it MUST be limited to the clicked paragraph's own text — never the page URL, a learner identifier, or browsing history.
- **FR-016**: All UI the system injects into the host page MUST be visually isolated from the host page's own styles in both directions (host styles must not affect it; its styles must not affect the host page).
- **FR-017**: The system MUST record, per vocabulary word, how many times it has been encountered and its current review status, and MUST record, per grammar topic, the accuracy across attempted exercises.
- **FR-018**: Every eligible paragraph MUST remain clickable regardless of whether a translation can currently be produced for it; if a click cannot produce a German version, the paragraph MUST remain in its original state and show an inline error rather than leaving the learner without feedback.

### Key Entities

- **Paragraph**: A block of host-page text the learner can click. Tracks its original markup (for exact restoration), its current display state (original vs. translated), and identity stable enough to survive being re-clicked, but not guaranteed to survive a host-driven DOM re-render.
- **German Variant**: The translated form of a specific paragraph at a specific level, with the spans of text that correspond to target vocabulary marked out.
- **Vocabulary Item**: A German word or short phrase the learner is learning. Has a Russian meaning, an encounter count, a status (e.g. new / active / due for review / learned), and a spaced-repetition schedule.
- **Exercise**: One instance of one of the four exercise kinds, generated from a specific paragraph. Holds the prompt content (sentence, options, or pairs), the correct answer(s), the source sentence to reference in feedback, and its own answered/unanswered state.
- **Exercise Attempt**: A single submitted answer to an exercise, its correctness after lenient matching, and the vocabulary/topic it should affect.
- **Progress Profile**: The learner's cumulative state — current streak, count of active vocabulary, per-topic accuracy, and today's solved-exercise count.
- **Review Queue Entry**: A vocabulary item's spaced-repetition state — repetitions so far and the next due date.
- **Site Rule**: A hostname paired with whether Sprachweise is enabled, disabled, or has never been decided for it.
- **Learner Settings**: Proficiency level, current grammar topic, and translation density (how much of a page may be translated at once).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can go from clicking an untranslated paragraph to seeing its German version with marked vocabulary in under 2 seconds on a warm cache (previously seen paragraph) and under 5 seconds when new content must be fetched.
- **SC-002**: Restoring a translated paragraph to its original state is indistinguishable from the untouched page in 100% of cases across paragraphs containing plain text, links, and inline formatting.
- **SC-003**: Learners can complete a full exercise (read prompt, answer, receive feedback) in under 30 seconds on average.
- **SC-004**: At least 95% of correct answers that differ only in case, punctuation, whitespace, or umlaut/transliteration spelling are accepted without the learner needing to correct themselves.
- **SC-005**: 100% of wrong-answer feedback messages reference the specific source sentence the exercise was built from.
- **SC-006**: A learner returning to previously read material after going offline can still open a previously translated paragraph and its exercises with no error state, in 100% of cases where that material was already cached.
- **SC-007**: No page is modified in any way before the learner has explicitly enabled Sprachweise for it, verified across a representative sample of sites with zero unintended modifications.
- **SC-008**: Learners can identify, within one glance at the collapsed edge tab, how many exercises are currently pending, without needing to open the panel.

## Assumptions

- Language pair is fixed to German (target) and Russian (native) for this spec; no language-pair selection UI is in scope.
- "Eligible paragraph" means a block-level text element in the host page's main content area with enough extractable text to translate; headers, captions, and non-text elements are not click targets.
- When a clicked paragraph cannot support all four exercise kinds (e.g. too short, too little distinct vocabulary), the system shows as many valid exercise kinds as it can construct rather than blocking translation entirely; this is treated as a normal, not an error, condition.
- A host page's re-rendering of a translated paragraph's DOM subtree (common with client-side-rendered news sites) is treated as the paragraph reverting to untranslated; the extension does not attempt to detect and re-apply a prior translation across such a replacement, since it cannot know whether the underlying content changed.
- Settings changes (level, topic, translation density) apply going forward only; already-translated paragraphs on the page are not retroactively retranslated when settings change mid-session.
- Account creation, cross-device sync, content authoring tooling, payment, and any language pair other than Russian→German are out of scope, per the feature description.
- The visual design and interaction rules for all four surfaces (in-page overlay, popup, options page, progress view) follow `design_handoff_sprachweise/README.md` and its prototype; this spec describes behavior and outcomes, not layout, and defers to that document wherever the two could be read as conflicting.
