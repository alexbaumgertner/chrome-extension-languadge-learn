# Remote code

**Answer: No, I am not using remote code.**

Justification to paste, if the form asks for one:

> All JavaScript and WebAssembly the extension runs is in the submitted package. The extension
> loads no script from the network, does not use `eval()` or `new Function()`, does not call
> `importScripts()` or dynamic `import()` with a remote URL, and does not inject `<script>` tags.
> The only network traffic is `fetch` calls from the background service worker to our own backend
> (`https://sprachweise.vercel.app`) that send and receive JSON: translation, exercises, usage
> events and bad-translation reports. Responses are validated against a schema before use, and
> translated text may contain only bare `<strong>`/`<em>` tags (checked by the shared schema on
> both server and client). Responses are data; they are never executed.

## How this was checked (code and built package)

- Manifest (`wxt build`): no `content_security_policy` override, no `web_accessible_resources`,
  `content_scripts: []`. The extension-pages CSP stays Chrome's default (`script-src 'self'`).
- `chrome.scripting.executeScript` is called only with `files: ["content-scripts/content.js"]`
  (`apps/extension/lib/page-actions.ts`), a file inside the package. No `func` or string code.
- The built output (`.output/chrome-mv3`) contains no `eval(`, `new Function(` or `importScripts`.
  The only absolute URLs in the bundles are SVG/XML namespaces, React's error-docs link and the
  backend origin.
- `grep` over `apps/extension/{entrypoints,lib}` and `packages/shared/src` finds `fetch` only in
  `lib/cms/client.ts` (translate, exercises, report, health probe) and `lib/metrics/events.ts`
  (events), both against `CMS_BASE_URL` from `lib/config.ts`.
- Fonts (Figtree, Caprasimo) are bundled into the content script and decoded in memory, not loaded
  from a font CDN; icons are inlined SVG.
- Dictation audio uses the browser's built-in `speechSynthesis` (`lib/audio/play-dictation.ts`); no
  audio code or file is downloaded.
