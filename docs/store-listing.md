# Chrome Web Store listing — Sprachweise (private beta)

Everything to paste into the Chrome Web Store developer dashboard for the first, **unlisted**
upload. Package: `pnpm store:zip` → `apps/extension/.output/sprachweise-<version>-chrome.zip`.
Privacy policy: <https://sprachweise.vercel.app/privacy>. Spec: `specs/003-private-beta`.
Store item ID: `ahkgdlbpociadhocjjomkkeliiligebj` (draft, never published).

## Package

| Field | Value |
| --- | --- |
| Name | Sprachweise (from `_locales/*/messages.json`) |
| Version | 0.1.0 |
| Default locale | `en`; also `ru` |
| Permissions | `storage`, `activeTab`, `scripting`, `contextMenus` |
| Optional host permissions | none |
| Host permissions | none |
| Content scripts in manifest | none (injected into the current tab only when the user picks the menu item or presses the shortcut) |
| Keyboard shortcut | `translate-selection`, suggested `Alt+Shift+G` |
| Install / update warnings | none — checked with `chrome.management.getPermissionWarningsByManifest` on the production manifest (Chrome 151) |

## Store listing tab

**Name:** Sprachweise

**Summary** (from the manifest, ≤ 132 characters, shown in the viewer's language):

- RU: Выделите текст на любой странице, нажмите правую кнопку и читайте его по-немецки на своём
  уровне, а потом решайте упражнения.
- EN: Select text on any page, right-click, and read it in German at your level. Then practice with
  exercises built from it.

**Category:** Education (under Productivity)

**Language:** Russian (primary); add English as a second listing language.

### Detailed description — RU

```text
Sprachweise превращает статьи, которые вы и так читаете, в практику немецкого.

Как это работает
• Выделите фразу или абзац на любой странице, нажмите правую кнопку мыши и выберите «Перевести на немецкий (Sprachweise)». Если сайт подменяет меню правой кнопки, нажмите Alt+Shift+G.
• Выделенный текст заменится немецкой версией на вашем уровне: A1–A2, B1–B2 или C1+. Если выделение задевает несколько абзацев, переводятся эти абзацы целиком.
• Подчёркнутые слова — новая лексика. Кликните слово, чтобы увидеть перевод.
• Справа появятся упражнения по этому тексту: пропущенное слово, выбор варианта, пары слов и диктант.
• «Вернуть исходный текст (Sprachweise)» в меню правой кнопки возвращает оригинал. Страница не меняется ни в чём, кроме выделенного текста.

Ничего не нужно включать для отдельных сайтов, и расширение не просит доступа к сайтам при установке: оно видит страницу только после того, как вы выбрали пункт меню.

Прогресс, словарь и повторения хранятся только в вашем браузере и работают без интернета.

Приватность
• На сервер уходит только выделенный текст и только после того, как вы выбрали пункт меню, — без адреса страницы. За один раз — не больше 1500 знаков.
• Для подсчёта использования расширение отправляет случайный идентификатор установки и события («абзац переведён», «упражнение выполнено», ошибки) — без текста.
• Кнопка «Плохой перевод» отправляет абзац и перевод на проверку только по вашему клику.
Подробно: https://sprachweise.vercel.app/privacy

Это закрытая бета: возможны ошибки перевода — пожалуйста, отмечайте их кнопкой «Плохой перевод».
```

### Detailed description — EN

```text
Sprachweise turns the articles you already read into German practice.

How it works
• Select a phrase or a paragraph on any page, right-click and choose "Translate to German (Sprachweise)". If a site replaces the right-click menu, press Alt+Shift+G.
• The selected text is swapped for a German version at your level: A1–A2, B1–B2 or C1+. If the selection spans several paragraphs, those paragraphs are translated whole.
• Underlined words are new vocabulary. Click one to see its meaning.
• Exercises built from that text appear on the right: fill in the blank, multiple choice, word pairs and dictation.
• "Restore original text (Sprachweise)" in the right-click menu brings back the original. Nothing on the page changes except the text you selected.

There is nothing to enable per site, and the extension asks for no website access at install: it sees a page only after you choose the menu item.

Progress, vocabulary and reviews stay in your browser and work offline.

Privacy
• Only the text you selected is sent to our server, only after you choose the menu item, and never the page address. At most 1,500 characters at a time.
• To count usage, the extension sends a random install ID with events ("paragraph translated", "exercise completed", errors), never with text.
• The "Плохой перевод" (bad translation) button sends the paragraph and its translation for review, only when you click it.
Details: https://sprachweise.vercel.app/privacy

This is a private beta. Translations can contain mistakes; please flag them with the "Плохой перевод" button.
```

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

**Single purpose:**
> Replaces text the user selects and sends to it from the right-click menu with a German version
> at the user's level, with vocabulary glosses and exercises built from that text.

### Permission justifications

| Permission | Justification |
| --- | --- |
| `storage` | Keeps the learner's settings, vocabulary, exercise progress, saved translations, the random install ID and unsent usage events in the browser, so learning works offline. |
| `contextMenus` | Adds "Translate to German (Sprachweise)" to the right-click menu when text is selected, and "Restore original text (Sprachweise)" while the current tab shows a translation. This menu item is how the user starts every translation. |
| `activeTab` | Gives temporary access to the current tab only when the user picks one of those menu items or presses the extension's keyboard shortcut, so the extension can read the selected text and replace it with German. No other tab and no other moment. |
| `scripting` | Injects the extension's script into that tab (chrome.scripting.executeScript) at that moment, under the activeTab grant. The extension declares no content scripts and no host permissions, so it never runs on a page the user didn't act on. |

The keyboard shortcut (`commands`, suggested Alt+Shift+G) does the same as the menu item, for
sites that replace the right-click menu. It needs no permission and shows no warning.

**Remote code:** No. All JavaScript is in the package; the server returns JSON only.

### Data usage

Tick these data types:

| Data type | Collected? | What and why |
| --- | --- | --- |
| Personally identifiable information | No | |
| Health information | No | |
| Financial and payment information | No | |
| Authentication information | No | |
| Personal communications | No | |
| Location | No (see note) | |
| Web history | No | No URLs, titles or visit times. |
| User activity | **Yes** | Usage events tied to a random install ID: paragraph translated (server cache hit/miss, latency), exercise completed, error codes. Used only for usage metrics. |
| Website content | **Yes** | The text the user selects and sends with "Translate to German" (at most 1,500 characters at a time), sent to our server and Google Gemini to translate it; on an explicit "Плохой перевод" click, that text and its translation for quality review. Nothing is read or sent before the user chooses the menu item. |

Note on Location: our app does not store IP addresses, but Vercel's request logs record them (the
privacy policy says so). Google's form defines Location as including IP address. If you prefer the
form to mirror the policy literally, also tick Location. Either way the policy discloses it.

Certify all three:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** `https://sprachweise.vercel.app/privacy`

## Test instructions tab

No account or login is needed. Paste into "Additional instructions":

```text
No sign-in needed. There is nothing to enable per site.

1. Open any German or Russian news article, e.g. https://www.tagesschau.de or https://meduza.io.
2. Select a paragraph (or a sentence) with the mouse.
3. Right-click the selection and choose "Translate to German (Sprachweise)"
   (Russian UI: "Перевести на немецкий (Sprachweise)").
4. Within a few seconds the selected text is replaced by a German version with underlined
   vocabulary, and an "Exercises" panel opens on the right. No page reload is needed.
5. Click an underlined word to see its Russian meaning. Solve an exercise in the panel.
6. Right-click an empty part of the page and choose "Restore original text (Sprachweise)" to
   bring the original text back.

If a site replaces the right-click menu, select text and press Alt+Shift+G instead.
Selections over 1,500 characters are refused with a message, by design.
```

## Distribution tab

- **Visibility: Unlisted** (installable only from the direct link; not in search or categories).
- Regions: all regions (or only the testers' countries).
- Pricing: free.

## After first upload

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
