# Feature Specification: Private Beta

**Feature Branch**: `ship/first-dollar`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Phase 2 is a private beta for me and 3–5 friends. Scope: install ID,
server-side usage metrics + `/admin/metrics` page, 'Плохой перевод' report button, unlisted Chrome
Web Store release, privacy policy. No payments, paywall, license keys or Pro tier — deferred until
the beta review on 16 Nov."

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

The owner sends friends an unlisted Chrome Web Store link. They install without an alarming
"read and change all your data on all websites" warning, enable a site, and use the product. A
privacy policy explains what is sent and stored.

**Why this priority**: Friends shouldn't need developer mode; an unlisted listing also rehearses
the public release.

**Independent Test**: Install the production package in a clean Chrome profile → no broad
host-access warning; privacy policy reachable over HTTPS; the unlisted listing is not searchable.

**Acceptance Scenarios**:

1. **Given** the production package, **When** it is installed, **Then** the browser asks for no
   website access until the user enables a specific site from the toolbar popup.
2. **Given** the privacy policy page, **Then** it states what is sent (selected paragraph, random
   install ID, reports on click), what is stored and for how long, and what is never collected.
3. **Given** the listing, **Then** its visibility is unlisted and every permission has a one-line
   justification.

### Edge Cases

- Extension storage cleared or reinstalled → a new install ID; the metrics count it as a new
  install (acceptable for a 3–5 person beta).
- Paragraphs re-opened from the extension's local cache send no request and are not counted.
- A missing or malformed install ID on a translation request → the request is rejected, not
  silently counted under an anonymous bucket.
- The same paragraph reported twice by the same tester → two reports (no dedupe needed at this
  scale).
- Metrics page during an empty day → shows zeros, not an error.

## Requirements *(mandatory)*

### Functional Requirements

**Install identity**

- **FR-001**: On first run the extension MUST generate a random install ID (≥122 bits of
  randomness, not derived from device or user data) and keep it in extension storage.
- **FR-002**: The install ID MUST be sent only with translation requests, never with the page URL,
  browsing history, email or account data (constitution III).
- **FR-003**: The server MUST NOT use the install ID as a cache key, MUST NOT log it, and MUST NOT
  store it together with page content (reports carry no install ID).

**Usage metrics**

- **FR-004**: The server MUST count, per install per UTC day: translations served, of which from
  the shared cache, and failures. No paragraph text is stored with these counts.
- **FR-005**: An admin metrics page MUST show daily totals (active installs, translations, cache
  hits, failures, reports) for the last 30 days, a per-install table (shortened ID, totals, last
  active day), and the 50 most recent bad-translation reports.
- **FR-006**: The metrics page and any admin data MUST require a secret configured on the server;
  without it access is refused.

**Bad-translation report**

- **FR-007**: Each translated paragraph MUST offer a "Плохой перевод" action inside the extension's
  isolated UI; it MUST NOT modify the host page outside the selected paragraph (constitution II).
- **FR-008**: The report MUST be sent only on that explicit click and contain only the source
  fragment, its German output, the level and the model that produced it.
- **FR-009**: After sending, the action MUST confirm with a thank-you; on failure it MUST say so
  and allow a retry.

**Release and privacy**

- **FR-010**: The production package MUST request no website access at install time; the page
  script MUST run only on sites the user enabled via the popup (constitution I). Any permission
  added for this MUST be justified.
- **FR-011**: The Chrome Web Store listing MUST be unlisted, with RU and EN short descriptions and
  a justification for each permission.
- **FR-012**: A privacy policy page MUST be served over HTTPS from the same deployment as the API.
- **FR-013**: Usage counts older than 90 days and reports older than 90 days MUST be deleted
  automatically.
- **FR-014**: The existing global daily budget cap MUST stay in place; no per-install limits in
  this feature.

### Key Entities

- **Install**: a random ID created by the extension. No personal attributes.
- **Daily usage**: (install, UTC day) → translations, cache hits, failures.
- **Bad-translation report**: source fragment, German output, level, model, created time. Not
  linked to an install.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: By the 16 Nov review the owner can answer from the metrics page alone: how many
  testers used it, on how many days, and how many paragraphs each translated.
- **SC-002**: A tester can report a bad translation in one click and under 3 seconds.
- **SC-003**: At least 3 of the invited friends install from the unlisted link without help.
- **SC-004**: The installed package triggers no "read and change all your data on all websites"
  warning.
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
