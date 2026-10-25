# Implementation Plan: Selection Tools Scaffold

**Branch**: `agent/ex-p5-selection-scaffold` | **Date**: 2026-10-25 | **Spec**: [spec.md](./spec.md)

## Summary

A "Sprachweise" parent item in the selection context menu, with the existing in-page translation
and two new items, "Translate to my level" and "Read aloud". The new items open `chrome.sidePanel`
and hand it the selected text. The panel (a WXT `sidepanel` entrypoint, React, design tokens) runs
the tool. No content script, no page change.

## Technical Context

**Language/Version**: TypeScript 5 strict. **Dependencies**: none new (WXT already supports the
`sidepanel` entrypoint). **Storage**: `chrome.storage.session` for the one pending selection
(memory only, cleared when the browser closes; trusted contexts only); vocabulary and the
translation cache are the existing local stores. **Testing**: vitest (schemas, fragment cap),
Playwright with the mock CMS (menu → panel).

## Constitution Check (3.1.0)

- **I Least Privilege**: adds `sidePanel`. Justification below. `contextMenus` already exists.
  No host permission, no content script. Pass.
- **II Host Page Integrity**: the page is never touched by the new tools. Pass.
- **III Privacy**: sends the selected fragment for translation only after the explicit menu choice;
  no page URL (`info.pageUrl` is never read). Reading aloud sends nothing. Needs the amendment
  made in this change (3.0.0 → 3.1.0, MINOR): the fragment may also go to a study tool invoked on
  it by an explicit action. Pass with the amendment.
- **IV Offline-First**: saved translations show offline; errors are explained. Pass.
- **V Typed Contracts**: new messages in `packages/shared/src/schemas/messages.ts`. Pass.
- **VI Tests**: message schemas, fragment cap, panel scenario. Pass.
- **VII Simplicity**: a `switch`, no tool registry; the translation path is copied from the
  paragraph handler rather than abstracted (a third use exists only after P6). Pass.
- **VIII UX**: nothing appears on the page; the panel is the browser's own, dismissible. Pass.

### Permission justifications (Principle I)

- `contextMenus` (existing; now also the "Translate to my level" and "Read aloud" items): this is
  how the learner starts a tool on a selection. Shows no install warning.
- `sidePanel` (new): shows the result of those tools in Chrome's side panel, an extension page.
  `chrome.sidePanel.open()` is called from the menu click. It reads no page and no site data. It
  shows no install warning (Chrome permission-warning list; asserted by `install-permissions.spec.ts`
  through `getPermissionWarningsByManifest`). Same text in `docs/store-listing.md`,
  `store/permissions.json`, `store/permission-justifications.md`.

## Design

- **Menu** (`lib/page-actions.ts`): parent `sprachweise-tools` (contexts `selection`) with children
  `sprachweise-translate` (unchanged id), `sprachweise-translate-level`, `sprachweise-speak`.
  "Restore" keeps the `page` context, so it never shares a right-click with the parent.
- **Click** (`entrypoints/background.ts` `onMenuClicked`): for a new item, with no `await` before
  the first call (the gesture must still be live): `chrome.sidePanel.open({tabId})`; then build the
  payload from `info.selectionText`; save it to `storage.session`; broadcast `SELECTION_TOOL` to
  the panel. A plain `switch` over `menuItemId`; P6–P9 add cases.
- **Messages** (`packages/shared`): `SelectionToolMessage {type:"SELECTION_TOOL", id, tool:
  "translate"|"speak", text(1..600), truncated}` background → panel (in `AnyMessageSchema`);
  `GET_PENDING_SELECTION` panel → background (reply: the last payload or null, so a panel that
  opened after the broadcast still gets it); `TRANSLATE_SELECTION {text}` panel → background (level
  is read from settings there; reply: `{ok:true, text, spans[]}` or `{ok:false, reason}`).
  `SELECTION_MAX_CHARS = 600`; the 1,500 backend cap stays.
- **Translate** (`lib/selection/translate-selection.ts`): cache key from the text hash, level and
  topic `general` (same as the paragraph path, so a paragraph translated earlier is reused), else
  `/api/translate`, then `recordVocabEncounters`, cache the variant, record `paragraph_translated`.
  Failures use `classifyTranslateFailure`; the event is `client_error` `selection-panel-failed`.
- **Panel** (`entrypoints/sidepanel/`): React, `lib/design/page` tokens. Shows the original,
  the tool result, notices. Words render as buttons; a click shows the gloss. Model text is the
  schema-checked safe subset (`<strong>`/`<em>`), as on the page. Speak uses `playDictationAudio`.
- **Test approach**: Playwright cannot click the native menu. As for the existing items, the test
  build exposes `onMenuClicked` (`globalThis.sprachweiseTest`) and the spec calls it from the
  service worker with a synthetic `OnClickData` carrying `selectionText`. `sidePanel.open` needs a
  real gesture and fails outside one (the handler catches that), so the spec opens
  `sidepanel.html` in a tab; the pending-selection path delivers the text (the same path a
  late-opening panel uses).

## Docs touched

Constitution (Sync Impact Report, 3.1.0), `apps/cms/src/privacy/policy.ts`, `store/*`,
`docs/store-listing.md`, `README.md` permission list, `build-store-zip.mjs` expected permissions.
