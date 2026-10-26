# Plan: Rewrite a selection

Constitution check: I (no new permission; `contextMenus` and `sidePanel` already added in 005),
II (host page untouched), III (explicit menu action, fragment + level + mode only; reports on an
explicit click only), V (Zod in `packages/shared/src/schemas/rewrite.ts` and `messages.ts`),
VI (tests for schemas, diff, route, one Playwright scenario).

- Backend: `apps/cms/src/pipeline/rewrite.ts` (prompt, shares the Gemini call with translate),
  `routes/rewrite.ts` (cache, coalescing, counters, same error mapping as translate).
- Extension: menu item `sprachweise-rewrite`; `lib/selection/rewrite-selection.ts` (background
  handler); `lib/selection/diff.ts`; `entrypoints/sidepanel/RewriteResult.tsx`.
- Shared files touched minimally (`messages.ts`, `index.ts`, side-panel `App.tsx`, locales) to
  stay mergeable with the parallel P6 (explain) branch.
