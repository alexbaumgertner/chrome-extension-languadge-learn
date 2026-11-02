# Implementation Plan: Review Session and Toolbar Badge

**Branch**: `agent/ex-p4-review-session` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

## Summary

Add `contextSentence`/`contextForm` to the vocabulary, a "Повторение" tab on the options page
driven by pure selection/building functions in `lib/review/`, a `SUBMIT_REVIEW_ATTEMPT` message
that reuses `recordAttempt`, a popup button and an action badge maintained by the background.

## Technical Context

TypeScript strict, WXT + React, Zod in `packages/shared`, Vitest (unit), Playwright with the mock
CMS (integration). Storage: `chrome.storage.local` (`vocabulary`, `reviewQueue`, `progress`).
Nothing new on the network.

## Constitution Check

| Principle | Result |
|---|---|
| I Least Privilege | **Pass, no new permission.** `chrome.action` needs none. The badge is recomputed on storage changes, browser start, install/update and tab/window switches (the service worker already listens to those for the context menu), so a day rollover is picked up at the next switch. `chrome.alarms` was considered for a midnight recompute and rejected: it would add a manifest permission, a store justification (`store/permissions.json`, `store/permission-justifications.md`, `docs/store-listing.md`), a privacy-policy entry and test changes, for a badge that is at worst stale until the learner next touches the browser. If the beta shows stale badges, add it with this justification: "schedules one local-midnight wake-up to refresh the badge number; reads no site data; no install warning". `docs/store-listing.md` is therefore unchanged. |
| II Host Page Integrity | Not touched: the screen is an extension page. |
| III Privacy | No request is made; the sentence is the learner's own selected text, already stored locally; never sent. |
| IV Offline-First | The whole feature works with no network. |
| V Typed Contracts | `VocabularyItemSchema` extension, `SUBMIT_REVIEW_ATTEMPT` request/response in `packages/shared`. |
| VI Test What Breaks | Unit: schema back-compat, due selection, builders, grading, sentence extraction, badge text. Playwright: offline review. |
| VII Simplicity | Two exercise kinds only; no randomness; the P1/P2 kinds are not in `main`, so not used. |

## Design

- `lib/review/context.ts`: `extractContextSentence(text, start, end)`.
- `lib/review/session.ts`: `selectDue`, `countDue`, `buildReviewExercise`, `gradeReview`,
  `badgeText`.
- Background handler `SUBMIT_REVIEW_ATTEMPT` calls the unchanged `recordAttempt` with topic `review`.
- `lib/vocab/upsert.ts`: takes the variant text and stores the sentence.
- Background: `updateBadge()` on the triggers above.
- Options: tab "review" (`#review` deep link); the popup button opens it with `chrome.tabs.create`.
- A session is frozen when it starts; storage change events do not rebuild it mid-session.
- Cross-session note: only `VocabularyItemSchema` and the two message lists in `packages/shared`
  are touched, additively, to keep merges with the parallel exercise-type work trivial.

## Project Structure

```text
specs/004-review-session/{spec,plan,tasks}.md
packages/shared/src/schemas/{storage,messages}.ts
apps/extension/lib/review/{context,session}.ts
apps/extension/entrypoints/options/ReviewView.tsx
apps/extension/entrypoints/{background.ts,popup/App.tsx}
apps/extension/tests/{unit,integration}/review*.ts
```
