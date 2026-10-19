# Implementing the Sprachweise handoff in the extension

How each screen and component in this handoff maps onto the extension as it ships today
(`apps/extension`, after PR #5: select text → context menu or Alt+Shift+G → translate, with
`activeTab` only). The rule for this pass: **restyle, don't re-scope**. Behaviour, message flow,
selection logic, error codes, permissions, manifest, backend and i18n keys stay as they are.
Anything the handoff shows that would need new behaviour is listed as not implemented, with the
reason.

Status legend: **done** — implemented as specified · **adapted** — implemented with a deviation
noted · **not implemented** — out of scope for a restyle, with the reason.

## Design system

| Handoff | Extension | Status |
| --- | --- | --- |
| Tokens in `styles.css` `:root` (colours, ramps, divider, fonts, spacing, radii, shadows) | `apps/extension/lib/design/tokens.css` — one file, `:root, :host`, values verbatim, `color-mix()` kept | done |
| Component layer (`.btn*`, `.tag*`, `.input`, `.field`, `.radio`, `.seg*`, `.card*`, `.elev-*`, `.nav*`, `.table`, rounded frame, focus ring, 45% disabled) | `lib/design/components.css` — class selectors only, so it is safe both on extension pages and inside shadow roots | done |
| Element base rules (`body`, `h1–h6`, `p`, `a`, `::selection`) | `lib/design/base.css`, extension pages only — never inside the in-page UI | done |
| Google Fonts `@import` | Replaced: Caprasimo 400 and Figtree (variable) are vendored as woff2 under `lib/design/fonts/` (OFL-1.1). No third-party requests — the privacy policy depends on it | adapted |
| Dark mode | The handoff defines none (only light tokens). Not invented; `color-scheme: light` is set so Chrome doesn't auto-darken form controls | n/a |
| Lucide icons, stroke 2.75 | The few glyphs used (play, x, chevron) are inlined as SVG from Lucide (ISC) in `lib/design/icons.tsx` — no `lucide-react` dependency | adapted |
| Brand mark (accent circle + "S") | Already what `public/icon/*.png` show (rendered by `store/assets.spec.ts`); the handoff ships no icon assets, so icons are unchanged | done (unchanged) |

## 1. In-page overlay → content script (`entrypoints/content/`)

| Handoff component | Extension surface | Status |
| --- | --- | --- |
| Collapsed vertical tab (46px, accent, SPRACHWEISE vertical, pill badge with pending count) | `.sw-tab` in `overlay/Panel.tsx` | done — existing label ("3 exercises" / "No exercises") kept as visually hidden text for assistive tech and tests |
| Expanded panel (412px, `--color-bg`, `--shadow-lg`, full height) | `.sw-panel` | done (`max-width: 90vw` kept for narrow windows) |
| Header: avatar, "Sprachweise", ghost "Свернуть ›" | `.sw-header` | done — "Collapse ›", accessible name still "Collapse" |
| Tags row: grammar topic / vocabulary set / streak | header | adapted — only the current topic (the panel already loads settings). Vocabulary sets don't exist; the streak isn't loaded in the panel and fetching it would add a message |
| Progress row ("N из M") | header | done — "N of M" answered exercises of this paragraph |
| Exercise cards (`.card.elev-sm`, neutral-100, kicker, feedback line coloured accent-2-700 / accent-700) | `FillBlankCard`, `MultipleChoiceCard`, `WordPairingCard`, `AudioDictationCard` | done |
| 1. Fill in the blank: blank chip, input border by result, primary "Проверить" | `FillBlankCard` | done — "Check"; answer matching is the existing one (not changed) |
| 2. Multiple choice: full-width secondary options; chosen/correct tints | `MultipleChoiceCard` | done |
| 3. Word pairing: 2-column grid, selected accent-300, matched accent-2-200, wrong flashes the Russian cell | `WordPairingCard` | adapted — colours as specified, but a wrong pick keeps today's behaviour (the German word is locked as wrong) instead of a flash; the "N pairs matched" status line is not added |
| 4. Audio dictation: primary "▶ Прослушать", ghost "медленно" | `AudioDictationCard` | done — "Listen" / "slow"; playback (`lib/audio/play-dictation.ts`) untouched |
| "Сбросить упражнения" block button | — | not implemented — no reset exists; adding one is new behaviour |
| Paragraph click target, hover tint, click to toggle RU ⇄ DE | — | not implemented — since PR #5 / Constitution 3.0 consent is the menu choice or shortcut over a selection; making paragraphs clickable would change the interaction model |
| German text in `--color-accent-900` | — | not implemented — would mean styling host blocks; substitution (`lib/dom/substitution.ts`) is left untouched |
| Vocabulary chip (accent-200, 6px radius, inset accent-400 underline) | `lib/dom/render-variant.ts` inline style on `.sw-vocab` | adapted — as specified, plus its own text colour (accent-900) so it stays readable on dark host pages; values live in `lib/design/host-page-styles.ts`, checked against `tokens.css` by a unit test |
| Themed tooltip for the translation (instead of native `title`) | vocab gloss portal in `content/index.tsx` | done — the handoff gives no tooltip spec; derived (see below) |
| Pulsing status line under the article | — | not implemented — it belongs to the click-to-toggle model above |
| — (not in handoff) "Плохой перевод" report footer | `overlay/ReportBadTranslation.tsx` | derived — secondary button + tag-coloured result, strings unchanged |

## 2. Popup → `entrypoints/popup/`

| Handoff component | Status |
| --- | --- |
| 380px container, `--color-bg`, 20px padding, 16px gap | done (an extension popup can't have a rounded outer frame or shadow; Chrome draws the window) |
| Header: 28px avatar, "Sprachweise" 17px, streak tag right | done — the streak comes from the progress snapshot the popup already requests |
| Site toggle block | adapted — there is no per-site enable/disable under `activeTab` (no `optional_host_permissions`, by constitution). The surface block keeps its look and holds the existing "select text, right-click, choose …" instruction and the shortcut line |
| Label/value rows: topic, vocabulary set, solved today | adapted — "Solved today" only; topic needs a settings fetch the popup doesn't make, vocabulary sets don't exist |
| "Настройки" / "Прогресс" buttons | not implemented — new behaviour (opening and deep-linking the options page) |
| Ghost "Не трогать этот сайт 7 дней" | not implemented — no such feature |

## 3. Admin / options → `entrypoints/options/` (Settings tab)

| Handoff component | Status |
| --- | --- |
| `.nav` header on surface, brand, links with `aria-current` | adapted — the two existing tabs (Progress, Settings) as nav links; Обучение / Словарь / Сайты don't exist |
| "Синхронизировано" tag | not implemented — storage is local-only; the tag would be untrue |
| Two-column page grid, 34/38/42 padding | done (settings content fits the left column) |
| Grammar topic 2×2 radio cards with accuracy | not implemented — there is no topic picker today; adding one is new behaviour |
| Level `.seg` (A1–A2 / B1–B2 / C1+) | done — native radios replace the `<select>`, same values, same save-on-change |
| "Сколько переводить" density `.seg` | not implemented — not exposed today |
| Vocabulary table, search, "+ Добавить слово" | not implemented — no vocabulary editing |
| Site rules card | not implemented — no site rules under `activeTab` |
| Exercise sources card, Schedule card | not implemented — no such settings |

## 4. Progress view → `entrypoints/options/ProgressView.tsx`

| Handoff component | Status |
| --- | --- |
| Metric grid of cards (kicker, 46px number, caption), tints on first/last | adapted — three metrics exist (streak, active vocabulary, solved today); "learned" and "due for review" aren't shown today, so the grid is 3-up |
| Accuracy by topic: label/percent, 10px track, cycling fills | done — percent derived from the stored correct/total, which stays visible |
| "Promote weakest topic" button | not implemented — new behaviour |
| Review queue `.table`, `.tag-accent` on due items | done — columns are the data the queue has (German, Russian, due date); items due today or earlier get the tag |
| "Start review" button | not implemented — no review session |

## 5. Notices, toasts and error states → `showNotice()` in `content/index.tsx`

**Not in the handoff.** The extension shows small notices below the selection: info
("Translating…", "Select the text you want to translate first.") and errors (offline,
unavailable, limit, too long, page changed, refused selections). They are derived from the
system's own patterns:

- info: `--color-surface` fill, `--color-text`;
- error: the `.tag-accent` pairing (`--color-accent-100` fill, `--color-accent-800` text) with an
  accent-300 hairline so it reads as an alert;
- both: `--radius-md`, `--shadow-md`, Figtree 13px, the Lucide x as dismiss.

Message strings, roles (`alert` / `status`), error codes and timing are unchanged.

## Unclear or missing in the handoff

1. **No Cyrillic in either font.** Caprasimo and Figtree cover latin/latin-ext only, but all
   prototype copy is Russian. Russian text falls back to `system-ui` — exactly what the prototype
   does too. A Cyrillic-capable pairing would need a design decision.
2. **No dark mode** tokens.
3. **No toast/notice, tooltip or error-state** patterns (section 5).
4. **Copy language.** The prototype is all Russian; the extension UI is English (only the report
   button is Russian), and `_locales` has only menu/command strings. The handoff's copy describes
   features we don't have, so it isn't treated as a copy rewrite; visible labels follow the
   design (e.g. "Collapse ›", "Listen", card kickers) in the UI's current language.
5. **Fonts inside the shadow root.** `@font-face` declared inside a shadow root is ignored by
   Chrome. The content script registers the two faces with the FontFace API under unique family
   names (`Sprachweise Caprasimo`, `Sprachweise Figtree`) from data bundled in the script — no
   fetch, no `web_accessible_resources`, no effect on the host's own fonts.
6. **Popup frame.** The handoff's rounded/shadowed popup can't be drawn: Chrome owns the popup
   window.
7. **Icons.** No assets in the bundle; the store icons already match the brand mark.
