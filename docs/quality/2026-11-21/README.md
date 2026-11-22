# Flash-lite on prompt v2 — 2026-11-21

Experiment for issue #31 (`docs/optimization-analysis.md` §3.2, L1/L2/R2). Question: can a
flash-lite model replace `gemini-3.8-flash` (thinking `low`) on prompt v2?

Same 20 Russian paragraphs as 2026-10-19 (`apps/cms/scripts/quality-paragraphs.ts`: 11 × A1-A2,
9 × B1-B2), produced with `apps/cms/scripts/quality-check.ts`, judged blind in **one** judge run
(`gemini-3.1-pro-preview`, shuffled letters) so the scores are comparable.

## Result

**None of the flash-lite configurations passes. Recommendation: stay on `gemini-3.8-flash`.**
The decision on the model stays with the owner; production config is not changed here.

| Run | Overall | Meaning | Grammar | Level fit | Glosses | Grammar ≤ 3 | Meaning ≤ 3 | Problems | $/paragraph | Avg / p95 latency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `38-v2-a` (3.8-flash, low) | 4.76 | 4.85 | 4.70 | 4.95 | 4.55 | 0 | 0 | 0 | 0.00155 | 3814 / 8288 ms |
| `38-v2-b` (3.8-flash, low) | 4.69 | 4.75 | 4.70 | 4.85 | 4.45 | 1 | 1 | 1 | 0.00154 | 4301 / 11753 ms |
| `lite31-v2-minimal` | 4.31 | 3.85 | 4.65 | 4.75 | 4.00 | 2 | 6 | 1 | 0.00052 | 1445 / 1940 ms |
| `lite31-v2-low` | 4.34 | 4.00 | 4.30 | 4.70 | 4.35 | 5 | 6 | 6 | 0.00066 | 1486 / 1855 ms |
| `lite35-v2-minimal` | 4.09 | 3.90 | 3.90 | 4.60 | 3.95 | 8 | 6 | 4 | 0.00082 | 1156 / 1591 ms |

"Problems" = `vocab item(s) not found verbatim` or response-validation failures reported by
`quality-check`. No call failed (20/20 in every run). `3.5-flash-lite` was run only with
`minimal` (the 3.1 pair already shows `low` does not rescue meaning).

### Paired differences (candidate − mean of the two baselines), 95% bootstrap CI over paragraphs

Threshold from §3.2: lower bound ≥ −0.15 for meaning, grammar, level fit and glosses. Baseline
run-to-run spread (a − b) is within ±0.1 per criterion (CI roughly ±0.2–0.45), so −0.15 stands.
Full per-level numbers: [paired-differences.txt](paired-differences.txt), script
[paired-differences.py](paired-differences.py).

| Candidate | Meaning | Grammar | Level fit | Glosses |
| --- | --- | --- | --- | --- |
| `lite31-v2-minimal` | **−0.95** [−1.38, −0.55] | −0.05 [−0.47, +0.30] | −0.15 [−0.45, +0.10] | **−0.50** [−0.95, −0.05] |
| `lite31-v2-low` | **−0.80** [−1.23, −0.40] | −0.40 [−0.93, +0.07] | −0.20 [−0.47, +0.05] | −0.15 [−0.75, +0.40] |
| `lite35-v2-minimal` | **−0.90** [−1.30, −0.53] | **−0.80** [−1.43, −0.20] | **−0.30** [−0.60, −0.03] | −0.55 [−1.12, +0.00] |

Meaning is the decisive criterion: the whole interval sits well below −0.15 for every
candidate, so the verdict is "failed", not "not enough data". It is worst on A1-A2
(−1.2 … −1.5; B1-B2: −0.33 for all three). Grammar and glosses intervals are wide (20
paragraphs) and cross the threshold, but the point estimates are negative as well.
Per level (A1-A2 / B1-B2) no candidate passes meaning.

Errors the judge lists are real, not style: dropped or inverted facts ("по возможности"
removed, "und" turned into "Oder", the strike starting "Dienstag nacht" instead of 02:00 on
Monday), wrong terms (`Zugführer` for `Lokführer`), wrong articles (`das Fahrplan`). Time and fact
distortions (e.g. the strike start) fail the "no new distortions" criterion of §3.2 on their own.

### Economics

Per paragraph, measured: 3.8-flash $0.00155 → flash-lite $0.00052–0.00082 (2.0–3.0× cheaper),
latency 3.8–4.3 s → 1.2–1.5 s (p95 8–12 s → 1.6–1.9 s). The price gap would widen on
**2027-01-01**: 3.8-flash doubles to $1.5 / $7.5 per 1M tokens, which for these 20 paragraphs
(7724 in / ~6700 out tokens) is ≈ $0.0031 per paragraph versus unchanged $0.00052–0.00082 for
flash-lite (≈ 4–6×). The cost benefit is real but the quality loss on meaning (≈ −0.9 of 5) is
not acceptable for a learning product, so the risk is not paid back.

## What this does not cover

- 20 paragraphs, Russian source only, no C1+, no long paragraphs, no English sources (the §3.2
  preparation steps 1–2 were not done; the experiment reuses the 2026-10-19 set on purpose, to be
  comparable to it). Per-level intervals are therefore wide (11 and 9 paragraphs).
- The judge is a Gemini model like the candidates (same-family bias); no second judge was run.
  Only the first paragraph's error list was read by hand (the errors there were genuine); the
  full manual spot-check required by §3.2 ("all article/gender/case errors") was **not** done.
- Thinking for `3.8-flash` was `low` (as in production); `3.1-flash-lite` was run with
  `minimal` and `low`; `3.5-flash-lite` only `minimal`. Both 3.8 `low` runs report
  `0 thinking` tokens, while `lite31-v2-low` reports 2334, so the 3.8 usage most likely omits
  thinking (see M2 in the analysis) and its true cost is higher than shown, which widens the
  price gap a little in favour of flash-lite; it does not change the quality verdict.
- Prices from `apps/cms/src/pipeline/pricing.ts` (as of 2026-10). Cost of the 5 runs ≈ $0.12,
  judge ≈ $0.3–0.5.

## Decision options for the owner (before 2027-01-01)

1. **Stay on 3.8-flash** (recommended). Budget ≈ 2× the current per-paragraph cost from January;
   fix `costUsd` to use the new price from 2027-01-01 (L1), otherwise `provider_calls.cost_usd`
   under-reports.
2. If cost matters more: re-test with a bigger set (≥ 20 per level, EN sources, long paragraphs,
   §3.2 steps 1–2) and route only B1-B2 to flash-lite — B1-B2 meaning is −0.33 and not yet
   conclusive at 9 paragraphs, but still below the threshold.
3. `gemini-3.6-flash` costs the same as 3.8 and doubles on the same date, so it is no
   alternative.

Reproduce:

```bash
cd apps/cms && mkdir -p exp
GEMINI_MODEL=gemini-3.8-flash      GEMINI_THINKING_LEVEL=low     pnpm quality-check --out exp/38-v2-a.md
GEMINI_MODEL=gemini-3.8-flash      GEMINI_THINKING_LEVEL=low     pnpm quality-check --out exp/38-v2-b.md
GEMINI_MODEL=gemini-3.1-flash-lite GEMINI_THINKING_LEVEL=minimal pnpm quality-check --out exp/lite31-v2-minimal.md
GEMINI_MODEL=gemini-3.1-flash-lite GEMINI_THINKING_LEVEL=low     pnpm quality-check --out exp/lite31-v2-low.md
GEMINI_MODEL=gemini-3.5-flash-lite GEMINI_THINKING_LEVEL=minimal pnpm quality-check --out exp/lite35-v2-minimal.md
pnpm judge exp/*.json     # NB: writes apps/cms/judge-report.md, which is tracked — move it away, don't commit over it
python3 ../../docs/quality/2026-11-21/paired-differences.py judge-report.md
```

| File | Content |
| --- | --- |
| [judge-5-runs.md](judge-5-runs.md) | Judge report for all five runs (scores and error lists per paragraph) |
| [runs/](runs/) | `quality-check` output per run (`.md` side by side, `.json` judge input) |
