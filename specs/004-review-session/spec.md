# Feature Specification: Review Session and Toolbar Badge

**Feature Branch**: `agent/ex-p4-review-session`

**Created**: 2026-10-25

**Status**: Draft

**Input**: Task P4 of `docs/research/2026-10-25-exercise-types/prompts.md` (features B1, B2 of the
research report): let the learner review words whose SRS date has come without clicking a new
paragraph, fully offline, and show how many are waiting on the toolbar icon. Out of scope: sync
between devices, notifications (the `notifications` permission shows an install warning).

Governed by constitution 3.0.0 (Principles I, IV, V, VI).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review words that are due (Priority: P1)

The learner opens the Review screen (options page, tab "Повторение"). It lists up to 20 words whose
review date is today or earlier. Each word is an exercise built on the device: a fill-the-blank
over the sentence the word was last seen in, or - when no sentence is stored - "recall the
translation" with a self-assessment. The result updates the word's schedule, the streak and topic
accuracy exactly like an exercise on a page.

**Why this priority**: the biggest gap against competing tools is repetition outside the paragraph;
D7 retention is the beta's key metric.

**Independent Test**: seed vocabulary and a review queue with due and future words; open the
Review tab with the backend down; answer every exercise; due words get a later date, future words
are untouched.

**Acceptance Scenarios**:

1. **Given** 25 due words, **When** the session starts, **Then** exactly 20 are offered, most
   overdue first.
2. **Given** a due word with a stored sentence containing the word, **When** its turn comes,
   **Then** the sentence is shown with the word blanked, the Russian meaning as a hint, and a typed
   answer is graded leniently (case, punctuation, umlaut transliteration).
3. **Given** a due word with no stored sentence, **When** its turn comes, **Then** the learner sees
   the German word, reveals the translation and says "Помню" or "Не помню".
4. **Given** a correct answer, **When** it is submitted, **Then** the word's interval advances
   (SM-2 step) and its due date moves to a later local day; a wrong answer makes it due tomorrow.
5. **Given** no word is due, **When** the screen opens, **Then** it says nothing is due today.
6. **Given** no network, **When** a session runs, **Then** everything works (no request is made).

### User Story 2 - See how many words wait (Priority: P1)

The toolbar icon shows the number of words due today; the popup has a button "Повторить N слов"
that opens the Review screen. The badge is empty when nothing is due.

**Acceptance Scenarios**:

1. **Given** 3 words become due, **Then** the badge reads "3" (updated without reopening anything).
2. **Given** the learner reviews them, **Then** the badge clears.
3. **Given** the browser restarts or a new local day starts, **Then** the badge is recomputed.

### Edge Cases

- Vocabulary stored before this feature has no sentence: it must still parse, and falls back to recall.
- A queue entry whose vocabulary item is gone is ignored (no exercise can be built).
- A stored sentence that no longer contains the word form: recall instead of a cloze.
- Counts above 99 show as "99+".

## Requirements *(mandatory)*

- **FR-001**: `VocabularyItem` MAY carry `contextSentence` (German, at most 200 characters) and
  `contextForm` (the form of the word as it appears in that sentence). Records without them parse.
- **FR-002**: Every fresh translation stores, for each glossed word, the sentence it appears in
  (cut to 200 characters around the word); a later encounter replaces it.
- **FR-003**: The due set is queue entries with `dueDate <= today` (local date) that have a
  vocabulary item, ordered by `dueDate` then id; a session takes at most 20.
- **FR-004**: Exercises are built by pure functions, offline; the kind is a function of the stored
  data only (cloze if a sentence with the form is stored, else recall).
- **FR-005**: Results go through the existing `recordAttempt` (SRS, streak, accuracy) via a typed
  message `SUBMIT_REVIEW_ATTEMPT` validated by a Zod schema in `packages/shared`.
- **FR-006**: The toolbar badge shows the due count; recomputed on storage change, on browser
  start, on install/update, and when the learner switches tab or window (covers a new day).
- **FR-007**: No new manifest permission. All UI strings are in `_locales` (en and ru).

### Key Entities

- **VocabularyItem** (extended): + `contextSentence?`, `contextForm?`.
- **ReviewExercise** (client-only, not persisted): `cloze` or `recall`, tied to one `vocabId`.

## Success Criteria

- **SC-001**: A due word can be reviewed with the backend unreachable (Playwright).
- **SC-002**: Old vocabulary records parse; due selection, cloze/recall building, sentence
  extraction and badge text are unit-tested.
- **SC-003**: The manifest permissions are unchanged and install shows no warning.
