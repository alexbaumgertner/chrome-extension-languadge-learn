# Handoff: Sprachweise — Chrome extension for learning German on real web pages

## Overview

Sprachweise is a Chrome MV3 extension that turns any article the user is already
reading into German practice. Paragraphs can be swapped to a German version at the
user's level, unfamiliar vocabulary is highlighted in place, and a side panel offers
exercises generated from that same paragraph. Progress (streak, active vocabulary,
per-topic accuracy, spaced-repetition queue) is tracked locally.

This bundle documents four screens: the in-page overlay, the browser-action popup,
the options/admin page, and the progress view.

## About the design files

`design/Sprachweise.dc.html` is a **design reference created in HTML** — a prototype
of the intended look and behavior, not production code to copy. The task is to
**recreate these designs inside the target codebase** (the extension is expected to be
built with WXT + React 19 + TypeScript strict, with all injected UI mounted in a
Shadow DOM), using that project's established patterns.

Open the file directly in a browser to interact with it. The exercises are live: the
fill-in-the-blank, multiple choice, word-pairing, and audio-dictation (Web Speech API)
exercises all actually validate answers.

All prototype copy is in Russian (the target learner is a Russian speaker studying
German). Implementation artifacts, code, and comments are in English.

## Fidelity

**High fidelity.** Colors, typography, spacing, radii, and shadows are final and come
from the Organic design system tokens (`design/_ds/.../styles.css`). Recreate the UI
faithfully; take every value from the CSS variables rather than hard-coding.

One deliberate exception: the prototype renders all four screens stacked on one page,
inside a fake browser chrome, so they can be reviewed together. In the real extension
they are four separate surfaces (content script overlay, popup, options page, options
page sub-view).

## Screens / Views

### 1. In-page overlay (content script)

**Purpose:** read a real article, toggle paragraphs to German, practice what's in them.

**Layout:** the host page is untouched except for the paragraph substitutions. The
extension adds one fixed element at the right edge:

- **Collapsed state (default):** a 46px-wide vertical tab flush to the right edge,
  full-height-centered. Background `--color-accent`, text `--color-bg`, the word
  SPRACHWEISE set in `--font-heading` at 14px with `writing-mode: vertical-rl` and
  `letter-spacing: .12em`. Below it a pill badge (`--color-bg` fill, `--color-accent-800`
  text, `border-radius: 999px`, 3px/7px padding, 12px bold) with the count of pending
  exercises. Clicking the tab expands the panel.
- **Expanded state:** a 412px-wide panel, `--color-bg`, `--shadow-lg`, full viewport
  height, `display: flex; flex-direction: column`.

**Panel header** (`--color-surface`, padding 18px 20px 14px, `gap: 12px`):
- 26px circular accent avatar with "S" in `--font-heading` 14px, `--color-bg` text
- "Sprachweise" in `--font-heading` 16px, `margin-right: auto`
- ghost button "Свернуть ›" at 13px, collapses the panel
- a row of wrapping tags (6px gap): current grammar topic (`.tag-accent`), current
  vocabulary set (`.tag-accent-2`), streak (`.tag-neutral`)
- progress row: an 8px-tall track (`--color-neutral-300`, `border-radius: 999px`) with
  an `--color-accent-2-500` fill, plus a "N из M" label at 12px, `opacity: .7`

**Panel body** (`flex: 1; overflow: auto`, padding 18px 20px 26px, `gap: 16px`) holds
four exercise cards. Each is `.card.elev-sm` on `--color-neutral-100`, opens with a
`.card-kicker` ("01 · из этой статьи"), and ends with a feedback line at 13px, colored
`--color-accent-2-700` when correct and `--color-accent-700` when wrong.

1. **Fill in the blank, drawn from the article.** A sentence lifted verbatim from the
   page with one token replaced by a blank chip (`--color-accent-200` fill, 6px radius,
   0/8px padding). A text `.input` plus a primary "Проверить" button. The input border
   turns `--color-accent-2-500` on a correct answer and `--color-accent-500` on a wrong
   one. Answer matching is normalized: lowercased, punctuation stripped, whitespace
   collapsed; accept both umlaut and transliterated forms (`möchte` / `moechte`).
2. **Multiple choice.** A sentence with a blank and three full-width `.btn-secondary`
   options, left-aligned in a vertical stack (8px gap). On answer: the chosen option
   turns `--color-accent-2-200` if right, `--color-accent-200` if wrong, and the correct
   option is simultaneously revealed in `--color-accent-2-200`.
3. **Word pairing.** A 2-column grid (8px gap) alternating German words (left) and
   Russian meanings (right). The interaction is pick-left-then-pick-right: the selected
   German word gets `--color-accent-300`; a correct pair locks both cells to
   `--color-accent-2-200` and clears the selection; a wrong pick flashes the Russian cell
   `--color-accent-200`. Picking a Russian word first shows "Сначала выберите немецкое
   слово слева." Locked cells are inert. Status line counts matched pairs.
4. **Audio dictation.** A primary "▶ Прослушать" button and a ghost "медленно" button —
   both speak the target sentence with the Web Speech API (`lang: 'de-DE'`, rate 0.95 and
   0.6 respectively; cancel any in-flight utterance first). A text `.input` plus an "ОК"
   button, validated with the same normalization as exercise 1.

Below the cards: a full-width `.btn-secondary.btn-block` "Сбросить упражнения" that
clears all four exercise states.

**Paragraph substitution (the core interaction):** each participating paragraph is a
click target with `cursor: pointer`, `border-radius: var(--radius-md)`, padding 8px 12px,
`margin-left: -12px` (so the hover tint bleeds into the left gutter), and a hover
background of `color-mix(in srgb, var(--color-accent) 9%, transparent)`. Clicking swaps
the original text for the German version; clicking again restores it. German text renders
in `--color-accent-900` at the paragraph's own size and line-height (17px / 1.65 in the
prototype — in production inherit from the host page). Target vocabulary inside a
paragraph is wrapped in a chip: `--color-accent-200` background, 6px radius, 0/5px
padding, `box-shadow: inset 0 -2px 0 var(--color-accent-400)`, with the translation in
the `title` attribute (production should use a themed tooltip, not the native one).

A status line under the article shows a 9px pulsing accent dot (`swPulse`: scale 1 → 1.35,
opacity .9 → .35, 2.4s ease-in-out infinite) with a hint that changes from "Нажмите на
любой абзац" to a count of translated paragraphs.

### 2. Popup (browser action)

**Purpose:** turn the extension on or off for the current site, see today's numbers, and
jump to the full settings.

**Layout:** 380px wide, `--color-bg`, `border-radius: calc(var(--radius-lg) * 1.15)`,
`--shadow-lg`, 20px padding, vertical stack with 16px gap.

- Header row: 28px circular accent avatar with "S", "Sprachweise" in `--font-heading` 17px,
  streak tag pushed right.
- Site toggle block: `--color-surface`, `--radius-lg`, 14px padding. Left side has the
  state title in `--font-heading` 15px ("Работает на этом сайте" / "Выключено на этом
  сайте") over the hostname at 12px `opacity: .65`. Right side is a 52×30 pill switch,
  3px padding, 24px circular knob (`--color-bg`, `--shadow-sm`); track is
  `--color-accent-2-500` when on and `--color-neutral-400` when off, animated with
  `transition: background .2s` and `justify-content` flip.
- Three label/value rows at 14px (label `opacity: .7`, value bold): grammar topic,
  vocabulary set, exercises solved today.
- Two equal-width buttons: primary "Настройки" and secondary "Прогресс", both opening the
  options page (the latter deep-links to the progress view).
- A ghost button, 13px: "Не трогать этот сайт 7 дней".

### 3. Admin / options page

**Purpose:** choose the grammar topic and level, manage vocabulary, control which sites
the extension may touch, and set when it interrupts.

**Layout:** a full-width page. A `.nav` header on `--color-surface` carries `.nav-brand`
"Sprachweise", four links (Обучение / Словарь / Сайты / Прогресс, current one marked with
`aria-current="page"`), and a `.tag-accent-2` "Синхронизировано" status. Below it a
`grid-template-columns: 1.35fr 1fr` with 34px gap, padded 34px 38px 42px.

**Left column** (26px gap):
- *Current grammar topic* — an H3, an explanatory paragraph at 14px `opacity: .7`, then a
  2×2 grid of `.radio` cards (10px gap, 12px/14px padding, `--radius-lg`). The selected
  card sits on `--color-accent-100`, the others on `--color-surface`. Each card stacks a
  bold topic name over an accuracy line at 12px `opacity: .6`.
- Two `.field` groups side by side, each a `.seg` segmented control: **Уровень**
  (A1–A2 / B1–B2 / C1+) and **Сколько переводить на странице** (Немного / Средне / Максимум).
- *Vocabulary* — heading row with an `.tag-accent` count and a right-aligned secondary
  "+ Добавить слово" button; a search `.input` capped at 420px; a `.table` with columns
  Слово / Перевод / Встречалось / Статус, the status cell holding a tag: `.tag-accent-2`
  for "в активе" and "выучено", `.tag-accent` for "повторить", `.tag-neutral` for "новое".

**Right column** (24px gap), three cards:
- *Site rules* on `--color-surface` — kicker "Разрешения", title "Правила сайтов", a 13px
  `.table` of hostnames each with a right-aligned `.tag-accent-2` "включено" or
  `.tag-outline` "никогда", and a block secondary "Добавить сайт" button.
- *Exercise sources* on `--color-accent-100` — kicker, title "Смешанный режим", body copy,
  and a wrapping tag row for the enabled sources.
- *Schedule* on `--color-surface` — kicker "Расписание", title "Когда предлагать", and
  three `.radio` options at 14px: only on manual open / every 20 minutes of reading /
  every new article.

All radios and segmented options are native inputs with matching `for`/`id` pairs and one
`name` per group.

### 4. Progress view

**Purpose:** show whether the habit is holding and what needs review.

**Layout:** same page shell as the admin screen, padded 34px 38px 42px, 30px gap.

- A `repeat(4, 1fr)` metric grid (16px gap). Each `.card` has a `.card-kicker`, a number in
  `--font-heading` at 46px / `line-height: 1`, and a 13px caption at `opacity: .7`. Cards 1
  and 4 are tinted (`--color-accent-100`, `--color-accent-2-100`); cards 2 and 3 sit on
  `--color-surface`. Metrics: streak, active vocabulary, learned, due for review.
- Below, a two-column grid (34px gap):
  - *Accuracy by topic* — for each topic a label/percent row at 14px (percent bold) over a
    10px track (`--color-neutral-300`, `border-radius: 999px`) with a fill colored
    `--color-accent-500`, `--color-accent-2-500`, or `--color-accent-400`. A closing note
    at 14px `opacity: .7` and a primary button that promotes the weakest topic to current.
  - *Review queue* — a `.table` with Слово / Повторов / Следующий, where due items carry a
    `.tag-accent` "сейчас" and future ones show plain relative text. A secondary button
    starts a review session.

## Interactions & behavior

- **Paragraph toggle** — click anywhere in a participating paragraph to swap RU ⇄ DE; state
  is per-paragraph and independent. In production the substitution must be fully reversible:
  keep the original nodes and restore them exactly when the extension is disabled.
- **Panel collapse/expand** — clicking the vertical tab or "Свернуть ›" flips the panel;
  the tab and the panel are mutually exclusive.
- **Site toggle** — flips the switch and the title text; in production this is what triggers
  the `optional_host_permissions` request for the current origin.
- **Exercise feedback** is immediate and explanatory, never a bare "wrong": each wrong answer
  message contains a hint pointing back to the source sentence.
- **Answer normalization** — lowercase, strip `.,!?;:`, collapse whitespace, trim.
- **Audio** uses `SpeechSynthesisUtterance` with `lang = 'de-DE'`; wrap in try/catch and
  degrade silently where synthesis is unavailable. Production should prefer a server TTS
  proxy for consistent voices, with Web Speech as fallback.
- **Hover / focus / pressed** states come from the design system, not from browser defaults:
  a hover tint and a pressed step from the accent ramp, and
  `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }`.

## State management

Per-surface state visible in the prototype:

- `translatedParagraphs: Set<paragraphId>` — which paragraphs currently show German
- `panelOpen: boolean` — side panel expanded
- `enabledHere: boolean` — extension active on the current origin
- `gap: { value: string, status: 'idle' | 'ok' | 'bad' }`
- `mc: number | null` — chosen multiple-choice index
- `pairing: { selectedGerman: number | null, matched: Record<number, number>, wrong: number | 'no-de' | null }`
- `dictation: { value: string, status: 'idle' | 'ok' | 'bad' }`
- derived: `solvedCount`, `progressPct`, hint strings

Persisted (chrome.storage, local-first source of truth): site allow/deny rules, current
topic, level, translation density, schedule mode, vocabulary entries with encounter counts
and status, SRS scheduling state, streak and daily solved counters.

Fetched: German paragraph variants and exercise items for a given text and topic; TTS audio.
Both must be cached so previously seen material works offline.

## Design tokens

Colors (from `styles.css`):

- Ground `--color-bg` #f5ead8 · surface `--color-surface` #ebddc5 · text `--color-text` #201e1d
- Accent `--color-accent` #c67139 · second accent `--color-accent-2` #7a8a5e
- Divider `--color-divider` = `color-mix(in srgb, #201e1d 16%, transparent)`
- Neutral ramp 100→900: #f9f4ed #eee7db #dcd3c4 #c0b6a5 #a19786 #82796a #645c50 #474238 #2e2b25
- Accent ramp 100→900: #fff2eb #ffe1d0 #ffc6a5 #f6a06b #d67f48 #b2622d #8c491a #643312 #402310
- Accent-2 ramp 100→900: #f0fae1 #e1eecc #ccdbb2 #aebf92 #8fa073 #728157 #56633f #3d472b #272e1b

Type: `--font-heading` "Caprasimo" (weight 400) · `--font-body` "Figtree".
Body copy 14–17px; panel cards 15px; captions 12–13px; metric numbers 46px; page H1 44px.

Spacing (density 1.10×): 4.4 / 8.8 / 13.2 / 17.6 / 26.4 / 35.2px.

Radii: `--radius-sm` 8px · `--radius-md` 16px · `--radius-lg` 28px · pills and switches 999px.
Large containers use `calc(var(--radius-lg) * 1.15)`.

Shadows: `--shadow-sm` `0 1px 2px`, `--shadow-md` `0 3px 10px`, `--shadow-lg` `0 12px 32px`,
each in `color-mix(in srgb, #2e2b25 14%/16%/22%, transparent)`.

Note that colors depend on `color-mix()` and OKLCH-derived ramps — keep the CSS custom
properties rather than flattening them to hex in code.

## Assets

No images. Icons in the prototype are text glyphs (▶, 🔥); production should use
[Lucide](https://lucide.dev) at `stroke-width: 2.75`, per the design system. The "S" brand
mark is a circle filled with `--color-accent` containing the letter in `--font-heading`.

## Constraints carried over from the project constitution

These shape the implementation and are not negotiable in review:

- No `<all_urls>` and no default `host_permissions`; page access via `activeTab` plus
  `optional_host_permissions` requested by an explicit user gesture.
- All injected UI lives in a Shadow DOM with isolated styles; text substitution is fully
  reversible; nothing outside user-selected blocks is mutated.
- Page content does not leave the device without consent — only the selected fragment, with
  no URL, no user id, no history.
- Learned vocabulary, SRS cards, and cached translations work offline.
- Every cross-context message and CMS response is validated by a shared Zod schema;
  TypeScript strict; no `any` at boundaries.
- Mandatory tests: DOM substitution/restoration, paragraph parser, SRS scheduler, contract
  schemas.

## Files

- `design/Sprachweise.dc.html` — the interactive prototype; open in a browser
- `design/_ds/organic-…/styles.css` — the design system token sheet and component classes
- `design/_ds/organic-…/readme.md` — the Organic design system guide
- `design/_ds/organic-…/_ds_bundle.js`, `design/support.js` — runtime files the prototype
  needs in order to open; not part of the implementation
