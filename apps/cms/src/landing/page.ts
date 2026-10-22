/**
 * Marketing landing page served at `/`, `/ru` and `/uk`. Static HTML per language; the screenshots
 * come from the Chrome Web Store assets (Russian extension UI) and are served from `/assets/*`.
 */
export type LandingLang = "ru" | "uk";

/**
 * Chrome Web Store listing. The extension is not published yet, so until `CHROME_STORE_URL` is set
 * in the Vercel env to the real `chromewebstore.google.com/detail/...` link, the button opens the
 * store search for the extension name.
 */
export const DEFAULT_STORE_URL = "https://chromewebstore.google.com/search/Sprachweise";

interface Copy {
  htmlLang: string;
  title: string;
  description: string;
  tagline: string;
  lead: string;
  install: string;
  installNote: string;
  stepsTitle: string;
  steps: [string, string][];
  shotsTitle: string;
  shots: [string, string][];
  levelsTitle: string;
  levels: [string, string][];
  privacyTitle: string;
  privacy: string;
  privacyLink: string;
  footer: string;
  switchTo: { lang: LandingLang; label: string }[];
}

const COPY: Record<LandingLang, Copy> = {
  ru: {
    htmlLang: "ru",
    title: "Sprachweise — немецкий на статьях, которые вы и так читаете",
    description:
      "Расширение для Chrome: кликните абзац на любом сайте и читайте его по-немецки на своём уровне, а потом решайте упражнения по этому тексту.",
    tagline: "Расширение для Chrome",
    lead: "Sprachweise превращает статьи, которые вы и так читаете, в практику немецкого. Кликните абзац — получите его немецкую версию на вашем уровне и упражнения по нему.",
    install: "Установить из Chrome Web Store",
    installNote: "Бесплатная закрытая бета · Chrome на компьютере",
    stepsTitle: "Как это работает",
    steps: [
      [
        "Включите на сайте",
        "Включите расширение на нужном сайте в меню на панели Chrome. Chrome спросит доступ только к этому сайту.",
      ],
      [
        "Кликните абзац",
        "Абзац заменится немецкой версией на вашем уровне. Подчёркнутые слова — новая лексика: кликните слово, чтобы увидеть перевод.",
      ],
      [
        "Решайте упражнения",
        "Справа появятся упражнения по этому абзацу: пропущенное слово, выбор варианта, пары слов и диктант.",
      ],
      [
        "Вернитесь к оригиналу",
        "Повторный клик возвращает исходный текст. На странице не меняется ничего, кроме выбранных абзацев.",
      ],
    ],
    shotsTitle: "Как это выглядит",
    shots: [
      ["screenshot-1.png", "Абзац на немецком и упражнения справа"],
      ["screenshot-2.png", "Перевод слова по клику"],
      ["screenshot-3.png", "Прогресс и словарь"],
    ],
    levelsTitle: "Три уровня",
    levels: [
      ["A1–A2", "Короткие предложения и базовая лексика."],
      ["B1–B2", "Связный текст с привычными оборотами."],
      ["C1+", "Близко к оригиналу, со сложной лексикой."],
    ],
    privacyTitle: "Приватность",
    privacy:
      "Прогресс, словарь и повторения хранятся только в вашем браузере и работают без интернета. На сервер уходит только текст абзаца, по которому вы кликнули, — без адреса страницы.",
    privacyLink: "Политика конфиденциальности",
    footer: "Закрытая бета: возможны ошибки перевода — отмечайте их кнопкой «Плохой перевод».",
    switchTo: [
      { lang: "ru", label: "Русский" },
      { lang: "uk", label: "Українська" },
    ],
  },
  uk: {
    htmlLang: "uk",
    title: "Sprachweise — німецька на статтях, які ви й так читаєте",
    description:
      "Розширення для Chrome: клікніть абзац на будь-якому сайті й читайте його німецькою на своєму рівні, а потім розв’язуйте вправи за цим текстом.",
    tagline: "Розширення для Chrome",
    lead: "Sprachweise перетворює статті, які ви й так читаєте, на практику німецької. Клікніть абзац — отримайте його німецьку версію на вашому рівні та вправи до нього.",
    install: "Встановити з Chrome Web Store",
    installNote: "Безкоштовна закрита бета · Chrome на комп’ютері",
    stepsTitle: "Як це працює",
    steps: [
      [
        "Увімкніть на сайті",
        "Увімкніть розширення на потрібному сайті в меню на панелі Chrome. Chrome запитає доступ лише до цього сайту.",
      ],
      [
        "Клікніть абзац",
        "Абзац замінюється німецькою версією на вашому рівні. Підкреслені слова — нова лексика: клікніть слово, щоб побачити переклад.",
      ],
      [
        "Розв’язуйте вправи",
        "Праворуч з’являться вправи до цього абзацу: пропущене слово, вибір варіанта, пари слів і диктант.",
      ],
      [
        "Поверніться до оригіналу",
        "Повторний клік повертає початковий текст. На сторінці не змінюється нічого, крім вибраних абзаців.",
      ],
    ],
    shotsTitle: "Як це виглядає",
    shots: [
      ["screenshot-1.png", "Абзац німецькою та вправи праворуч"],
      ["screenshot-2.png", "Переклад слова за кліком"],
      ["screenshot-3.png", "Прогрес і словник"],
    ],
    levelsTitle: "Три рівні",
    levels: [
      ["A1–A2", "Короткі речення й базова лексика."],
      ["B1–B2", "Зв’язний текст зі звичними зворотами."],
      ["C1+", "Близько до оригіналу, зі складною лексикою."],
    ],
    privacyTitle: "Приватність",
    privacy:
      "Прогрес, словник і повторення зберігаються лише у вашому браузері та працюють без інтернету. На сервер надходить тільки текст абзацу, за яким ви клікнули, — без адреси сторінки.",
    privacyLink: "Політика конфіденційності",
    footer:
      "Закрита бета: можливі помилки перекладу — позначайте їх кнопкою «Плохой перевод» («Поганий переклад»).",
    switchTo: [
      { lang: "ru", label: "Русский" },
      { lang: "uk", label: "Українська" },
    ],
  },
};

const STYLE = `
  :root { color-scheme: light dark; --fg: #1f2933; --muted: #52606d; --bg: #fff; --card: #f5f7fa;
    --rule: #e4e7eb; --accent: #1a56db; --accent-fg: #fff; }
  @media (prefers-color-scheme: dark) {
    :root { --fg: #e4e7eb; --muted: #9aa5b1; --bg: #15191e; --card: #1e252c; --rule: #323f4b;
      --accent: #5b8def; --accent-fg: #0b1220; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg);
    font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main, header, footer { max-width: 960px; margin: 0 auto; padding: 0 20px; }
  header { display: flex; justify-content: space-between; align-items: center; padding-top: 20px; }
  .brand { font-weight: 700; font-size: 1.15rem; }
  nav a { color: var(--muted); text-decoration: none; margin-left: 14px; }
  nav a[aria-current] { color: var(--fg); font-weight: 600; }
  .hero { padding: 56px 0 40px; text-align: center; }
  .tag { color: var(--muted); font-size: 0.9rem; text-transform: uppercase; letter-spacing: .06em; }
  h1 { font-size: clamp(1.8rem, 5vw, 2.8rem); line-height: 1.2; margin: 8px auto 16px; max-width: 760px; }
  .lead { font-size: 1.15rem; color: var(--muted); max-width: 680px; margin: 0 auto 28px; }
  .btn { display: inline-block; background: var(--accent); color: var(--accent-fg); font-weight: 600;
    padding: 14px 28px; border-radius: 10px; text-decoration: none; }
  .btn:hover { filter: brightness(1.08); }
  .note { color: var(--muted); font-size: 0.9rem; margin-top: 12px; }
  h2 { font-size: 1.5rem; margin: 56px 0 20px; }
  .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
  .card { background: var(--card); border: 1px solid var(--rule); border-radius: 12px; padding: 18px; }
  .card h3 { margin: 0 0 6px; font-size: 1.05rem; }
  .card p { margin: 0; color: var(--muted); }
  .num { color: var(--accent); font-weight: 700; }
  figure { margin: 0 0 28px; }
  figure img { width: 100%; height: auto; border: 1px solid var(--rule); border-radius: 12px; display: block; }
  figcaption { color: var(--muted); text-align: center; margin-top: 8px; font-size: 0.95rem; }
  .cta { text-align: center; margin: 56px 0 24px; }
  footer { color: var(--muted); font-size: 0.9rem; padding-top: 24px; padding-bottom: 48px;
    border-top: 1px solid var(--rule); margin-top: 40px; }
  footer a { color: inherit; }
`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderLanding(lang: LandingLang, storeUrl: string = DEFAULT_STORE_URL): string {
  const c = COPY[lang];
  const store = esc(storeUrl);
  const button = `<a class="btn" href="${store}" rel="noopener">${c.install}</a>`;
  const nav = c.switchTo
    .map(
      (s) =>
        `<a href="/${s.lang}" hreflang="${s.lang}" lang="${s.lang}"${s.lang === lang ? ' aria-current="page"' : ""}>${s.label}</a>`,
    )
    .join("");
  const steps = c.steps
    .map(
      ([h, p], i) =>
        `<div class="card"><h3><span class="num">${i + 1}.</span> ${h}</h3><p>${p}</p></div>`,
    )
    .join("");
  const levels = c.levels
    .map(([h, p]) => `<div class="card"><h3>${h}</h3><p>${p}</p></div>`)
    .join("");
  const shots = c.shots
    .map(
      ([file, caption]) =>
        `<figure><img src="/assets/${file}" width="1280" height="800" loading="lazy" alt="${esc(caption)}"><figcaption>${caption}</figcaption></figure>`,
    )
    .join("");
  return `<!doctype html>
<html lang="${c.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${c.title}</title>
<meta name="description" content="${esc(c.description)}">
<meta property="og:title" content="${esc(c.title)}">
<meta property="og:description" content="${esc(c.description)}">
<meta property="og:image" content="https://sprachweise.vercel.app/assets/screenshot-1.png">
<link rel="alternate" hreflang="ru" href="https://sprachweise.vercel.app/ru">
<link rel="alternate" hreflang="uk" href="https://sprachweise.vercel.app/uk">
<link rel="alternate" hreflang="x-default" href="https://sprachweise.vercel.app/">
<link rel="canonical" href="https://sprachweise.vercel.app/${lang}">
<style>${STYLE}</style>
</head>
<body>
<header><span class="brand">Sprachweise</span><nav>${nav}</nav></header>
<main>
<section class="hero">
<div class="tag">${c.tagline}</div>
<h1>${c.title.split(" — ")[1] ?? c.title}</h1>
<p class="lead">${c.lead}</p>
${button}
<p class="note">${c.installNote}</p>
</section>
<section><h2>${c.stepsTitle}</h2><div class="grid">${steps}</div></section>
<section><h2>${c.shotsTitle}</h2>${shots}</section>
<section><h2>${c.levelsTitle}</h2><div class="grid">${levels}</div></section>
<section><h2>${c.privacyTitle}</h2><p>${c.privacy} <a href="/privacy">${c.privacyLink}</a>.</p></section>
<div class="cta">${button}</div>
</main>
<footer>${c.footer}</footer>
</body>
</html>
`;
}

/** `/` picks Ukrainian for browsers that prefer it, Russian otherwise. */
export function pickLang(acceptLanguage: string | undefined): LandingLang {
  const first = (acceptLanguage ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("uk") ? "uk" : "ru";
}
