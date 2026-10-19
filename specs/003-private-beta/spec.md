# Feature Specification: Private Beta

**Feature Branch**: `ship/first-dollar`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Phase 2 is a private beta for me and 3–5 friends. Scope: install ID,
server-side usage metrics + `/admin/metrics` page, 'Плохой перевод' report button, unlisted Chrome
Web Store release, privacy policy. No payments, paywall, license keys or Pro tier — deferred until
the beta review on 16 Nov."

**Amended 2026-10-19 (branch `context-menu-trigger`, before the first store submission)**: the
trigger changed from "enable a site, then click a paragraph" to "select text, right-click,
Translate to German (Sprachweise)". Per-site enabling, site rules and optional host permissions are
gone. See User Story 4, FR-010 and FR-015–FR-021.

Context: Phase 1 (backend deployed, Gemini-only, Postgres) is done — see
[docs/ship-first-dollar.md](../../docs/ship-first-dollar.md). Governed by constitution 2.0.0
(Principle III permits a random install ID for usage metrics and an explicit bad-translation
report; nothing else identifying).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The owner sees how the beta is used (Priority: P1)

The owner opens a password-protected metrics page and sees, per day: how many installs were
active, how many paragraphs were translated, how many came from the cache, how many failed, and
how many bad-translation reports arrived — plus a per-install breakdown so they can tell whether
each friend is actually using it.

**Why this priority**: The beta exists to learn whether people use the product; without numbers
the 16 Nov review is guesswork.

**Independent Test**: Translate paragraphs from two installs → the metrics page shows 2 active
installs and the right counts for today; the page refuses access without the password.

**Acceptance Scenarios**:

1. **Given** two installs translated 3 and 2 paragraphs today, **When** the owner opens the
   metrics page, **Then** today shows 2 active installs and 5 translations, with a per-install
   row for each (shortened install ID, counts, last active day).
2. **Given** a translation failed upstream, **When** the owner views metrics, **Then** it is
   counted under failures, not translations.
3. **Given** no or a wrong password, **When** anyone opens the metrics page, **Then** access is
   refused and no data is shown.

---

### User Story 2 - A beta tester flags a bad translation in one click (Priority: P1)

While reading a translated paragraph, the tester sees a "Плохой перевод" button. One click sends
that paragraph and its German output for review and shows a short thank-you; nothing is sent
without the click.

**Why this priority**: Translation quality is the main product risk (the quality check already
found grammar and meaning errors); real reports from real pages tell the owner what to fix and
which model to choose.

**Independent Test**: Translate a paragraph, click "Плохой перевод" → a thank-you appears and the
report (source fragment, German output, level, model) is visible to the owner.

**Acceptance Scenarios**:

1. **Given** a translated paragraph, **When** the tester clicks "Плохой перевод", **Then** the
   source fragment and its German output are sent once and a thank-you replaces the button.
2. **Given** the tester never clicks the button, **Then** no report or page text beyond the
   normal translation request leaves the device.
3. **Given** the report can't be sent (offline/server error), **Then** the tester sees "couldn't
   send, try again" and the host page is unaffected.
4. **Given** reports exist, **When** the owner opens the metrics page, **Then** recent reports are
   listed with source, output, level, model and date.

---

### User Story 3 - Friends install from the Chrome Web Store via a private link (Priority: P2)

The owner sends friends an unlisted Chrome Web Store link. They install without any permission
warning, select text on any page and use the product from the right-click menu. A privacy policy
explains what is sent and stored.

**Why this priority**: Friends shouldn't need developer mode; an unlisted listing also rehearses
the public release.

**Independent Test**: Install the production package in a clean Chrome profile → no permission
warning at all; privacy policy reachable over HTTPS; the unlisted listing is not searchable.

**Acceptance Scenarios**:

1. **Given** the production package, **When** it is installed or updated, **Then** Chrome shows no
   permission warning, and the extension can read a page only in the tab where the user picked
   its menu item or pressed its shortcut, at that moment (activeTab).
2. **Given** the privacy policy page, **Then** it states what is sent (selected text, only after the
   menu choice; random
   install ID; reports on click), what is stored and for how long, and what is never collected.
3. **Given** the listing, **Then** its visibility is unlisted and every permission has a one-line
   justification.

---

### User Story 4 - Translate a selection from the right-click menu (Priority: P1)

The learner selects text on any page, right-clicks and chooses "Translate to German
(Sprachweise)". The selection is replaced by the German version with glosses, and the exercise
panel opens. "Restore original text (Sprachweise)" brings the original back. There is nothing to
enable per site and no reload.

**Why this priority**: It is how every translation starts. It replaces per-site enabling, which
needed a host permission per site, a popup step and (before a fix) a reload.

**Independent Test**: On any article, select a sentence → right-click → Translate → only that
sentence turns German; select from the middle of one paragraph into the middle of the next →
exactly the selected text in each turns German; Restore → the page is byte-identical to before.

**Acceptance Scenarios**:

1. **Given** a selection inside one paragraph that doesn't cover all of it, **When** the learner
   picks "Translate to German", **Then** exactly the selected text (trimmed of surrounding
   whitespace) is sent and replaced; the rest of the paragraph is untouched.
2. **Given** a selection that touches several paragraphs, **Then** it is split per leaf block (a
   paragraph-like element with no block inside): a block it covers completely is replaced whole,
   the selected part of any other block is replaced exactly — one request per block, top to
   bottom; the panel shows the first block's exercises. A container holding other blocks or form
   fields is never replaced as a whole.
3. **Given** a selection over 1,500 characters, **Then** nothing is sent and the learner is told
   to select less (how much they selected and the limit).
4. **Given** translated text on the page, **When** the learner right-clicks the page (no
   selection), **Then** "Restore original text (Sprachweise)" is offered and restores every
   translation on the page byte-identically.
5. **Given** a site that replaces the right-click menu, **When** the learner selects text and
   presses the shortcut (suggested Alt+Shift+G), **Then** the same happens as with the menu.
6. **Given** a failure, **Then** the message says which: offline, service unavailable
   (unreachable, CORS-blocked or server error), daily limit, too long, or other — never
   "offline" for a server problem.

### Edge Cases

- Extension storage cleared or reinstalled → a new install ID; the metrics count it as a new
  install (acceptable for a 3–5 person beta).
- Paragraphs re-opened from the extension's local cache send no request and are not counted.
- A missing or malformed install ID on a metric event batch → the batch is rejected, not
  silently counted under an anonymous bucket. Translation requests carry no install ID at all.
- The same paragraph reported twice by the same tester → two reports (no dedupe needed at this
  scale).
- Metrics page during an empty day → shows zeros, not an error.
- Selection in an editable field (input, textarea, contenteditable) → refused with a message;
  the learner's own text is never rewritten.
- Selection that includes code (`code`, `pre`, `kbd`, `samp`) or a form field (input, textarea,
  select, button, contenteditable), or whose replaced text would contain a script or style →
  the whole selection is refused ("Selection includes code or form fields — select plain text
  only"), `selection-excluded` is recorded, nothing is sent.
- Selection that includes text sitting directly in a container next to other blocks
  (`<div>Header<p>…</p></div>`) or in `body`, or the own text of a list item that holds a nested
  list → refused ("Selection includes text outside a paragraph — select text inside paragraphs
  only"), `selection-mixed` recorded, nothing sent. Ranges are never split around it. A
  script between selected paragraphs is not visible and not replaced, so it doesn't count.
- Selection already showing German → the original of that block is translated again (served from
  the local cache), never the German.
- The page changes the selected text while the translation is in flight → the German is not
  inserted; the learner is asked to select again.
- Pages Chrome doesn't let extensions script (chrome://, the Web Store, the PDF viewer) and
  selections inside a cross-origin iframe → the menu item does nothing there (activeTab covers
  only the tab's own origin). The shortcut works on the top frame only.
- The extension is updated while a page shows translations → the old script restores the page
  when the new one starts.

## Requirements *(mandatory)*

### Functional Requirements

**Install identity**

- **FR-001**: On first run the extension MUST generate a random install ID (≥122 bits of
  randomness, not derived from device or user data) and keep it in extension storage.
- **FR-002**: The install ID MUST be sent only with usage-metric events (`POST /api/events`) —
  never with a translation request, a bad-translation report, the page URL, browsing history,
  email or account data (constitution III). *(Amended 2026-10-19: was "only with translation
  requests"; separating it from page text is the stricter reading of III.)*
- **FR-003**: The server MUST NOT use the install ID as a cache key, MUST NOT log it, and MUST NOT
  store it together with page content (reports carry no install ID).

**Usage metrics**

- **FR-004**: The extension MUST record events — install, paragraph translated (server cache hit
  or miss, end-to-end latency), exercise completed, client error (fixed code + HTTP status) — and
  the server MUST store them per install per UTC day, enough for DAU, D1/D3/D7 retention,
  paragraphs per install, errors and latency. No paragraph text, URL, hostname or IP is stored
  with them. Queries: [metrics.sql](./metrics.sql).
- **FR-005**: An admin metrics page MUST show daily totals (active installs, translations, cache
  hits, failures, reports) for the last 30 days, a per-install table (shortened ID, totals, last
  active day), and the 50 most recent bad-translation reports.
- **FR-006**: The metrics page and any admin data MUST require a secret configured on the server;
  without it access is refused.

**Bad-translation report**

- **FR-007**: Each translated paragraph MUST offer a "Плохой перевод" action inside the extension's
  isolated UI; it MUST NOT modify the host page outside the selected paragraph (constitution II).
- **FR-008**: The report MUST be sent only on that explicit click and contain only the source
  fragment, its German output, the CEFR level, the translation density, and the model and prompt
  version that produced it — no install ID.
- **FR-009**: After sending, the action MUST confirm with a thank-you; on failure it MUST say so
  and allow a retry.

**Release and privacy**

- **FR-010**: The production package MUST request no website access at install or update: no host
  permissions, no optional host permissions, no manifest content scripts. The page script MUST run
  only in a tab where the user picked the extension's menu item or pressed its shortcut, injected
  under the activeTab grant (constitution I). *(Amended 2026-10-19: was "only on sites the user
  enabled via the popup".)*
- **FR-011**: The Chrome Web Store listing MUST be unlisted, with RU and EN short descriptions and
  a justification for each permission.
- **FR-012**: A privacy policy page MUST be served over HTTPS from the same deployment as the API.
- **FR-013**: Usage counts older than 90 days and reports older than 90 days MUST be deleted
  automatically.
- **FR-014**: The existing global daily budget cap MUST stay in place; no per-install limits in
  this feature.

**Context-menu trigger** *(added 2026-10-19)*

- **FR-015**: A "Translate to German (Sprachweise)" context-menu item on selections MUST be the
  trigger; choosing it is the consent to send that text (constitution III). Nothing is read or
  sent before.
- **FR-016**: A selection MUST be resolved to leaf blocks (paragraph-like elements with no
  block-level element inside). A leaf it covers completely MUST be replaced whole, unless it holds
  a form field, media or a script (then only the selected text); in any other leaf exactly the
  selected range MUST be replaced. Selected text outside every leaf (directly in a container
  holding other blocks) MUST make the whole selection be refused (`selection-mixed`), never
  expanded. Restoring MUST be byte-identical per block (constitution II).
  *(Amended 2026-10-19 after review: a partly selected block at either end of a multi-block
  selection is no longer expanded to the whole block.)*
- **FR-017**: A selection MUST be at most `TRANSLATE_MAX_CHARS` = 1,500 characters
  (`packages/shared`). The extension checks the whole selection before sending; the backend
  checks each request and answers `413 text-too-long`. Rationale: ~250 characters per average
  paragraph at ~$0.0016 → about six paragraphs, about one cent per selection at most; the backend
  previously accepted 5,000.
- **FR-018**: A "Restore original text (Sprachweise)" item MUST appear on a plain right-click while
  the active tab shows a translation, and restore every translation on the page.
- **FR-019**: A keyboard command MUST do the same as the translate item (fallback for sites that
  replace the context menu).
- **FR-020**: Failure messages MUST distinguish offline, service unavailable, daily limit, too
  long and other; the client_error event MUST carry the matching code (`translate-offline`,
  `-unreachable`, `-cors`, `-server-error`, `-limit`, `-too-long`, `-failed`).
- **FR-021**: No page reload MUST be needed before the first translation on any page.

### Key Entities

- **Install**: a random ID created by the extension. No personal attributes.
- **Event**: (install, UTC day, kind) + cache/latency for translations, code/status for errors.
- **Bad-translation report**: source fragment (the selected text that was sent), German output, level, density, model, prompt
  version, created time. Not linked to an install.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: By the 16 Nov review the owner can answer from the metrics page alone: how many
  testers used it, on how many days, and how many paragraphs each translated.
- **SC-002**: A tester can report a bad translation in one click and under 3 seconds.
- **SC-003**: At least 3 of the invited friends install from the unlisted link without help.
- **SC-004**: The installed package triggers no permission warning at install or update (checked
  with Chrome's `getPermissionWarningsByManifest` on the production manifest).
- **SC-005**: 0 host pages show an error caused by the extension during the beta.

## Assumptions

- Testers: the owner plus 3–5 friends; scale is tiny, so no dedupe, sampling or charts are needed.
- Payments, license keys, a Pro tier and per-install limits are deferred until the beta review on
  16 Nov 2026.
- Day boundaries are UTC.
- The admin secret is a single shared password held by the owner.
- The domain `sprachweise.com` may replace the `*.vercel.app` URL later; public URLs are
  configuration.
- New UI strings are Russian; existing English UI stays as is.
- Out of scope: payments, paywall, license keys, Pro tier, accounts, server TTS, grammar topics,
  new exercise types, progress-dashboard polish, other target languages, a public landing page.
