# Implementation Plan: Explain Selection

**Branch**: `agent/ex-p6-explain` | **Spec**: [spec.md](./spec.md)

## Design

- **Shared** (`packages/shared/src/schemas/explain.ts`): `GRAMMAR_PHENOMENA` catalog (id + Russian
  title), `PosSchema`, `ExplainRequestSchema`, `ExplainResponseSchema` (refine on spans/surfaces).
  Messages: `SelectionTool` gains `explain`; `EXPLAIN_SELECTION` and `ADD_TO_VOCABULARY` requests.
- **Backend**: `pipeline/gemini-call.ts` (one structured-output call: key in header, timeout,
  retry, remembered config failures; same behaviour as translate.ts, which is left unchanged to
  keep this PR small and to avoid clashing with P7), `pipeline/explain.ts` (prompt, model schema,
  surface to span location), `cache/explain-store.ts`, `routes/explain.ts`, table `explain_cache`,
  config `EXPLAIN_DAILY_REQUEST_ALLOWANCE`.
- **Extension**: menu item, `lib/selection/explain-selection.ts` (IndexedDB cache
  `lib/storage/explain-cache.ts`, backend call, error classification),
  `lib/selection/explain-segments.ts` (pure: splits the German text into plain and token pieces),
  `lib/vocab/add-lemma.ts`, `entrypoints/sidepanel/ExplainResult.tsx`.
- **Quality**: `apps/cms/scripts/explain-quality-check.ts` + 20 fixtures A2-B1.

## Constitution Check (3.1.0)

- **I**: no new permission (`contextMenus`, `sidePanel` exist). Pass.
- **II**: the page is never touched. Pass.
- **III**: the fragment goes out only after the explicit menu choice; no URL. The 3.1.0 wording
  already covers a study tool. The privacy policy gets the new purpose. Pass.
- **IV**: explained fragments are cached locally and show offline; errors are explained. Pass.
- **V**: all contracts are Zod in `packages/shared`. Pass.
- **VI**: tests for the schema refine, cache key, segments, route with a mock provider, and a
  Playwright scenario. Pass.
- **VII**: a plain switch for tools, no registry; one duplicated Gemini call helper rather than
  refactoring translate.ts under a parallel change (P7). Pass.
