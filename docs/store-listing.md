# Chrome Web Store listing — Sprachweise (private beta)

Everything to paste into the Chrome Web Store developer dashboard for the first, **unlisted**
upload. Package: `pnpm store:zip` → `apps/extension/.output/sprachweise-<version>-chrome.zip`.
Privacy policy: <https://sprachweise.vercel.app/privacy>. Spec: `specs/003-private-beta`.

## Package

| Field | Value |
| --- | --- |
| Name | Sprachweise (from `_locales/*/messages.json`) |
| Version | 0.1.0 |
| Default locale | `en`; also `ru` |
| Permissions | `storage`, `activeTab`, `scripting` |
| Optional host permissions | `*://*/*` (requested one site at a time) |
| Host permissions | none |
| Content scripts in manifest | none (registered at runtime per enabled site) |

## Store listing tab

**Name:** Sprachweise

**Summary** (from the manifest, ≤ 132 characters, shown in the viewer's language):

- RU: Кликните абзац на сайте, где включили расширение, и читайте его по-немецки на своём уровне,
  а потом решайте упражнения.
- EN: Click a paragraph on a site you enable to read it in German at your level, then practice with
  exercises built from it.

**Category:** Education (under Productivity)

**Language:** Russian (primary); add English as a second listing language.

### Detailed description — RU

```text
Sprachweise превращает статьи, которые вы и так читаете, в практику немецкого.

Как это работает
• Включите расширение на нужном сайте в меню на панели Chrome. Chrome спросит доступ только к этому сайту.
• Кликните абзац — он заменится немецкой версией на вашем уровне: A1–A2, B1–B2 или C1+.
• Подчёркнутые слова — новая лексика. Кликните слово, чтобы увидеть перевод.
• Справа появятся упражнения по этому абзацу: пропущенное слово, выбор варианта, пары слов и диктант.
• Повторный клик возвращает оригинал. Страница сайта не меняется ни в чём, кроме выбранных абзацев.

Прогресс, словарь и повторения хранятся только в вашем браузере и работают без интернета.

Приватность
• На сервер уходит только текст абзаца, по которому вы кликнули, — без адреса страницы.
• Для подсчёта использования расширение отправляет случайный идентификатор установки и события («абзац переведён», «упражнение выполнено», ошибки) — без текста.
• Кнопка «Плохой перевод» отправляет абзац и перевод на проверку только по вашему клику.
Подробно: https://sprachweise.vercel.app/privacy

Это закрытая бета: возможны ошибки перевода — пожалуйста, отмечайте их кнопкой «Плохой перевод».
```

### Detailed description — EN

```text
Sprachweise turns the articles you already read into German practice.

How it works
• Enable the extension on a site from its toolbar menu. Chrome asks for access to that one site only.
• Click a paragraph to swap it for a German version at your level: A1–A2, B1–B2 or C1+.
• Underlined words are new vocabulary. Click one to see its meaning.
• Exercises built from that paragraph appear on the right: fill in the blank, multiple choice, word pairs and dictation.
• Click again to bring back the original. Nothing on the page changes except the paragraphs you choose.

Progress, vocabulary and reviews stay in your browser and work offline.

Privacy
• Only the text of the paragraph you click is sent to our server, never the page address.
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
> Shows a paragraph the user clicks on a site they enabled in German at the user's level, with
> vocabulary glosses and exercises built from that paragraph.

### Permission justifications

| Permission | Justification |
| --- | --- |
| `storage` | Keeps the learner's settings, enabled sites, vocabulary, exercise progress, saved translations, the random install ID and unsent usage events in the browser, so learning works offline. |
| `activeTab` | When the user opens the toolbar menu, reads the current tab's hostname so the menu can show and toggle "Enable on this site" for that site. |
| `scripting` | Registers the paragraph-click script only for the sites the user enabled (chrome.scripting.registerContentScripts), instead of declaring a content script for all websites. |
| Optional host permissions `*://*/*` | Requested for one site at a time (`*://<hostname>/*`) when the user clicks "Enable on this site", so the extension can read the paragraph the user clicks and replace it with German. Nothing is requested at install, and disabling a site releases its permission. |

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
| Website content | **Yes** | The text of a paragraph the user clicks, sent to our server and Google Gemini to translate it; on an explicit "Плохой перевод" click, that paragraph and its translation for quality review. |

Note on Location: our app does not store IP addresses, but Vercel's request logs record them (the
privacy policy says so). Google's form defines Location as including IP address. If you prefer the
form to mirror the policy literally, also tick Location. Either way the policy discloses it.

Certify all three:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** `https://sprachweise.vercel.app/privacy`

## Distribution tab

- **Visibility: Unlisted** (installable only from the direct link; not in search or categories).
- Regions: all regions (or only the testers' countries).
- Pricing: free.

## After the first upload (before inviting testers)

1. Copy the item ID from the dashboard URL (32 letters a–p). The extension's origin is
   `chrome-extension://<item id>`.
2. Add it to `CORS_ALLOWED_ORIGINS` on Vercel (production), comma-separated next to the unpacked
   dev ID, and redeploy. Without this every translation from the store build fails with a CORS
   error.
3. Replace `TODO_CONTACT_EMAIL` in `apps/cms/src/privacy/policy.ts` and redeploy before submitting.
