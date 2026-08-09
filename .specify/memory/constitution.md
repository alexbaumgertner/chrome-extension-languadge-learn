<!--
Sync Impact Report
- Version change: [TEMPLATE] → 1.0.0 (initial ratification)
- Modified principles: n/a (first concrete version; all placeholders replaced)
- Added sections:
  - Core Principles I–VIII (Least Privilege, Host Page Integrity, Privacy,
    Offline-First, Typed Contracts, Test What Breaks, Simplicity (YAGNI),
    Performance & Unobtrusive UX)
  - Technology Constraints
  - Development Workflow
  - Governance
- Removed sections: none (template placeholders only)
- Templates requiring follow-up: none — plan/spec/tasks templates read this
  file at runtime and require no edits from this command.
- Deferred TODOs: none
-->

# Sprachweise Constitution

Sprachweise is a Chrome MV3 extension for learning German through real web
pages, using Payload CMS as the content source.

## Core Principles

### I. Least Privilege
No `<all_urls>`, no default `host_permissions`. Page access comes only from
`activeTab` plus `optional_host_permissions` requested by an explicit user
gesture. Any new manifest permission requires a written justification in the
plan that introduces it.

**Rationale**: Broad host permissions are the single biggest trust and
review-friction cost a browser extension can carry; requiring justification
keeps the permission surface auditable and minimal by default.

### II. Host Page Integrity
The extension MUST NOT break the host page. All extension UI lives in a
Shadow DOM with isolated styles. Text substitution is reversible: the
original DOM is fully restored when the extension is turned off. No
mutations occur outside the blocks the user explicitly selected.

**Rationale**: The extension is a guest on someone else's page; any
non-reversible or leaking mutation erodes user trust and can break the host
site in ways users will blame on the browser, not the extension.

### III. Privacy
Page content never leaves the device without explicit consent. What may be
sent to a server is only the selected fragment, for translation or TTS —
never the URL, never a user identifier, never browsing history. Learning
progress is stored locally (`chrome.storage`) as the source of truth.

**Rationale**: A language-learning tool reads whatever the user is reading;
that is inherently sensitive, so data minimization is a requirement, not an
optimization.

### IV. Offline-First
Learned vocabulary, SRS cards, and already-fetched translations work with no
network. The network is an enhancement, not a precondition.

**Rationale**: Review sessions and prior learning must never be blocked by a
flaky connection or a CMS outage; only fetching new content requires
connectivity.

### V. Typed Contracts
Every message between content script, background, side panel, and popup, and
every CMS response, is validated by a Zod schema from `packages/shared`. No
`any` at a boundary. TypeScript strict mode is enforced throughout.

**Rationale**: Cross-context messaging and an external CMS are the two
places malformed data silently corrupts extension state; schema validation
at every boundary turns silent corruption into an immediate, typed failure.

### VI. Test What Breaks
Mandatory tests: DOM substitution and restoration, the paragraph parser, the
SRS scheduler, and the contract schemas. Do not test markup or thin
wrappers. Every bug fix starts with a failing test.

**Rationale**: Test effort should track actual failure risk — the
substitution engine, parser, scheduler, and contracts are where a bug
corrupts user data or the host page; markup and thin wrappers are not.

### VII. Simplicity (YAGNI)
No speculative abstractions, no premature configuration systems, no features
beyond what the current spec requires. Prefer duplicated code over a shared
abstraction until a third real use case exists. Every added dependency must
justify its weight against the extension's bundle-size budget.

**Rationale**: A browser extension pays for every kilobyte and every layer
of indirection in load time and reviewability; unused flexibility is a
standing cost with no current benefit.

### VIII. Performance & Unobtrusive UX
Content script injection MUST NOT measurably degrade host page load or
scroll performance: no layout thrashing, no synchronous long tasks on the
main thread. Extension UI is dismissible, non-modal by default, and never
obstructs host page content the user did not select.

**Rationale**: The extension only earns the right to stay installed if it is
invisible until invoked; jank or unsolicited overlays are the fastest path
to an uninstall.

## Technology Constraints

- Platform: Chrome Extension, Manifest V3.
- Content source: Payload CMS (external), fetched only for the specific
  fragments the current lesson or page needs — never bulk-fetched
  speculatively.
- Shared contracts live in `packages/shared` and are the single source of
  truth for cross-context message schemas (content script ↔ background ↔
  side panel ↔ popup) and for CMS response shapes (Principle V).
- Local persistence: `chrome.storage` is the source of truth for learning
  progress (SRS cards, vocabulary state) and MUST remain fully functional
  with no network connectivity (Principle IV).

## Development Workflow

- Any PR or plan introducing a new manifest permission MUST include the
  justification required by Principle I.
- Any change touching DOM substitution/restoration, the paragraph parser,
  the SRS scheduler, or a Zod contract schema MUST ship with a test that
  fails before the change and passes after (Principle VI).
- Code review MUST verify: no host permissions beyond `activeTab` without
  written justification, no `any` at a typed boundary, Shadow DOM isolation
  preserved, and offline behavior unaffected.

## Governance

This constitution supersedes ad-hoc practice. Amendments require a
documented rationale, a version bump per the policy below, and an updated
Sync Impact Report at the top of this file.

Versioning policy (semantic):
- MAJOR: Backward-incompatible principle removal or redefinition.
- MINOR: A new principle or materially expanded section is added.
- PATCH: Wording, clarification, or typo fixes with no rule change.

All plans (`/speckit-plan`) and reviews MUST verify compliance with these
principles before implementation proceeds; unjustified complexity or added
permissions must be flagged and resolved, not waived silently.

**Version**: 1.0.0 | **Ratified**: 2026-08-09 | **Last Amended**: 2026-08-09
