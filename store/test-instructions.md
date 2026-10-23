# Test instructions (Additional instructions field)

Paste the text below. `store/test-instructions.txt` is identical and is what the release workflow puts in the release body.

```text
No sign-in, account or payment is needed, and there is nothing to enable per site or in settings. Install the extension and it is ready.

1. Open https://en.wikipedia.org/wiki/Berlin (any article with ordinary paragraphs works; no reload is needed if the tab was already open).
2. With the mouse, select one or two sentences of a paragraph (at most about 1,500 characters).
3. Right-click the selection and choose "Translate to German (Sprachweise)". The item appears only when text is selected. If the page replaces the right-click menu, select text and press Alt+Shift+G instead.
4. Within a few seconds the selected text is replaced in place by a German version, with some words highlighted, and a panel with exercises opens on the right edge of the page.
5. Click a highlighted word: a small tooltip shows its meaning in Russian (the glosses are Russian by design; the extension is made for Russian speakers).
6. In the panel, answer an exercise (fill in the blank, multiple choice, word pairs or dictation; dictation plays the sentence with the browser's own speech). "Bad translation" at the bottom of the panel sends the paragraph for review; no need to press it.
7. Right-click an empty part of the page and choose "Restore original text (Sprachweise)": the original text comes back. The item is shown only while the tab holds a translation.

Also visible: the toolbar icon opens a popup (streak and exercises solved today); the extension's settings page (chrome://extensions → Sprachweise → Details → Extension options) has the Progress tab and the A1–A2 / B1–B2 / C1+ level setting.

Notes: The text goes to our server (https://sprachweise.vercel.app) and is translated by Google Gemini, so an internet connection is required; a first translation can take a few seconds, repeated text is instant. A selection over 1,500 characters is refused with a message, by design. If a notice says today's translation limit is used up, new translations are paused until tomorrow (this is a private-beta daily cap), but text translated before still works. The extension does nothing on chrome:// pages and the Chrome Web Store.
```
