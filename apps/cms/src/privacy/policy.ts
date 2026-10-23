/**
 * Privacy policy served at /privacy (FR-012), Russian then English. Every statement here must match
 * the code: what the extension sends (lib/cms/client.ts, lib/metrics/events.ts), what the server
 * stores (src/db.ts) and for how long (RETENTION_DAYS, the write-once translation cache). Gemini's
 * and Vercel's handling is linked, not paraphrased.
 */
const UPDATED_RU = "23 октября 2026";
const UPDATED_EN = "23 October 2026";
const CONTACT = "alex.baumgertner+sprachweise@gmail.com";

const GEMINI_TERMS = "https://ai.google.dev/gemini-api/terms";
const GOOGLE_PRIVACY = "https://policies.google.com/privacy";
const VERCEL_PRIVACY = "https://vercel.com/legal/privacy-notice";
const CWS_POLICY = "https://developer.chrome.com/docs/webstore/program-policies/limited-use";

const link = (href: string, text: string) => `<a href="${href}" rel="noopener">${text}</a>`;

const RU = `
<section lang="ru" id="ru">
<h1>Политика конфиденциальности Sprachweise</h1>
<p class="meta">Обновлено: ${UPDATED_RU} · <a href="#en">English version below</a></p>

<p>Sprachweise — расширение для Chrome: вы выделяете текст на странице, выбираете в меню правой
кнопки «Перевести на немецкий (Sprachweise)» и читаете его по-немецки на своём уровне. Здесь описано,
какие данные уходят с вашего устройства, где они хранятся и сколько.</p>

<h2>Что отправляется на наш сервер</h2>
<ul>
<li><strong>Выделенный вами текст</strong> и выбранный уровень (A1–A2, B1–B2, C1+). Только после
того, как вы выбрали пункт меню «Перевести на немецкий (Sprachweise)» или нажали сочетание клавиш
расширения. Отправляется только выделенный текст (если выделен уже переведённый текст — исходный
текст этого абзаца); за один раз — не больше 1500 знаков. До вашего выбора расширение не видит страницу и ничего не отправляет. Адрес
страницы и остальной текст страницы не отправляются.</li>
<li><strong>Текст для упражнений.</strong> После перевода расширение отправляет на наш сервер полученный
немецкий текст, подсвеченные слова с русскими подсказками и уровень, чтобы собрать упражнения. Это
вычисление на нашем сервере: Google Gemini для упражнений не вызывается, идентификатор установки не
отправляется, ничего из этого не хранится.</li>
<li><strong>Метрики использования</strong> со <strong>случайным идентификатором установки</strong>
(UUID, который расширение создаёт при установке; он не связан с вашим именем, почтой, устройством
или аккаунтом). С ним уходят только события: установка; абзац переведён (взят ли перевод из общего
кэша и сколько миллисекунд занял запрос); упражнение выполнено; ошибка (код ошибки, например
«нет сети» или «сервис недоступен», и HTTP-статус). У каждого события есть свой случайный номер,
чтобы повторно отправленное событие не посчиталось дважды. Сервер сохраняет только день (UTC), без
точного времени. Идентификатор никогда не отправляется вместе с текстом для перевода и не
используется ни для чего, кроме подсчёта использования.</li>
<li><strong>Отчёт «Плохой перевод»</strong> — только если вы нажали эту кнопку: исходный текст,
его немецкий перевод, уровень, плотность перевода, название модели и версия промпта. Без
идентификатора установки.</li>
</ul>

<h2>Перевод через Google Gemini</h2>
<p>Чтобы перевести текст, наш сервер передаёт его и уровень в Google Gemini API. Больше
ничего (ни идентификатор установки, ни ваш IP-адрес) мы Google не передаём. Google обрабатывает
эти данные по своим правилам: ${link(GEMINI_TERMS, "Gemini API Additional Terms of Service")}
(раздел «How Google Uses Your Data») и ${link(GOOGLE_PRIVACY, "Политика конфиденциальности Google")}.</p>

<h2>Что мы храним и сколько</h2>
<p>База данных — Neon Postgres во Франкфурте (ЕС), сервер — Vercel, регион Франкфурт.</p>
<ul>
<li><strong>Кэш переводов</strong>: хэш SHA-256 переведённого текста (не сам текст), немецкий перевод и
русские подсказки к словам. Кэш общий для всех пользователей и ни с кем не связан: если кто-то
переведёт тот же текст на том же уровне, перевод возьмётся из кэша. Хранится без срока, пока мы его
не очистим.</li>
<li><strong>События метрик</strong> (см. выше): удаляются автоматически через 90 дней.</li>
<li><strong>Отчёты «Плохой перевод»</strong>: удаляются автоматически через 90 дней.</li>
<li><strong>Технические счётчики</strong>: число вызовов Gemini в день, модель, количество токенов,
стоимость и длительность вызова. Без текста и без идентификатора установки.</li>
</ul>

<h2>Журналы хостинга (Vercel)</h2>
<p>Наш сервер работает на Vercel. Vercel автоматически ведёт журналы запросов к серверу, в том
числе с <strong>IP-адресом</strong>, временем и адресом запроса (например, <code>/api/translate</code>),
и хранит их ограниченное время по своим правилам: ${link(VERCEL_PRIVACY, "Vercel Privacy Notice")}.
Тело запроса (текст, идентификатор установки) в эти журналы не попадает. Мы не копируем
IP-адреса в свою базу, и журналы нашего приложения их не записывают.</p>

<h2>Что остаётся на вашем устройстве</h2>
<p>Настройки, словарь, прогресс, упражнения, сохранённые переводы,
идентификатор установки и ещё не отправленные события хранятся в хранилище расширения
(<code>chrome.storage</code>, IndexedDB) и удаляются вместе с расширением.</p>
<p>Диктант озвучивает немецкие предложения встроенным синтезом речи браузера. Если Chrome
использует онлайн-голос Google, Chrome сам отправляет это предложение в Google.</p>

<h2>Чего мы не собираем</h2>
<p>Адреса страниц, историю просмотров, список ваших сайтов, имя, почту, аккаунты, платёжные
данные. Мы не продаём и не передаём данные для рекламы. Использование данных, полученных
расширением, соответствует ${link(CWS_POLICY, "Chrome Web Store User Data Policy")}, включая
требования Limited Use.</p>

<h2>Разрешения расширения</h2>
<p><code>contextMenus</code> — пункты «Перевести на немецкий» и «Вернуть исходный текст» в меню
правой кнопки; <code>activeTab</code> — временный доступ к текущей вкладке, который Chrome даёт только
в момент, когда вы выбрали пункт меню или нажали сочетание клавиш расширения; <code>scripting</code> —
запустить расширение в этой вкладке в этот момент; <code>storage</code> — хранить ваши данные
локально. Постоянного доступа к сайтам у расширения нет.</p>

<h2>Ваш выбор</h2>
<p>Не выбирайте пункт меню — ничего не будет отправлено. Удалите расширение —
локальные данные удалятся, а события на сервере удалятся через 90 дней. Вопросы и просьбы об
удалении: <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
</section>`;

const EN = `
<section lang="en" id="en">
<h1>Sprachweise privacy policy</h1>
<p class="meta">Last updated: ${UPDATED_EN}</p>

<p>Sprachweise is a Chrome extension: you select text on a page, choose "Translate to German
(Sprachweise)" from the right-click menu and read it in German at your level. This page explains
what leaves your device, where it is stored and for how long.</p>

<h2>What is sent to our server</h2>
<ul>
<li><strong>The text you selected</strong> and your chosen level (A1–A2, B1–B2, C1+), only after you
choose "Translate to German (Sprachweise)" from the right-click menu or press the extension's
keyboard shortcut. Only the selected text is sent (for text already shown in German, the original
text of that paragraph); at most 1,500 characters at a time. Until you make that choice the extension cannot see the page and
sends nothing. The page address and the rest of the page are not sent.</li>
<li><strong>Text for exercises.</strong> After a translation the extension sends our server the German
text it received, the highlighted words with their Russian glosses and the level, so the server can build
the exercises. This is computed on our server: Google Gemini is not called for exercises, the install ID
is not sent and none of it is stored.</li>
<li><strong>Usage metrics</strong> with a <strong>random install ID</strong> (a UUID the extension
creates when installed; it is not derived from your name, email, device or any account). Only these
events are sent with it: install; paragraph translated (whether it came from the shared cache and
how many milliseconds the request took); exercise completed; error (an error code such as
"offline" or "service unavailable", and the HTTP status). Each event has its own random ID so an
event sent twice is counted once. The server keeps only the day (UTC), not the exact time. The
install ID is never sent together with the text to translate and is used for nothing but counting
usage.</li>
<li><strong>A "Плохой перевод" (bad translation) report</strong>, only when you click that button: the
source text, its German translation, the level, the translation density, the model name and
the prompt version. No install ID.</li>
</ul>

<h2>Translation by Google Gemini</h2>
<p>To translate your selection, our server sends the text and level to the Google Gemini API. Nothing
else (no install ID, not your IP address) is passed to Google. Google handles this data under its own
terms: the ${link(GEMINI_TERMS, "Gemini API Additional Terms of Service")} (section "How Google Uses
Your Data") and the ${link(GOOGLE_PRIVACY, "Google Privacy Policy")}.</p>

<h2>What we store and for how long</h2>
<p>Database: Neon Postgres in Frankfurt (EU). Server: Vercel, Frankfurt region.</p>
<ul>
<li><strong>Translation cache</strong>: a SHA-256 hash of the translated text (not the text itself), the
German translation and the Russian word glosses. The cache is shared by all users and linked to no
one: if anyone translates the same text at the same level, the cached translation is served. Kept
with no expiry until we clear it.</li>
<li><strong>Metric events</strong> (above): deleted automatically after 90 days.</li>
<li><strong>Bad translation reports</strong>: deleted automatically after 90 days.</li>
<li><strong>Technical counters</strong>: Gemini calls per day, model, token counts, cost and call
duration. No text and no install ID.</li>
</ul>

<h2>Hosting logs (Vercel)</h2>
<p>Our server runs on Vercel. Vercel automatically keeps request logs, including your
<strong>IP address</strong>, the time and the requested path (for example <code>/api/translate</code>),
for a limited period under its own rules: ${link(VERCEL_PRIVACY, "Vercel Privacy Notice")}. Request
bodies (text, install ID) are not part of these logs. We do not copy IP addresses into our
database, and our application logs do not record them.</p>

<h2>What stays on your device</h2>
<p>Settings, vocabulary, progress, exercises, saved translations, the install ID and
not-yet-sent events are kept in extension storage (<code>chrome.storage</code>, IndexedDB) and are
removed with the extension.</p>
<p>Dictation exercises speak German sentences with your browser's built-in speech synthesis. If
Chrome uses an online Google voice, Chrome itself sends that sentence to Google.</p>

<h2>What we never collect</h2>
<p>Page addresses, browsing history, your list of sites, name, email, accounts, payment data. We do
not sell data or use it for advertising. The use of information received by the extension adheres to
the ${link(CWS_POLICY, "Chrome Web Store User Data Policy")}, including the Limited Use requirements.</p>

<h2>Extension permissions</h2>
<p><code>contextMenus</code> adds "Translate to German" and "Restore original text" to the right-click
menu; <code>activeTab</code> is temporary access to the current tab that Chrome grants only at the
moment you choose one of those items or press the extension's keyboard shortcut;
<code>scripting</code> starts the extension in that tab at that moment; <code>storage</code> keeps
your data locally. The extension has no standing access to any website.</p>

<h2>Your choices</h2>
<p>If you don't choose the menu item, nothing is sent. Uninstall the extension and local data is
removed; server-side events expire after 90 days. Questions and deletion requests:
<a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
</section>`;

export const PRIVACY_POLICY_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sprachweise — Privacy policy</title>
<style>
  :root { color-scheme: light dark; --fg: #1f2933; --muted: #52606d; --bg: #fff; --rule: #e4e7eb; }
  @media (prefers-color-scheme: dark) {
    :root { --fg: #e4e7eb; --muted: #9aa5b1; --bg: #15191e; --rule: #323f4b; }
  }
  body { margin: 0; background: var(--bg); color: var(--fg);
    font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 1.6rem; line-height: 1.25; margin: 0 0 4px; }
  h2 { font-size: 1.1rem; margin: 28px 0 8px; }
  .meta { color: var(--muted); margin: 0 0 20px; font-size: 0.9rem; }
  section + section { border-top: 1px solid var(--rule); margin-top: 48px; padding-top: 32px; }
  li { margin-bottom: 8px; }
  a { color: inherit; }
  code { font-size: 0.9em; }
</style>
</head>
<body><main>${RU}${EN}</main></body>
</html>
`;
