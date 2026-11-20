# Chrome Web Store listing — Sprachweise (private beta)

What goes into the Chrome Web Store developer dashboard. The item is published as **unlisted**;
store item ID `ahkgdlbpociadhocjjomkkeliiligebj`. Privacy policy:
<https://sprachweise.vercel.app/privacy>. Spec: `specs/003-private-beta`.

The package is built and uploaded by the release workflow (see "Releasing" in the
[README](../README.md#releasing)). The Chrome Web Store API can't edit the listing, so the form is
filled in by hand. Don't copy the texts from this page: copy them from the body of the GitHub
Release for the version you're submitting. The workflow renders it from
[`store/release-notes.md.tmpl`](../store/release-notes.md.tmpl) and these sources:

| Dashboard field | Source |
| --- | --- |
| Store listing → Summary | manifest, `extDescription` in `apps/extension/public/_locales/*/messages.json` |
| Store listing → Description (Russian, primary) | `store/description.txt` |
| Store listing → Description (English) | `store/description.en.txt` |
| Privacy practices → Single purpose | `store/single-purpose.txt` |
| Privacy practices → Permission justification | `store/permissions.json` (readable version: `store/permission-justifications.md`) |
| Privacy practices → Remote code | `store/remote-code.md` |
| Privacy practices → Data usage | `store/data-usage.md` |
| Test instructions → Additional instructions | `store/test-instructions.txt` (copy in `store/test-instructions.md`) |
| Privacy policy URL | `<API base URL>/privacy`, filled in by `store/release-notes.md.tmpl` |

`pnpm check:store` (run in CI) fails when these copies drift apart: the summary against the manifest,
permission justifications against the built manifest, the `.md` copy against the `.txt`, and the
character cap against `TRANSLATE_MAX_CHARS`.

If a `store/*` file is missing, the release body shows a PLACEHOLDER warning in its place and the
pre-release checklist gets a warning; the release itself doesn't fail. The workflow reads the files
at the tagged commit, so to change a text, edit the file on `main` and tag a new version;
re-running the workflow on an old tag renders the old texts again.

This page keeps the rest: what the package contains, graphics, the data-usage reasoning and the
one-time CORS setup.

## Package

| Field | Value |
| --- | --- |
| Name | Sprachweise (from `_locales/*/messages.json`) |
| Version | from the release tag: `vX.Y.Z` → `X.Y.Z`; must be higher than the version in the store |
| Default locale | `en`; also `ru` |
| Permissions | `storage`, `activeTab`, `scripting`, `contextMenus`, `sidePanel` |
| Optional host permissions | none |
| Host permissions | none |
| Content scripts in manifest | none (injected into the current tab only when the user picks the menu item or presses the shortcut) |
| Keyboard shortcut | `translate-selection`, suggested `Alt+Shift+G` |
| Install / update warnings | none — checked with `chrome.management.getPermissionWarningsByManifest` on the production manifest (Chrome 151) |

## Store listing tab

**Name:** Sprachweise

**Summary:** from the manifest (`extDescription`, ≤ 132 characters, shown in the viewer's
language). The dashboard shows it read-only; the release body repeats it per locale with its
length.

**Category:** Education (under Productivity)

**Language:** Russian (primary); add English as a second listing language.

### Detailed description

Russian, the primary listing language: [`store/description.txt`](../store/description.txt).
English, the second listing language: [`store/description.en.txt`](../store/description.en.txt).
The release body shows both, each with its length against the 16,000-character limit.

### Graphics (`docs/store-assets/`, rendered by `pnpm --filter @sprachweise/extension store:assets`)

| Asset | File |
| --- | --- |
| Store icon 128×128 | `apps/extension/public/icon/128.png` (also packaged) |
| Screenshot 1 (1280×800) | `screenshot-1-paragraph-and-exercises.png` |
| Screenshot 2 (1280×800) | `screenshot-2-word-gloss.png` |
| Screenshot 3 (1280×800) | `screenshot-3-progress.png` |
| Small promo tile 440×280 | `promo-small-440x280.png` |

The screenshots use a local mock backend with a hand-written A1–A2 translation and the real
exercise generator, so they never call production.

## Privacy practices tab

**Single purpose:** [`store/single-purpose.txt`](../store/single-purpose.txt).

### Permission justifications

From [`store/permissions.json`](../store/permissions.json), one justification per permission or
host pattern. The release body lists every permission the release manifest requests next to its
justification, flags any that have none, and names entries the manifest no longer requests.

Added with the selection tools (specs/005-selection-tools, constitution Principle I):

- `contextMenus` also carries the "Sprachweise" submenu items "Translate to my level" and "Read
  aloud". It is how the user starts a tool on a selection; it reads no page.
- `sidePanel` shows the result of those two items in Chrome's side panel (an extension page opened
  from the menu click). It reads no page or site data and shows no install warning, which
  `install-permissions.spec.ts` checks with `getPermissionWarningsByManifest`.

The keyboard shortcut (`commands`, suggested Alt+Shift+G) does the same as the menu item, for
sites that replace the right-click menu. It needs no permission and shows no warning.

**Remote code:** No. Answer and the checks behind it: [`store/remote-code.md`](../store/remote-code.md).

### Data usage

[`store/data-usage.md`](../store/data-usage.md) is the single source: what each request sends, which
data types to tick (Location, User activity, Website content, with the reasoning for Location),
purposes, retention and the three certifications. It must match the published privacy policy
(`apps/cms/src/privacy/policy.ts`); the release body renders it as is.

**Privacy policy URL:** `https://sprachweise.vercel.app/privacy`

## Test instructions tab

No account or login is needed. "Additional instructions" come from
[`store/test-instructions.txt`](../store/test-instructions.txt).

## Distribution tab

- **Visibility: Unlisted** (installable only from the direct link; not in search or categories).
- Regions: all regions (or only the testers' countries).
- Pricing: free.

## After first upload

Done once for the published item; repeat if the store item ID or the backend changes. The release
workflow's smoke test sends CORS preflights with `Origin: chrome-extension://<CWS_ITEM_ID>` and
fails the release if the backend doesn't grant that origin.

Do this before inviting testers. The backend allows only the extension origins listed in
`CORS_ALLOWED_ORIGINS` (`apps/cms/src/config.ts`). Until the store build's origin is on the list,
every translation, event and report from the store build fails with a CORS error.

1. **Store item ID.** Open the item in the developer dashboard. The ID is the 32-letter (a–p)
   segment in the dashboard URL, also shown under "Item ID". Example:
   `abcdefghijklmnopabcdefghijklmnop`.
2. **Local dev ID.** Open `chrome://extensions` with Developer mode on and copy the ID of the
   unpacked Sprachweise you load for development. The manifest has no `key`, so this ID depends
   on the folder you loaded from. If you load it from another path, the ID changes and must be
   updated here too.
3. **Build the value.** Exact origins, comma-separated, no spaces, no trailing slash. Keep the dev
   origin:

   ```text
   chrome-extension://<store item id>,chrome-extension://<local dev id>
   ```

4. **Set it on Vercel**, team `alexbaumgertner`, project `sprachweise`, environment
   **Production**. The variable is stored as sensitive, so its current value can't be read back;
   enter the whole list. Run from the repo root (linked through `.vercel/project.json`):

   ```sh
   vercel env update CORS_ALLOWED_ORIGINS production
   # paste the value from step 3 when prompted
   ```

   Or use Dashboard → sprachweise → Settings → Environment Variables → `CORS_ALLOWED_ORIGINS` →
   Edit, and paste the full value.
5. **Redeploy.** Env changes apply only to new deployments. From an up-to-date `main` at the repo
   root, run `vercel deploy --prod`.
6. **Check** with the store item ID. The response must include
   `access-control-allow-origin: chrome-extension://<store item id>`:

   ```sh
   curl -si -X OPTIONS https://sprachweise.vercel.app/api/translate \
     -H 'Origin: chrome-extension://<store item id>' \
     -H 'Access-Control-Request-Method: POST' \
     -H 'Access-Control-Request-Headers: content-type' | grep -i access-control-allow-origin
   ```

   Then install from the unlisted store link, select a paragraph on any article, right-click →
   "Translate to German (Sprachweise)", and check that the German text appears.
