# Sprachweise: анализ оптимизаций (стоимость, задержка, cold start)

- Дата: 2026-10-29. Ветка: `main` (`db41053`). Только анализ: код не менялся, сеть и БД не трогались.
- Источник истины: код на `main`. README мог устареть, поэтому опирался на `apps/cms/src`, `apps/extension`, `packages/shared`, `docs/quality/2026-10-19`, `specs/003-private-beta/metrics.sql` и `docs/ship-first-dollar.md`.
- Статусы:
  - **VERIFIED**: видно прямо в коде или в зафиксированных отчётах.
  - **HYPOTHESIS**: вывод или оценка, нужен замер. Для каждой гипотезы ниже указано, какой замер её закроет.
- Контекст масштаба. Сейчас приватная бета, глобальный лимит 1500 платных вызовов в сутки (`apps/cms/src/config.ts:13`). Абсолютные суммы малы. Поэтому важнее всего (а) ограничить худший случай расходов, когда листинг станет публичным, и (б) учесть, что 1 января 2027 текущая модель подорожает вдвое.

## Базовые цифры (из кода и `docs/quality`)

| Параметр | Значение | Доказательство |
| --- | --- | --- |
| Модель / thinking по умолчанию | `gemini-3.8-flash` / `low` | `apps/cms/src/config.ts:5,7`, `apps/cms/.env.example:4-5` |
| Таймаут Gemini, лимит текста | 15000 ms, 5000 символов | `apps/cms/src/config.ts:8,11` |
| Токены на абзац (prompt v2, 3.8-flash) | 386 in / 339 out (7724/6778 на 20 абзацев), 0 thinking | `docs/quality/2026-10-19/runs/gemini-3.8-flash-prompt-v2.md:4-8` |
| Цена абзаца сейчас | $0.00156, avg 3507 ms, p95 4607 ms | там же, `docs/quality/2026-10-19/judge-3.8-prompt-v1-vs-v2.md:9` |
| Доля output в стоимости | ≈81% (339×$3.75 = 1271 µ$ против 386×$0.75 = 290 µ$) | расчёт по `apps/cms/src/pipeline/pricing.ts:9,13-21` |
| Цена 3.6/3.8 с 2027-01-01 | ×2: [1.5, 7.5] $/1M, то есть ≈$0.00312 за абзац | `apps/cms/src/pipeline/pricing.ts:7-9` |
| 3.1-flash-lite (prompt v1) | 4.30 балла против 4.86, $0.00039 против $0.00116, 1343 ms против 3149 ms | `docs/quality/2026-10-19/judge-4-models.md:9,11` |

Разбивка оценок судьи по уровням я посчитал из `judge-4-models.md` (по 11 абзацев A1-A2 и 9 абзацев B1-B2):
- `gemini-3.8-flash`: A1-A2 **4.91**, B1-B2 **4.81**, 13 замечаний, 0 абзацев с grammar ≤ 3.
- `gemini-3.1-flash-lite`: A1-A2 **4.02**, B1-B2 **4.64**, 37 замечаний, 4 абзаца с grammar ≤ 3.
- Prompt v2 на 3.8: A1-A2 4.89, B1-B2 4.89, 11 замечаний (`judge-3.8-prompt-v1-vs-v2.md`).

---

## 1. Таблица находок (ранжирована по эффект / усилие)

Усилие: S означает до дня, M означает 1–3 дня, L означает больше. Детали и способ проверки для каждого ID приведены после таблицы.

| # | ID | Область | Находка | Доказательство | Ожидаемый эффект | Риск | Усилие | Статус |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | A1 | Расходы / abuse | Нет `maxOutputTokens`. Лимит 5000 символов при типичном абзаце ≈250. Allowance считает запросы, а не деньги. Худший запрос стоит ≈6–8× типичного, а при зацикленной генерации ограничен только лимитом модели | `apps/cms/src/pipeline/translate.ts:90-114`, `apps/cms/src/config.ts:11,13`, `apps/cms/src/usage/ledger.ts:72-84` | Худший день при исчерпании лимита: ≈$15–20 сейчас, ≈$30–40 с 2027 (сейчас не ограничено сверху по $). После фикса ≈$2–5/день | Слишком низкий `maxOutputTokens` обрежет JSON, и ответ уйдёт в 502 | S | VERIFIED (код) / HYPOTHESIS (оценка $) |
| 2 | A2 | Abuse | CORS только выставляет заголовки и не отклоняет запросы. Любой HTTP-клиент тратит общий лимит. Когда лимит исчерпан, сервис ложится у всех пользователей | `apps/cms/src/build-app.ts:32-38`, `apps/cms/tests/integration/cors.test.ts:21-28`, `apps/extension/lib/config.ts:6` | Защита от «бесплатного API перевода» и от DoS через лимит | Проверку Origin легко подделать, это только порог от наивных скриптов | S | VERIFIED |
| 3 | L1 | Стоимость LLM | 3.8-flash дорожает ×2 с 2027-01-01. `costUsd` не учитывает дату, поэтому `provider_calls.cost_usd` начнёт занижать расходы | `apps/cms/src/pipeline/pricing.ts:7-9,13-21` | Корректный учёт. Решение по модели нужно принять до 1 января | Нет | S | VERIFIED |
| 4 | L2 | Стоимость LLM | flash-lite в 3× дешевле и в 2.3× быстрее. Отставание сосредоточено в A1-A2 (4.02 против 4.91), в B1-B2 оно небольшое (4.64 против 4.81). На prompt v2 flash-lite **не проверялся** | `docs/quality/2026-10-19/judge-4-models.md:9,11`, `docs/quality/2026-10-19/README.md:14` | −60…80% $/абзац, −2 s задержки, если пройдёт порог качества (полностью или для части уровней) | Грамматические ошибки (неверный артикль) вредны для учащихся | M | HYPOTHESIS |
| 5 | S1 | Cold start | `ensureSchema`: 6 последовательных DDL через HTTP-драйвер Neon на первый запрос каждого инстанса. Затрагивает translate/events/report | `apps/cms/src/db.ts:14,21-73,76-78,84-95`, `apps/cms/src/build-app.ts:40-44` | −5 RTT к Neon на каждом холодном инстансе (оценка 50–150 ms) | Нужна миграция при деплое, иначе новая колонка не появится | S | VERIFIED / HYPOTHESIS (ms) |
| 6 | S2 | Задержка | `/api/exercises` даёт лишний сетевой RTT и отдельный вызов функции на каждый перевод. При этом генератор чистый и импортирует только тип | `apps/extension/entrypoints/background.ts:117`, `apps/cms/src/routes/exercises.ts:6,22`, `apps/cms/src/exercises/generate.ts:1` | −1 RTT (≈50–150 ms тёплый, до 1 s+ на холодном инстансе), −1 invocation на перевод, упражнения работают офлайн | Логика упражнений будет меняться только с релизом в стор | M | VERIFIED / HYPOTHESIS (ms) |
| 7 | S3 | Задержка / расходы | Ретрай: таймаут 15 s, затем пауза 200 ms и ещё 15 s, итого ≈30.2 s в худшем случае. Повторяются 429 и таймауты, общего дедлайна нет. У `fetch` клиента нет таймаута. Ретраи не видны ни в `provider_calls`, ни в allowance | `apps/cms/src/pipeline/retry.ts:5-16`, `apps/cms/src/pipeline/translate.ts:128,204-207`, `apps/cms/src/routes/translate.ts:57,61-85`, `apps/extension/lib/cms/client.ts:44` | Хвост задержки ≤10–12 s вместо 30 s. Видимость ретраев | Короткий дедлайн чаще даёт 502 на длинных абзацах | S | VERIFIED |
| 8 | C1 | Клиент | `recordVocabEncounters` делает 3–8 полных read+write всего объекта `vocabulary` на перевод. Каждая запись рассылается во все вкладки. Операции не сериализованы с `recordAttempt`, поэтому возможна потеря обновлений | `apps/extension/lib/vocab/upsert.ts:19,43`, `apps/extension/lib/storage/progress.ts:36-41,85-123`, `apps/extension/entrypoints/background.ts:358-366` | Вместо 3–8 записей одна. Нет гонок | Низкий | S | VERIFIED |
| 9 | C2 | Клиент | `findExerciseById` при каждом ответе перебирает **все** наборы упражнений в IndexedDB, по одному `get` на ключ. Сообщение не несёт ключ кэша | `apps/extension/lib/storage/content-cache.ts:70-81`, `packages/shared/src/schemas/messages.ts:41-47`, `apps/extension/entrypoints/background.ts:164` | O(N) превращается в O(1). Рост задержки ответа с историей исчезает | Низкий (нужно поле `variantId` в сообщении) | S | VERIFIED (рост) / HYPOTHESIS (ms) |
| 10 | C3 | Клиент | Любая запись vocab/progress делает `chrome.tabs.query({})` и шлёт `sendMessage` в каждую вкладку. Content script слушает только `siteRules` | `apps/extension/entrypoints/background.ts:337-349,358-366`, `apps/extension/entrypoints/content/index.tsx:212`, `apps/extension/entrypoints/options/ProgressView.tsx:18` | −(вкладки × записи) IPC на каждый перевод и ответ | Нет | S | VERIFIED |
| 11 | K1 | Кэш | В `cache_entries` нет `model`/`prompt_version`/`level`, записи вечные. Hit rate по версии не измерить, мёртвые строки после bump не удалить | `apps/cms/src/db.ts:22-27`, `apps/cms/src/cache/store.ts:22-28` | Измеримость, чистка старых версий | Миграция таблицы | S | VERIFIED |
| 12 | M1 | Метрики | Не записываются: уровень (ни в `events`, ни в `provider_calls`), номер попытки, локальные cache hit, задержка `/api/exercises` | `apps/cms/src/db.ts:29-54`, `apps/extension/entrypoints/background.ts:62-64,79-82`, `specs/003-private-beta/metrics.sql:8-9` | Без этого не доказать эффект L2/S2/S3 | Только поля без текста (конституция III) | S | VERIFIED |
| 13 | C4 | Клиент / DOM | `findEligibleParagraphs` вызывает `innerText` (форсирует layout) на каждом кандидате и на каждом его ребёнке. Density-лимит применяется после полного обхода страницы | `apps/extension/lib/dom/paragraph-parser.ts:39-44,52-64,71-77`, `apps/extension/entrypoints/content/index.tsx:146-155` | На длинных страницах (Википедия, форумы) десятки–сотни ms main thread при загрузке. Ранний выход сохраняет семантику | Низкий | S | HYPOTHESIS |
| 14 | C5 | Клиент / сервер | Каждое событие сразу шлёт отдельный `POST /api/events`. На один перевод получается 3 вызова функции (translate + exercises + events), на каждый ответ ещё 1 | `apps/extension/lib/metrics/events.ts:77-87`, `apps/cms/src/routes/events.ts:17,22` | −30…50% invocations и меньше пробуждений Neon | Задержка доставки метрик | M | HYPOTHESIS |
| 15 | L3 | Стоимость LLM | Output составляет 81% цены. JSON-ключи `german/lemma/russian` повторяются в 3–8 объектах | `apps/cms/src/pipeline/translate.ts:69-79,92-110` | −10…25% output-токенов | Качество глосс (v2 их подняло) | M | HYPOTHESIS |
| 16 | S4 | Cold start / инфраструктура | Регион задан не в репо, а в дашборде (по документам `fra1` + Neon `aws-eu-central-1`). Пробуждение Neon после простоя (scale-to-zero) попадает в запрос пользователя | `docs/ship-first-dollar.md:101-103`, `apps/cms/src/privacy/policy.ts:128`, нет `vercel.json` | Подтвердить совпадение регионов. Возможно −0.3…1 s на первом запросе после простоя | Отключение scale-to-zero стоит денег | S (конфиг) | HYPOTHESIS |
| 17 | C6 | Клиент | Для тултипа одного слова content script запрашивает весь снапшот (vocab + reviewQueue + profile). Снапшот сбрасывается после каждого перевода | `apps/extension/entrypoints/content/index.tsx:56,89-98`, `apps/extension/entrypoints/background.ts:312-325` | Меньше сериализации при большом словаре | Нет | S | VERIFIED (влияние малое) |
| 18 | S5 | Задержка | На miss после Gemini идут две последовательные записи (`provider_calls`, потом `cache_entries`) | `apps/cms/src/routes/translate.ts:76-91` | −1 RTT (≈10–30 ms) | Нет | S | VERIFIED (влияние малое) |
| 19 | K2 | Кэш | При bump модели или промпта локальный кэш не инвалидируется (в ключе нет model/pv), поэтому старые переводы v1 остаются у пользователей навсегда. Серверный кэш пустеет полностью, но повторы и так гасит локальный кэш | `apps/extension/lib/storage/content-cache.ts:36-37`, `apps/cms/src/cache/key.ts:21`, `apps/extension/entrypoints/background.ts:97-98` | Стоимость bump мала (≈ трафик новых абзацев). Расхождение кэшей касается качества, а не денег | — | — | VERIFIED / HYPOTHESIS (hit rate) |
| 20 | K3 | Кэш | Нормализация ключа: только trim и схлопывание пробелов (нет NFC, soft hyphen, zero-width). На клиенте нет дедупликации запросов в полёте: двойной клик даёт 2 запроса | `apps/cms/src/cache/key.ts:4-5`, `apps/extension/entrypoints/content/index.tsx:128-144` | Небольшой прирост hit rate между пользователями | Нет | S | HYPOTHESIS (малое) |
| 21 | C7 | Клиент | React-панель монтируется на каждой загрузке разрешённого сайта, даже если пользователь ничего не нажмёт | `apps/extension/entrypoints/content/index.tsx:195-206`, `apps/extension/lib/content-script-registration.ts:39` | Меньше parse/execute на страницу | Регрессии UI-тестов | M | HYPOTHESIS |
| 22 | S6 | Cold start | В бандле сервера npm-зависимости внешние (Vercel трассирует `node_modules`), есть sourcemap | `apps/cms/scripts/bundle.mjs:8-10,19-20` | Вероятно, единицы–десятки ms | Сложнее отладка | S | HYPOTHESIS (малое) |

### Детали и как закрыть гипотезы

**A1. Цена худшего запроса.** `TranslateRequestSchema` ограничивает текст только снизу (`packages/shared/src/schemas/cms.ts:4-8`), сервер режет на 5000 символах (`apps/cms/src/routes/translate.ts:34`). Клиент шлёт абзацы длиннее 80 символов (`apps/extension/lib/dom/paragraph-parser.ts:3`), в среднем в тестовом наборе около 253 символов. Абзац в 5000 символов примерно в 20 раз длиннее среднего.
- Оценка: ≈1500 входных токенов и ≈2200–3200 выходных, то есть ≈$0.009–0.013 за вызов при сегодняшней цене.
- Если выжечь все 1500 вызовов такими текстами, получится ≈$15–20 в сутки (≈$450–600 в месяц), а с 2027 вдвое больше.
- Без `maxOutputTokens` редкая зацикленная генерация ограничена только потолком модели.
- Ретрай может удвоить число **оплаченных** вызовов на один резерв allowance (S3).
- Как закрыть: SQL «token_distribution» (раздел 3) даёт p99/max `prompt_tokens` и `output_tokens` в проде. Отдельно стоит проверить в Google Billing, тарифицируются ли вызовы, оборванные по таймауту.

**A2. CORS не авторизация.** `@fastify/cors` с callback `origin` только решает, ставить ли `Access-Control-Allow-Origin`. Обработчик маршрута выполняется для любого Origin и для запросов без него (`apps/cms/src/build-app.ts:34-38`). Тест проверяет только заголовок (`apps/cms/tests/integration/cors.test.ts:26-28`). URL API зашит в публичный бандл (`apps/extension/lib/config.ts:6`). Лимит общий для всех (`apps/cms/src/usage/ledger.ts:79`), поэтому один скрейпер, исчерпав его, вызывает 429 у всех (`apps/cms/src/routes/translate.ts:103`). Hashed-IP лимит уже спроектирован, но отложен (`docs/ship-first-dollar.md:69`). Как увидеть атаку: SQL «calls_not_seen_by_extension» в разделе 3 показывает платные вызовы, которым не соответствует ни одно событие расширения.

**L1.** Комментарий о подорожании есть (`pricing.ts:7`), но таблица `PRICES` одна и без дат. После 2027-01-01 `cost_usd` в `provider_calls` будет вдвое занижен (`apps/cms/src/usage/provider-calls.ts:30`).

**L2. flash-lite.** Сравнение моделей делалось только на prompt v1 (`docs/quality/2026-10-19/README.md:9-10`). Prompt v2 поднял 3.8 по глоссам с 3.80 до 4.85 (`judge-3.8-prompt-v1-vs-v2.md:9-10`), а именно глоссы и грамматика слабое место lite. Выборка мала: 20 русских абзацев, только A1-A2 и B1-B2 (`apps/cms/scripts/quality-paragraphs.ts:9`). Судья из того же семейства (`apps/cms/scripts/judge.ts:9`). Уровень по умолчанию A1-A2 (`apps/extension/lib/storage/settings.ts:15`), то есть, вероятно, большая часть трафика приходится на самый слабый для lite уровень. Это гипотеза: распределения по уровням нет (M1). Как закрыть: эксперимент из раздела 3.2.

**S1. DDL на холодном старте.** `withSchema` мемоизирует `ensureSchema` на процесс (`apps/cms/src/db.ts:84-95`). Это 6 отдельных HTTP-запросов к Neon по очереди (`apps/cms/src/db.ts:77`) до первого полезного запроса. Сюда попадают и `/api/events`, и `/api/report` (`apps/cms/src/build-app.ts:40-44`). Как закрыть: временно логировать длительность `ensureSchema` (одна строка `request.log.info`, без текста) или смотреть duration первых запросов инстанса в Vercel runtime logs.

**S2. Лишний round trip.** Поток в фоне строго последовательный: translate, затем `recordVocabEncounters`, затем `putCachedVariant`, затем `POST /api/exercises` (`apps/extension/entrypoints/background.ts:73-117`). Для закэшированного варианта без упражнений сеть нужна снова (`background.ts:66-69,117`). Генератор не имеет зависимостей, кроме типа (`apps/cms/src/exercises/generate.ts:1`), поэтому переносится в `packages/shared` без изменений. Как закрыть: замерить `performance.now()` вокруг `generateExercises` в фоне (сейчас задержка упражнений нигде не пишется, M1).

**S3. Ретраи.** Любая ошибка, кроме `ProviderConfigError`, включая `AbortSignal.timeout` и HTTP 429, повторяется через 200 ms (`apps/cms/src/pipeline/translate.ts:204-207`, `apps/cms/src/pipeline/retry.ts:13-15`). Строка `provider_calls` пишется одна на весь `withRetry`, её latency включает обе попытки, а usage берётся только у успешной (`apps/cms/src/routes/translate.ts:61-85`). Резерв allowance тоже один (`routes/translate.ts:57`). Если `maxDuration` функции на Vercel меньше 30 s, функцию убьют посреди ретрая. Тогда в `usage_counters` будет резерв без строки в `provider_calls` (SQL «allowance_utilization»).

**C1/C2/C3.** Это проверено чтением кода. Задержку можно замерить в DevTools service worker: `performance.now()` вокруг `recordVocabEncounters` и `findExerciseById` при 1k/5k словах и абзацах (синтетически заполнить storage в тесте).

**C4.** Как закрыть: Performance-профиль `activate()` на 3–5 тяжёлых страницах (длинная статья Википедии, тред форума, лента новостей) до и после правки.

**C5.** Как закрыть: Vercel Observability, invocations по путям `/api/events` против `/api/translate`.

**L3.** Как закрыть: прогнать `quality-check` с компактной схемой vocab и сравнить строку `Tokens:` и оценки судьи с baseline.

**S4.** Как закрыть: проверить регион функций и Neon в дашбордах, `suspend_timeout` compute и SQL «idle_gaps» (доля платных вызовов после простоя больше 5 минут).

**K2.** Как закрыть: SQL «server_cache_hit_rate». Если доля hit на сервере в единицах процентов, серверный кэш почти не экономит и цена bump пренебрежима.

---

## 2. Топ-3 рекомендации

### R1. Ограничить расходы на запрос и закрыть API от скрейперов (A1 + A2)
Почему первым: изменения S-размера, а без них публичный листинг даёт расходы без верхней границы в $ и общий DoS через лимит.
1. Выполнить SQL `token_distribution` (раздел 3) и получить p99/max `prompt_tokens` и `output_tokens` по модели.
2. Добавить в `generationConfig` значение `maxOutputTokens` ≈ 2× p99 output (по бете ожидаю ≈1000–1500) (`apps/cms/src/pipeline/translate.ts:90-114`). Если ответ упрётся в лимит (`finishReason: MAX_TOKENS`), он не пройдёт парсинг и вернётся 502 без кэширования. Это уже обрабатывается (`translate.ts:163-172`).
3. Снизить `TRANSLATE_MAX_CHARS` до p99 длины реальных абзацев с запасом (ожидаю 1500–2000). Значение берётся из env, кода не нужно (`apps/cms/src/config.ts:11`).
4. Ввести второй счётчик в `reserveCounters` (`apps/cms/src/usage/ledger.ts:53-66`): дневной бюджет в токенах, где резерв равен оценке по длине текста. Механизм «всё или ничего» уже есть, нужно только добавить вторую резервацию.
5. Отклонять на сервере запросы с `Origin`, которого нет в `CORS_ALLOWED_ORIGINS` (хук `onRequest` в `apps/cms/src/build-app.ts`), с ответом 403. Это не аутентификация, а отсечение браузерных злоупотреблений и наивных скриптов.
6. В Vercel Firewall добавить rate-limit правило на `/api/translate` по IP (например, 60 запросов в минуту и ~300 в сутки). Это конфиг, не код. Наличие на текущем плане надо проверить.
7. Когда лимиты вернутся в план, включить уже спроектированный hashed-IP ledger (`docs/ship-first-dollar.md:69`).
8. Ежедневно проверять SQL `allowance_utilization` и `calls_not_seen_by_extension` и завести алерт при использовании лимита выше 80%.

Критерий успеха: max `output_tokens` ≤ лимита, `calls_not_seen_by_extension` ≈ 0, нет дней со 100% лимита без роста DAU.

### R2. Решение по модели до 2027-01-01 (L1 + L2)
1. Сделать `pricing.ts` зависимым от даты, например `[{ from: "2027-01-01", price: [1.5, 7.5] }]` для 3.6 и 3.8, и передавать в `costUsd` время вызова (`apps/cms/src/pipeline/pricing.ts:13`).
2. Провести офлайн-эксперимент из раздела 3.2: 3.1-flash-lite на prompt v2 против 3.8 на prompt v2, по уровням.
3. Принять решение:
   - lite проходит порог на всех уровнях: переключить `GEMINI_MODEL` (env, без кода);
   - lite проходит только для B1-B2/C1+: добавить маршрутизацию модели по `level` в `translateParagraph`. В ключе кэша модель уже есть (`apps/cms/src/cache/key.ts:21`), так что ответы не смешаются;
   - lite не проходит: оставить 3.8, заложить в бюджет ≈$0.0031 за абзац и вернуться к L3.
4. Выкатить на неделю и следить за SQL `report_rate_by_model`, `provider_latency` и `cost_per_day`. Откатить, если доля «Плохой перевод» выросла больше чем вдвое к baseline или p95 ухудшилась.
5. Учесть, что смена модели обнуляет серверный кэш. Это дёшево (K2): локальные кэши пользователей продолжат отдавать старые переводы.

Ожидаемый эффект при полном переходе: ≈$0.0006 за абзац (386×0.25 + ~340×1.5 µ$) против $0.00156 сейчас и $0.00312 с 2027, то есть в 2.6–5× дешевле. Задержка ≈1.3 s против ≈3.5 s. Это HYPOTHESIS до эксперимента.

### R3. Сократить интерактивный путь (S2 + S1 + S3, плюс быстрые C1–C3)
1. Перенести `apps/cms/src/exercises/generate.ts` в `packages/shared` и вызывать его в `handleTranslateParagraph` вместо `POST /api/exercises` (`apps/extension/entrypoints/background.ts:117`). Эндпоинт оставить ради старых версий расширения. Тесты `apps/cms/tests/unit/generate-exercises.test.ts` переезжают вместе с кодом.
2. Убрать DDL с пути запроса. Для этого сделать скрипт `pnpm --filter @sprachweise/cms migrate`, который вызывает `ensureSchema` и запускается перед `vercel deploy --prod`, а `withSchema` в проде отключить. Минимальный вариант: выполнить 6 statements одним `sql.transaction([...])`, то есть одним HTTP-запросом (`apps/cms/src/db.ts:76-78`).
3. Ретраи:
   - общий дедлайн около 10–12 s: первая попытка до ~8 s, ретрай только при оставшемся бюджете;
   - не повторять 429 и 4xx;
   - `AbortSignal.timeout(20000)` в `postJson` клиента (`apps/extension/lib/cms/client.ts:44`);
   - колонка `attempts` в `provider_calls`, каждую попытку писать отдельно (`apps/cms/src/routes/translate.ts:61-85`).
4. В том же PR сделать быстрые клиентские правки:
   - C1: одна запись `vocabulary` после цикла (`apps/extension/lib/vocab/upsert.ts:43`) и общая очередь сериализации для vocab, reviewQueue и progress;
   - C2: передавать `variantId` в `SUBMIT_EXERCISE_ATTEMPT` (он уже есть в сессии, `apps/extension/entrypoints/content/index.tsx:53`) и читать один ключ вместо перебора (`apps/extension/lib/storage/content-cache.ts:70-81`);
   - C3: рассылать во вкладки только slice `siteRules` (`apps/extension/entrypoints/background.ts:337-349`).
5. Замерить до и после: SQL `latency_weekly` (hit/miss p50/p95), новое событие с задержкой «перевод + упражнения», duration первого запроса инстанса.

Ожидаемый эффект: −1 RTT и −1 invocation на каждый перевод, −5 RTT на холодный инстанс, хвост ≤12 s вместо 30 s. Абсолютные ms пока HYPOTHESIS: доминирует Gemini, ≈3.5 s.

---

## 3. План измерений

### 3.1. SQL (PostgreSQL, Neon; не запускался)

Готовые запросы `dau`, `errors` и `latency` уже есть в `specs/003-private-beta/metrics.sql:14,98,111`. Ниже только новые запросы в том же формате `-- name:`. Дни считаются в UTC. `events` хранит только день (`occurred_on`), `provider_calls` хранит timestamp.

Ограничения данных:
- локальные cache hit событий не шлют (`specs/003-private-beta/metrics.sql:8-9`);
- в `provider_calls` нет уровня и номера попытки (M1);
- у ошибочных вызовов `cost_usd` равен NULL, хотя Google мог их тарифицировать.

```sql
-- name: server_cache_hit_rate
-- Share of extension translate requests answered from the server cache (local IndexedDB hits are
-- invisible here: they send no event).
SELECT
  occurred_on AS day,
  COUNT(*) AS server_requests,
  COUNT(*) FILTER (WHERE cache = 'hit') AS hits,
  COUNT(*) FILTER (WHERE cache = 'miss') AS misses,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cache = 'hit') / NULLIF(COUNT(*), 0), 1) AS hit_pct
FROM events
WHERE name = 'paragraph_translated' AND occurred_on > current_date - 30
GROUP BY occurred_on
ORDER BY day DESC;

-- name: latency_weekly
-- Client-measured /api/translate latency by server cache result, weekly, with p99.
SELECT
  date_trunc('week', occurred_on)::date AS week,
  cache,
  COUNT(*) AS requests,
  ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms)) AS p50_ms,
  ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)) AS p95_ms,
  ROUND(percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms)) AS p99_ms,
  MAX(latency_ms) AS max_ms
FROM events
WHERE name = 'paragraph_translated' AND occurred_on > current_date - 90
GROUP BY 1, 2
ORDER BY week DESC, cache;

-- name: provider_latency
-- Server-side Gemini latency (both attempts included when retried), by model/thinking/status.
SELECT
  model,
  thinking_level,
  status,
  COUNT(*) AS calls,
  ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms)) AS p50_ms,
  ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)) AS p95_ms,
  ROUND(percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms)) AS p99_ms,
  MAX(latency_ms) AS max_ms
FROM provider_calls
WHERE created_at > now() - interval '30 days'
GROUP BY model, thinking_level, status
ORDER BY model, thinking_level, status;

-- name: cost_per_day
-- Spend per day and per unit: per OK paid call, per new cache entry (= delivered fresh
-- translation), per served translation (extension requests incl. server cache hits).
WITH paid AS (
  SELECT
    (created_at AT TIME ZONE 'UTC')::date AS day,
    COUNT(*) AS calls,
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_calls,
    COALESCE(SUM(cost_usd), 0) AS cost_usd,
    COUNT(*) FILTER (WHERE status = 'ok' AND cost_usd IS NULL) AS unpriced_ok_calls
  FROM provider_calls
  WHERE created_at > now() - interval '30 days'
  GROUP BY 1
),
served AS (
  SELECT occurred_on AS day, COUNT(*) AS served_translations
  FROM events
  WHERE name = 'paragraph_translated' AND occurred_on > current_date - 30
  GROUP BY 1
),
created AS (
  SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*) AS new_cache_entries
  FROM cache_entries
  WHERE created_at > now() - interval '30 days'
  GROUP BY 1
)
SELECT
  p.day,
  p.calls,
  p.ok_calls,
  c.new_cache_entries,
  s.served_translations,
  ROUND(p.cost_usd, 4) AS cost_usd,
  ROUND(p.cost_usd / NULLIF(p.ok_calls, 0), 6) AS usd_per_ok_call,
  ROUND(p.cost_usd / NULLIF(c.new_cache_entries, 0), 6) AS usd_per_new_translation,
  ROUND(p.cost_usd / NULLIF(s.served_translations, 0), 6) AS usd_per_served_translation,
  p.unpriced_ok_calls
FROM paid p
LEFT JOIN served s USING (day)
LEFT JOIN created c USING (day)
ORDER BY p.day DESC;

-- name: cost_projection
-- Same production token usage (last 30 days) priced under alternative scenarios. The lite row
-- assumes equal token counts — a first-order estimate only; the experiment in 3.2 gives real counts.
WITH usage AS (
  SELECT
    prompt_tokens AS tokens_in,
    output_tokens + COALESCE(thoughts_tokens, 0) AS tokens_out
  FROM provider_calls
  WHERE status = 'ok'
    AND model = 'gemini-3.8-flash'
    AND prompt_tokens IS NOT NULL
    AND created_at > now() - interval '30 days'
),
scenarios (scenario, usd_in_per_m, usd_out_per_m) AS (
  VALUES
    ('gemini-3.8-flash, until 2026-12-31', 0.75, 3.75),
    ('gemini-3.8-flash, from 2027-01-01', 1.5, 7.5),
    ('gemini-3.1-flash-lite, same tokens', 0.25, 1.5)
)
SELECT
  s.scenario,
  COUNT(*) AS calls,
  ROUND(AVG(u.tokens_in)) AS avg_tokens_in,
  ROUND(AVG(u.tokens_out)) AS avg_tokens_out,
  ROUND(AVG((u.tokens_in * s.usd_in_per_m + u.tokens_out * s.usd_out_per_m) / 1e6), 6) AS usd_per_call,
  ROUND(SUM((u.tokens_in * s.usd_in_per_m + u.tokens_out * s.usd_out_per_m) / 1e6) / 30, 4) AS usd_per_day_avg,
  ROUND(1500 * AVG((u.tokens_in * s.usd_in_per_m + u.tokens_out * s.usd_out_per_m) / 1e6), 2)
    AS usd_per_day_at_allowance -- GEMINI_DAILY_REQUEST_ALLOWANCE = 1500
FROM usage u
CROSS JOIN scenarios s
GROUP BY s.scenario
ORDER BY usd_per_call DESC;

-- name: token_distribution
-- Inputs for maxOutputTokens / TRANSLATE_MAX_CHARS (R1). {p50, p95, p99}.
SELECT
  model,
  COUNT(*) AS ok_calls,
  percentile_disc(ARRAY[0.5, 0.95, 0.99]) WITHIN GROUP (ORDER BY prompt_tokens) AS prompt_tokens_p50_p95_p99,
  MAX(prompt_tokens) AS prompt_tokens_max,
  percentile_disc(ARRAY[0.5, 0.95, 0.99]) WITHIN GROUP (ORDER BY output_tokens) AS output_tokens_p50_p95_p99,
  MAX(output_tokens) AS output_tokens_max,
  percentile_disc(ARRAY[0.5, 0.95, 0.99]) WITHIN GROUP (ORDER BY COALESCE(thoughts_tokens, 0)) AS thoughts_tokens_p50_p95_p99,
  ROUND(100.0 * AVG((COALESCE(thoughts_tokens, 0) > 0)::int), 1) AS pct_calls_with_thinking
FROM provider_calls
WHERE status = 'ok' AND prompt_tokens IS NOT NULL AND created_at > now() - interval '30 days'
GROUP BY model;

-- name: failure_share
-- Paid-call failures per day. Memoized ProviderConfigError rows fail in ~0 ms; errors that ran
-- into the 15 s timeout (GEMINI_TIMEOUT_MS) were retried at least once.
SELECT
  (created_at AT TIME ZONE 'UTC')::date AS day,
  COUNT(*) AS calls,
  COUNT(*) FILTER (WHERE status = 'error') AS errors,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'error') / NULLIF(COUNT(*), 0), 2) AS error_pct,
  COUNT(*) FILTER (WHERE status = 'error' AND latency_ms < 50) AS errors_config_fast_fail,
  COUNT(*) FILTER (WHERE status = 'error' AND latency_ms >= 15000) AS errors_after_timeout
FROM provider_calls
WHERE created_at > now() - interval '30 days'
GROUP BY 1
ORDER BY day DESC;

-- name: client_translate_failures
-- What the learner saw: translate failures by HTTP status (429 = allowance exhausted,
-- 502 = upstream/validation, 503 = misconfigured/internal, NULL = offline/CORS/DNS).
SELECT
  error_code,
  http_status,
  COUNT(*) AS failures,
  COUNT(DISTINCT install_id) AS installs,
  ROUND(
    100.0 * COUNT(*) / NULLIF(
      (SELECT COUNT(*) FROM events
        WHERE occurred_on > current_date - 30
          AND (name = 'paragraph_translated'
               OR error_code IN ('translate-failed', 'translate-offline'))),
      0),
    2
  ) AS pct_of_translate_attempts
FROM events
WHERE name = 'client_error'
  AND error_code IN ('translate-failed', 'translate-offline')
  AND occurred_on > current_date - 30
GROUP BY error_code, http_status
ORDER BY failures DESC;

-- name: retries_lower_bound
-- Retries aren't recorded (one provider_calls row per withRetry). Lower bound: an OK call slower
-- than the 15 s timeout must have retried after a timeout; every non-config error was retried once.
SELECT
  (created_at AT TIME ZONE 'UTC')::date AS day,
  COUNT(*) FILTER (WHERE status = 'ok') AS ok_calls,
  COUNT(*) FILTER (WHERE status = 'ok' AND latency_ms >= 15000) AS ok_after_timeout_retry,
  COUNT(*) FILTER (WHERE status = 'error' AND latency_ms >= 50) AS errors_retried,
  COUNT(*) FILTER (WHERE status = 'ok' AND latency_ms >= 15000)
    + COUNT(*) FILTER (WHERE status = 'error' AND latency_ms >= 50) AS retries_at_least,
  ROUND(
    100.0 * (COUNT(*) FILTER (WHERE status = 'ok' AND latency_ms >= 15000)
             + COUNT(*) FILTER (WHERE status = 'error' AND latency_ms >= 50))
      / NULLIF(COUNT(*), 0),
    2
  ) AS retry_pct_at_least
FROM provider_calls
WHERE created_at > now() - interval '30 days'
GROUP BY 1
ORDER BY day DESC;

-- name: wasted_paid_calls
-- OK paid calls that produced no cache entry: response failed validation (ZodError → 502) or a
-- cross-instance duplicate hit ON CONFLICT DO NOTHING.
WITH paid AS (
  SELECT (created_at AT TIME ZONE 'UTC')::date AS day,
         COUNT(*) AS ok_calls,
         COALESCE(SUM(cost_usd), 0) AS ok_cost
  FROM provider_calls
  WHERE status = 'ok' AND created_at > now() - interval '30 days'
  GROUP BY 1
),
created AS (
  SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*) AS new_cache_entries
  FROM cache_entries
  WHERE created_at > now() - interval '30 days'
  GROUP BY 1
)
SELECT
  p.day,
  p.ok_calls,
  COALESCE(c.new_cache_entries, 0) AS new_cache_entries,
  p.ok_calls - COALESCE(c.new_cache_entries, 0) AS wasted_calls,
  ROUND(p.ok_cost * (p.ok_calls - COALESCE(c.new_cache_entries, 0)) / NULLIF(p.ok_calls, 0), 4)
    AS wasted_usd_approx
FROM paid p
LEFT JOIN created c USING (day)
ORDER BY p.day DESC;

-- name: allowance_utilization
-- Daily allowance use. reserved_without_row > 0 = a reservation with no provider_calls row
-- (bookkeeping insert failed, or the function was killed mid-call, e.g. maxDuration < 30 s).
WITH calls AS (
  SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*) AS recorded_calls
  FROM provider_calls
  GROUP BY 1
)
SELECT
  u.period_key::date AS day,
  u.usage AS reserved,
  ROUND(100.0 * u.usage / 1500, 1) AS pct_of_allowance, -- GEMINI_DAILY_REQUEST_ALLOWANCE
  COALESCE(c.recorded_calls, 0) AS recorded_calls,
  u.usage - COALESCE(c.recorded_calls, 0) AS reserved_without_row
FROM usage_counters u
LEFT JOIN calls c ON c.day = u.period_key::date
WHERE u.counter = 'gemini'
ORDER BY day DESC
LIMIT 30;

-- name: calls_not_seen_by_extension
-- Abuse signal: paid calls per day minus what extension installs report (misses + failures).
-- Approximate (events can arrive late from the offline queue; 429s appear as failures without a
-- paid call), but a large positive gap means traffic from outside the extension.
WITH paid AS (
  SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*) AS paid_calls
  FROM provider_calls
  WHERE created_at > now() - interval '30 days'
  GROUP BY 1
),
client AS (
  SELECT
    occurred_on AS day,
    COUNT(*) FILTER (WHERE name = 'paragraph_translated' AND cache = 'miss') AS client_misses,
    COUNT(*) FILTER (WHERE error_code = 'translate-failed') AS client_failures
  FROM events
  WHERE occurred_on > current_date - 30
  GROUP BY 1
)
SELECT
  p.day,
  p.paid_calls,
  COALESCE(c.client_misses, 0) AS client_misses,
  COALESCE(c.client_failures, 0) AS client_failures,
  p.paid_calls - COALESCE(c.client_misses, 0) - COALESCE(c.client_failures, 0)
    AS calls_not_seen_by_extension
FROM paid p
LEFT JOIN client c USING (day)
ORDER BY p.day DESC;

-- name: cache_growth
-- Server cache growth per week and average row payload.
SELECT
  date_trunc('week', created_at)::date AS week,
  COUNT(*) AS new_entries,
  ROUND(AVG(octet_length(result_text) + octet_length(marked_vocab::text))) AS avg_payload_bytes
FROM cache_entries
GROUP BY 1
ORDER BY week DESC;

-- name: table_sizes
SELECT
  relname AS table_name,
  n_live_tup AS approx_rows,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
WHERE relname IN ('cache_entries', 'provider_calls', 'events', 'usage_counters', 'translation_reports')
ORDER BY pg_total_relation_size(relid) DESC;

-- name: idle_gaps
-- How often a paid call follows > 5 min of paid-call silence (lower bound for "Neon may have
-- suspended"; cache hits make no rows). latency_ms covers only Gemini, not the DB wake-up.
WITH ordered AS (
  SELECT
    created_at,
    latency_ms,
    created_at - lag(created_at) OVER (ORDER BY created_at) AS gap
  FROM provider_calls
  WHERE created_at > now() - interval '14 days'
)
SELECT
  CASE WHEN gap IS NULL OR gap > interval '5 minutes' THEN 'after_idle_gt_5min' ELSE 'warm' END AS bucket,
  COUNT(*) AS calls,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM ordered
GROUP BY 1;

-- name: report_rate_by_model
-- "Плохой перевод" reports per 100 fresh translations of each model (denominator excludes cache
-- hits, so this overstates the per-view rate; use it to compare models, not as an absolute).
WITH reports AS (
  SELECT model, COUNT(*) AS reports
  FROM translation_reports
  WHERE created_at > now() - interval '30 days'
  GROUP BY model
),
calls AS (
  SELECT model, COUNT(*) AS ok_calls
  FROM provider_calls
  WHERE status = 'ok' AND created_at > now() - interval '30 days'
  GROUP BY model
)
SELECT
  model,
  COALESCE(calls.ok_calls, 0) AS ok_calls,
  COALESCE(reports.reports, 0) AS reports,
  ROUND(100.0 * COALESCE(reports.reports, 0) / NULLIF(calls.ok_calls, 0), 2) AS reports_per_100_fresh
FROM calls
FULL JOIN reports USING (model)
ORDER BY ok_calls DESC;
```

Чего SQL сейчас не покажет и что добавить (M1), не нарушая конституцию III (без текста, URL и IP):
- `level` и `attempts` в `provider_calls`;
- `model` и `prompt_version` в `cache_entries` (K1);
- счётчик локальных cache hit (поле `cache = 'local'` в существующем событии);
- задержку цепочки «перевод + упражнения» в событии.

### 3.2. Эксперимент: flash-lite против текущей модели

Цель: решить, можно ли перевести на `gemini-3.1-flash-lite` все уровни или часть из них.

Подготовка:
1. Расширить `apps/cms/scripts/quality-paragraphs.ts` с 20 до ~40 абзацев, добавив:
   - английские источники (промпт заявляет «usually Russian or English», `apps/cms/src/pipeline/translate.ts:65`);
   - уровень `C1+`;
   - 5–6 длинных абзацев по 600–1500 символов;
   - списки и абзацы с `<strong>`.
   Цель не менее 12 абзацев на уровень.
2. Проверить, принимает ли 3.1-flash-lite `thinkingLevel: low`. Если отвергнет, `ProviderConfigError` выдаст это сразу (`apps/cms/src/pipeline/translate.ts:142-151`).

Прогоны (каждый ≈$0.02–0.06, а также ≈$0.1–0.3 на судью):
```bash
cd apps/cms
# baseline, twice to measure run-to-run variance
GEMINI_MODEL=gemini-3.8-flash      GEMINI_THINKING_LEVEL=low     pnpm quality-check --out exp/38-v2-a.md
GEMINI_MODEL=gemini-3.8-flash      GEMINI_THINKING_LEVEL=low     pnpm quality-check --out exp/38-v2-b.md
# candidates
GEMINI_MODEL=gemini-3.1-flash-lite GEMINI_THINKING_LEVEL=minimal pnpm quality-check --out exp/lite31-v2-minimal.md
GEMINI_MODEL=gemini-3.1-flash-lite GEMINI_THINKING_LEVEL=low     pnpm quality-check --out exp/lite31-v2-low.md
# blind judge over all runs (same family as candidates — hand spot-check required)
pnpm judge exp/38-v2-a.json exp/38-v2-b.json exp/lite31-v2-minimal.json exp/lite31-v2-low.json
```
Скрипты: `apps/cms/scripts/quality-check.ts:1-11` и `apps/cms/scripts/judge.ts:1-10`. Желательно второй раз прогнать судью другой моделью через `--judge`, чтобы снизить смещение «своего» семейства.

Метрики:
- Overall, Meaning, Grammar, Level fit, Glosses, все **по уровням**;
- число абзацев с grammar ≤ 3;
- общее число замечаний судьи;
- `vocab item(s) not found verbatim` и `fails response validation` из `quality-check`;
- avg/p95 latency;
- $/абзац и токены in/out (строка `Tokens:`).

Порог «достаточно хорошо» (для каждого уровня отдельно):

| Метрика | Порог |
| --- | --- |
| Overall | ≥ 4.6 и не ниже baseline 3.8-v2 больше чем на 0.2 (разница между двумя baseline-прогонами задаёт шум; если шум больше 0.2, порог равен шуму) |
| Grammar | ≥ 4.6; не больше 1 абзаца из 20 с grammar ≤ 3 |
| Glosses | ≥ 4.6 |
| Meaning | ≥ 4.5; ни одного абзаца с meaning ≤ 2 (искажение факта) |
| Надёжность | 0 упавших вызовов и 0 провалов валидации; выпавших vocab ≤ 1 на 10 абзацев |
| Ручная проверка | Все ошибки артикля, рода и падежа проверены вручную. Ни одной неверной формы в глоссе `lemma` |
| Экономика | ≥ 2× дешевле или ≥ 1.5 s быстрее baseline (иначе риск не окупается) |

Решение:
- все уровни прошли: переключить `GEMINI_MODEL`;
- прошли только B1-B2/C1+: маршрутизация по уровню (R2, шаг 3);
- ничего не прошло: остаться на 3.8.

Онлайн-проверка неделю после выката:
- `report_rate_by_model` не больше 2× baseline;
- p95 в `provider_latency` не хуже;
- `wasted_paid_calls` не растёт.

---

## 4. Что я сознательно НЕ рекомендую

| Идея | Почему нет |
| --- | --- |
| Очередь, async-воркер, микросервисы, переписывание | Поток интерактивный, пользователь ждёт результат. Узкое место — один вызов Gemini (≈3.5 s, `docs/quality/2026-10-19/runs/gemini-3.8-flash-prompt-v2.md:6`). Пропускная способность ограничена 1500 вызовами в сутки. Очередь добавит задержку и ничего не ускорит |
| Context caching Gemini для инструкции промпта | Весь вход ≈386 токенов, это ниже минимального размера кэшируемого префикса (HYPOTHESIS по точному порогу). Вход составляет только ≈19% стоимости |
| Batch API (скидка за асинхронность) | Ответ приходит через минуты–часы, интерактивному сценарию не подходит |
| Перевод нескольких абзацев одним вызовом или prefetch видимых абзацев | Пользователь кликает по одному абзацу. Батч увеличит задержку, а prefetch будет оплачивать абзацы, на которые никто не кликнет |
| Streaming ответа | Ответ валидируется и кэшируется целиком (`apps/cms/src/routes/translate.ts:86-91`), подстановка в DOM атомарна. Выигрыш в UX мал, а сложность большая |
| Redis/KV перед Neon | Hit — это 1 RTT внутри региона (`apps/cms/src/cache/store.ts:13-19`). Нет данных, что он заметен на фоне всего остального |
| Распределённое (межинстансное) слияние запросов | Одинаковые параллельные запросы на разных инстансах редки. Худший случай — один лишний вызов, который `ON CONFLICT DO NOTHING` не сохранит дважды |
| Отдавать после bump записи старой версии промпта | Это намеренно худший вывод. Стоимость bump и так мала, потому что повторы гасит локальный кэш (K2) |
| Урезать инструкции промпта ради цены | Вход ≈19% цены, а добавления v2 дали глоссы +1.05 балла (`judge-3.8-prompt-v1-vs-v2.md:9-10`) |
| Вытеснение локального кэша или перенос vocab в IndexedDB прямо сейчас | Запись словаря ~150 байт. До квоты `chrome.storage.local` около 10 МБ (нет `unlimitedStorage`, `apps/extension/wxt.config.ts:36`), то есть десятки тысяч слов. Сначала надо исправить шаблон записи (C1) |
| Лимиты по install ID | ID генерирует клиент, его легко сменить. По дизайну он не отправляется в `/api/translate` (`apps/extension/lib/metrics/events.ts:74-76`, конституция III) |
| Ключ API внутри расширения | Код расширения публичный, ключ извлекается за минуту |
| Сменить драйвер Neon на WebSocket/pool | На запрос приходится 1–4 простых запроса. HTTP-драйвер правильный выбор для serverless (`apps/cms/src/db.ts:5-8`). Лишние RTT убираются правкой S1/S5, а не сменой драйвера |
| Повторять здесь существующее (два уровня кэша, coalescing, генерация упражнений кодом, дневной лимит) | Это уже есть. Выше предлагаются только их доработки |
