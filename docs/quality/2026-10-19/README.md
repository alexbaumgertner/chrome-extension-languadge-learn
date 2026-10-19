# Translation quality — 2026-10-19

Same 20 Russian paragraphs (`apps/cms/scripts/quality-paragraphs.ts`), produced with
`apps/cms/scripts/quality-check.ts` and judged blind by `gemini-3.1-pro-preview` with
`apps/cms/scripts/judge.ts`.

| Report | What it shows |
| --- | --- |
| [judge-4-models.md](judge-4-models.md) | Model choice: 3.8-flash 4.86, 3.6-flash 4.61, 3.1-flash-lite 4.30, 3.5-flash-lite 4.15 (prompt v1) |
| [judge-3.8-prompt-v1-vs-v2.md](judge-3.8-prompt-v1-vs-v2.md) | Gloss fix (prompt v2: noun articles, separable prefixes): 4.89 vs 4.59 head-to-head; errors 11 vs 25 |
| [runs/](runs/) | Per-model quality-check outputs (`.md` side by side, `.json` judge input); `phase1-…` is the first run from Phase 1 |

Caveat: the judge is the same model family as the candidates; results were spot-checked against
errors found by hand. Prompt v2 is in production with `gemini-3.8-flash`, thinking `low`.
