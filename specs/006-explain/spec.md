# Feature Specification: Explain Selection (P6, C3)

**Branch**: `agent/ex-p6-explain` | **Date**: 2026-10-26 | **Depends on**: 005-selection-tools (P5)
**Source**: docs/research/2026-10-25-exercise-types/prompts.md (P6), README.md section 3.C (C3)

## Summary

A new "Explain" item in the Sprachweise selection submenu opens the side panel with: the Russian
translation of the fragment, a word-by-word breakdown (surface form, lemma, part of speech, form,
Russian gloss) and 1 to 3 grammar phenomena explained in Russian. Tapping a word shows its gloss and
an "Add to vocabulary" button that adds the lemma to the vocabulary with an SRS card.

## Requirements

- **FR-001**: `POST /api/explain { text, level }` answers `{ germanText, translationRu, tokens,
  grammar }`. A fragment that is not German is first translated to German in the same call
  (`germanText`); for German input `germanText` equals the input.
- **FR-002**: `pos` is a closed enum; `grammar.id` is a closed enum of 30 A1-B2 phenomena kept in
  `packages/shared` (reused later by P8). `titleRu` comes from that catalog, not from the model.
- **FR-003**: The response schema checks every token and grammar span lies inside `germanText` and a
  token's `surface` equals that substring. The model returns surface strings; the server locates
  them (a model's character offsets are unreliable). A response that fails any check is a 502 and
  nothing is cached.
- **FR-004**: Cached in Postgres by (text, level, model, thinking level, `EXPLAIN_PROMPT_VERSION`),
  with request coalescing.
- **FR-005**: Its own daily counter `gemini-explain` (`EXPLAIN_DAILY_REQUEST_ALLOWANCE`, default
  500) so explanations never use up the translation allowance.
- **FR-006**: No user text in logs (as FR-007 of the translation backend).
- **FR-007**: The extension calls the backend from the background worker, keeps results in an
  IndexedDB cache so reopening works offline, and shows model output as text only (no innerHTML).
- **FR-008**: Errors (offline, unreachable, limit, 5xx, bad answer) are explained in the panel and
  recorded as `selection-panel-failed` with the HTTP status.
- **FR-009**: Only `info.selectionText` (at most 600 characters) and the level are sent; never the
  page address (constitution III, 3.1.0 already allows a study tool invoked by an explicit action).

## Out of scope

Chat, grammar exercises (P8), rewrite (P7), a real-key quality run (the command is documented).
