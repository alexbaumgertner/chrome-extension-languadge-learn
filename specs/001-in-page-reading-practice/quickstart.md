# Quickstart: Validating In-Page Reading Practice

## Prerequisites

- Node.js 24, pnpm installed
- Repo root: `pnpm install` (installs `apps/extension` + `packages/shared` workspaces)
- A reachable Payload CMS instance implementing `contracts/cms-api-contract.md` (or a local mock server implementing the same three endpoints, for offline-of-CMS development)
- Chrome (or Chromium) for manual verification; Playwright browsers installed (`pnpm exec playwright install`) for automated integration tests

## Build and load

```bash
pnpm --filter apps/extension dev     # WXT dev build with HMR
```
Load the generated `apps/extension/.output/chrome-mv3/` directory as an unpacked extension via `chrome://extensions` (Developer mode → Load unpacked).

## Automated validation

```bash
pnpm --filter apps/extension test:unit         # Vitest: parser, scheduler, matcher, schemas
pnpm --filter apps/extension test:integration  # Playwright: substitution/restoration, messaging, offline
pnpm --filter packages/shared test             # Zod schema round-trip tests
```

Expected: all suites pass, and the Playwright substitution/restoration suite explicitly asserts DOM equality (`outerHTML` before vs. after a translate→restore cycle) across the fixture markup patterns captured from `docs/spike-findings.md` (plain paragraph, paragraph with links, paragraph with inline bold/italic, nested list item).

## Manual scenario walkthrough (maps to spec Independent Tests)

1. **Per-site gate (User Story 4)** — Visit any article site with the extension freshly installed. Confirm no paragraph highlights on hover and no click does anything. Open the popup, toggle the site on, accept the Chrome permission prompt. Reload the page; paragraphs now show a hover tint.
2. **Translate and restore (User Story 1)** — Click a paragraph containing at least one link and one bold/italic span. Confirm it's replaced by German text at the paragraph's own font size/line-height, with marked vocabulary chips. Click it again; confirm the DOM is back to the original (compare `outerHTML` in devtools, or trust the Playwright suite's assertion). Confirm no other paragraph on the page changed.
3. **Exercises (User Story 2)** — With a paragraph translated, open the right-edge panel. Confirm every exercise references the paragraph's own words/sentences. Answer one exercise of each kind, including a fill-blank answer typed with a transliterated umlaut (e.g. `moechte`) — confirm it's accepted. Submit a wrong answer — confirm the feedback names the mistake and quotes the source sentence. Collapse the panel mid-exercise, reopen it — confirm state is unchanged.
4. **Progress (User Story 3)** — After solving exercises above, open the options page's Progress view. Confirm streak, active vocabulary count, and per-topic accuracy reflect what was just solved, and the involved words appear in the review queue with a future due date.
5. **Offline (User Story 5)** — With the same article still open and paragraphs already translated, go offline (devtools Network → Offline, or disconnect). Reload the page, re-enable if needed, click the previously translated paragraph — confirm the German version and exercises still appear. Click a paragraph never translated before — confirm a clear "unavailable offline" message, not a silent failure.
6. **Revoked permission (Edge Case)** — With a site enabled, go to `chrome://extensions` → the extension's site access → remove access for that origin directly (bypassing the popup toggle). Reload the page — confirm it behaves as disabled.

## Success criteria reference

See `spec.md` Success Criteria (SC-001…SC-008) for the quantitative thresholds (timing, restoration fidelity, answer-acceptance rate) these scenarios are expected to meet; the Playwright suite is the source of truth for SC-002 (100% restoration fidelity), the Vitest matcher suite for SC-004 (95% lenient-match acceptance).
