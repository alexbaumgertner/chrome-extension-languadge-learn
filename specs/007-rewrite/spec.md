# Feature Specification: Rewrite a selection (side panel)

**Feature Branch**: `agent/ex-p7-rewrite` (based on `agent/ex-p5-selection-scaffold`, PR #22)

**Created**: 2026-10-26

**Status**: Draft

**Input**: P7 in `docs/research/2026-10-25-exercise-types/prompts.md`; rationale in the report's
section 3.C (C5). Governed by constitution 3.1.0 (a study tool invoked on a selection by an
explicit menu action may send the fragment; no amendment needed).

## User Scenarios & Testing

### User Story 1 - Rewrite German text in a chosen way (Priority: P1)

The learner selects German text, picks "Sprachweise > Rewrite". The side panel opens with a mode
switch: simpler (to my level), richer (one level up), formal, casual. The panel shows the rewritten
text with glossed words, and a word diff against the original. The page is not changed.

**Acceptance Scenarios**:

1. **Given** a German selection, **When** "Rewrite" is picked, **Then** the panel shows the default
   mode ("simpler") result; only text, level and mode are sent (no page URL).
2. **Given** a result, **When** the learner switches mode, **Then** a new request is made for that
   mode and the result and diff are replaced.
3. **Given** a result, **Then** removed and added words are marked against the original, and the
   glossed words can be tapped for their Russian meaning and are added to the vocabulary.
4. **Given** a result, **When** "Listen" is pressed, **Then** it is read aloud (de-DE). **When**
   "Bad translation" is pressed, **Then** source and result go to `/api/report` (no install ID).

### User Story 2 - Say it in German (Priority: P2)

For a fragment in Russian (Cyrillic), the panel does not offer modes: it uses the existing
translation to the learner's level (same path as "Translate to my level"). English fragments go
through `/api/rewrite`, whose prompt puts non-German text into German first.

### Edge cases

- Over 600 characters: cut, panel says so (as in P5). Offline / limit / backend failure: plain
  message, `client_error` `selection-panel-failed`, retry.
- The model's answer fails validation (spans, unsafe HTML): 502, nothing cached.

## Requirements

- **FR-001** `POST /api/rewrite {text, level, mode}` returns the `/api/translate` response shape
  (`TranslateResponseSchema`: safe-subset HTML, validated spans) plus `cache`, `model`,
  `promptVersion`.
- **FR-002** Own prompt for a German source, own `REWRITE_PROMPT_VERSION`, own cache keys (mode and
  version are part of the key), own daily counter `rewrite` in `usage_counters` next to the global
  `gemini` one (both reserved or neither).
- **FR-003** The mode is a closed enum in `packages/shared`.
- **FR-004** The word diff is a pure function (LCS over tokens) with unit tests.
- **FR-005** Nothing on the host page changes; no content script is involved.
- **FR-006** Privacy policy and store data-usage text name the new purpose.
