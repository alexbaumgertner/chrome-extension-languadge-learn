# Feature Specification: Selection Tools Scaffold (side panel)

**Feature Branch**: `agent/ex-p5-selection-scaffold`

**Created**: 2026-10-25

**Status**: Draft

**Input**: User description: "Entry point for tools that work on selected text: a right-click
submenu and a side panel. This change ships only the scaffold and two tools: read the selection
aloud, and translate it to the learner's level. Explain, rewrite, grammar and ask follow (P6–P9)."
Research and rationale: `docs/research/2026-10-25-exercise-types/README.md`, section 3.C (C0, C1).

Context: governed by constitution 3.1.0 (this change amends Principle III). Numbered 005; 004 is
taken by a parallel branch. Runs after the 16 Nov beta review (`docs/ship-first-dollar.md`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Translate a selection to my level, in a side panel (Priority: P1)

The learner selects text on any page, right-clicks, chooses "Sprachweise ▸ Translate to my level".
The side panel opens and shows the German version at the learner's level, with the glossed words
highlighted; clicking a word shows its Russian meaning. The page is not changed.

**Why this priority**: it is the first tool and proves the whole path (menu → background →
side panel → backend → vocabulary).

**Independent Test**: select text on a fixture page, trigger the menu item, see the German text
and highlighted words in the panel, click a word, see its gloss; the word is in the vocabulary.

**Acceptance Scenarios**:

1. **Given** a selection on any site (enabled or not), **When** the learner picks "Translate to my
   level", **Then** the side panel opens with the translation at the current level; the page DOM
   is untouched; only the selected text and level are sent.
2. **Given** the translation is shown, **When** the learner clicks a highlighted word, **Then** its
   Russian gloss appears, and the word is in the local vocabulary (encounter counted once per
   fresh translation).
3. **Given** the same text and level were translated before, **When** it is chosen again, **Then**
   the saved translation is shown without a request (works offline).
4. **Given** the device is offline (nothing saved) or the backend fails, **When** the learner picks
   the tool, **Then** the panel shows a plain message and a `client_error` is recorded.

### User Story 2 - Read the selection aloud (Priority: P1)

The learner picks "Sprachweise ▸ Read aloud"; the side panel opens and speaks the selection with
the browser's de-DE speech synthesis. No request is made to the backend.

**Independent Test**: the panel calls `playDictationAudio` with the selection (speech output itself
is not asserted); no request reaches the mock backend.

**Acceptance Scenarios**:

1. **Given** a selection, **When** "Read aloud" is picked, **Then** the panel opens, shows the
   text, and speaks it; nothing is sent over the network.
2. **Given** the device has no speech synthesis, **Then** the panel says so instead of staying silent.

### Edge Cases

- Selection longer than 600 characters: the first 600 are used and the panel says so.
- Empty/whitespace selection: nothing opens.
- Panel already open: a second choice replaces the content (latest wins; a stale response for an
  older choice is ignored).
- Panel opened by hand (no selection yet): it explains how to start.
- Pages Chrome does not let extensions script (chrome://, Web Store): the menu still works, because
  no script is injected; `selectionText` comes from the menu click itself.

## Requirements *(mandatory)*

- **FR-001**: The right-click menu for a selection MUST show a parent item "Sprachweise" with the
  existing in-page translation item and the two new items. Room for further tools is left in the
  handler (a plain `switch`; no plugin registry).
- **FR-002**: A new item click MUST open the side panel from the click (user gesture) and pass the
  selection to it through a typed message validated by a Zod schema in `packages/shared`.
- **FR-003**: Only `info.selectionText` is used; `info.pageUrl`, the frame URL and the tab URL are
  never read, stored or sent.
- **FR-004**: No content script is injected and the host page is not modified by the new tools.
- **FR-005**: The fragment is 1–600 characters; a longer one is cut and the learner is told.
- **FR-006**: "Translate to my level" MUST call `/api/translate` with the learner's current level,
  show the text with `markedVocab` highlighted and glosses on click, and record the words with
  `recordVocabEncounters`.
- **FR-007**: "Read aloud" MUST use `speechSynthesis` with `de-DE` (`lib/audio/play-dictation.ts`).
- **FR-008**: Offline and backend errors MUST show a plain message in the panel and record a
  `client_error` with the new code `selection-panel-failed` (plus the HTTP status when known).
- **FR-009**: All UI strings MUST come from `_locales/{en,ru}`.
- **FR-010**: The manifest gains `sidePanel` only (`contextMenus` is already there); install shows
  no new warning. The production build contains no test URL.
- **FR-011**: The privacy policy, store data-usage and permission justifications MUST describe the
  new purpose and permission (constitution I and III).

### Out of scope

Floating button at the selection, keyboard shortcuts for the new tools, Explain, Rewrite, Grammar,
Ask, "Add to vocabulary".

## Success Criteria

- **SC-001**: Select → menu → translation in the panel, on a site that was never "enabled".
- **SC-002**: The production manifest's install warnings stay empty; the permission list is exactly
  `activeTab, contextMenus, scripting, sidePanel, storage`.
- **SC-003**: lint, typecheck, unit and integration suites pass.
