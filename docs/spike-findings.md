# Spike: DOM block-marking / restore test

Snippet: `docs/spike-snippet.js`
Procedure per site: open an article, run the snippet in the console, note block count, wait 30s and scroll, check whether `[[DE n]]` labels are still present, call `__spikeRestore()`, verify the DOM is back to its original state (no `[data-spike]` elements, no `[[DE` text left).

| Site | Article tested | Blocks found | Labels survived 30s + scroll | `__spikeRestore()` result | Notes |
|---|---|---|---|---|---|
| spiegel.de | Aiwanger-Flugblattaffäre (politik/deutschland) | 6 | Yes | Clean (0 `[data-spike]`, no `[[DE`) | Straightforward article, no interference |
| zeit.de | AfD-Verbotsverfahren Proteste (politik/deutschland) | 12 | Yes | Clean | Cookie-consent modal appeared on load; had to dismiss before injecting |
| tagesschau.de | Tschentscher Steuerpolitik (inland/innenpolitik) | 14 | Yes | Clean | One marked block was a "mehr" teaser card for a *related* article embedded mid-body, not the article's own text — selector isn't scoped tightly to the primary article |
| de.wikipedia.org | Deutschland | 285 | Yes, incl. inside infobox table cells | Clean | High count driven by `li`/`div` matches across references, infobox rows, and body text; nested infobox cell showed `[[DE 0]]` re-appearing inside a parent `[[DE 9]]` block — selector's "deepest block" filter doesn't fully dedupe nested table content |
| reddit.com | r/de comments thread (AfD-Verbotsverfahren post) | 114 | Yes, through nested comment replies | Clean | Comment tree is deeply nested; labels stayed correctly attached per comment after scrolling through several reply levels |
| habr.com | "Смерть b2b-компаний на рубеже пяти лет" | 51 | Yes | Clean | No issues |
| medium.com | "Causal Inference with Python..." (LS Analytics) | 9 | Yes, incl. inside paywall CTA | Clean | Article hit Medium's paywall partway down; the paywall's "Become a member" prompt text also got labeled/outlined like body content |
| meduza.io | "В 1980-х бортпроводники создали целую сеть..." (feature) | 39 | Yes | Clean | Long-read feature article, no interference |
| bbc.com/russian | "Никто не застрахован от новых российских ударов на Черном море..." | 47 | Yes | Clean | No issues; short paragraphs (<80 chars) between marked blocks correctly left unlabeled |
| dw.com/ru | "Россия и Сирия договорились о будущем военных баз РФ" | 6 | Yes | Clean | Short news item; also had a DW-specific cookie-consent dialog (declined non-essential) before injection |
| echofm.online | "В Москве арестовали бывшего и действующего гендиректоров компании по производству дронов" | 3 | Yes | Clean | Very short news item; page also has a sticky live-radio player embed alongside the article, which was correctly excluded from marked blocks |

## Summary

- `__spikeRestore()` fully reverted the DOM (0 `[data-spike]` elements, no `[[DE` text remaining) on all 11 sites tested — no leaks observed.
- Labels and outlines remained visually stable after a 30s wait plus scrolling on every site, including sites with dynamic/lazy-loaded content (reddit comments, Wikipedia's long article, Medium's paywall injection, echofm.online's live-radio embed).
- Block count varies enormously by site structure (3–285), largely driven by how many `p`/`li`/`div` elements exceed the 80-character threshold, not by article length alone (Wikipedia's infobox and reference list inflate the count; short news items on dw.com and echofm.online produced very few blocks).
- Two structural false-positives observed: tagesschau.de's related-article teaser card, and Medium's paywall CTA — both got treated as content blocks despite not being article body text. A tighter scope (e.g. restrict traversal to a single `article`/main-content root, or explicitly exclude known teaser/paywall containers) would reduce these.
- News aggregator/opposition-media sites (meduza.io, bbc.com/russian, dw.com/ru, echofm.online) behaved the same as the mainstream German outlets — no additional DOM quirks, though zeit.de and dw.com both required dismissing a cookie-consent modal before injection.
˝