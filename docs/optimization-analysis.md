# Sprachweise: анализ оптимизаций (стоимость, задержка, cold start)

- Дата: 2026-10-29. Ветка: `main` (`db41053`). Только анализ: код не менялся, сеть и БД не трогались.
- Версия 2 (2026-10-30). Каждое утверждение внешнего ревью (GPT Astra) я проверил по коду. Подтверждённые пункты внесены в таблицу, рекомендации и план измерений. Вердикты по всем пунктам ревью собраны в разделе 5.
- VERIFIED означает «видно в исходниках или в сохранённых отчётах», а не «измерено в production». Усилие S/M/L — экспертная оценка.
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
| 1 | A1 | Расходы / abuse | Нет `maxOutputTokens`. Лимит 5000 символов при типичном абзаце ≈250. Allowance считает запуски pipeline, а не деньги и не HTTP-попытки: ретрай идёт внутри одной резервации, поэтому 1500 резерваций допускают до 3000 платных попыток. Худший запрос стоит ≈6–8× типичного, а при зацикленной генерации ограничен только лимитом модели | `apps/cms/src/pipeline/translate.ts:90-114`, `apps/cms/src/config.ts:11,13`, `apps/cms/src/usage/ledger.ts:72-84`, `apps/cms/src/routes/translate.ts:54-67`, `apps/cms/src/pipeline/retry.ts:5-16` | Худший день при исчерпании лимита длинными текстами: без ретраев (1500 попыток) ≈$15–20 сейчас и ≈$30–40 с 2027; если каждая резервация ретраится (3000 попыток) ≈$27–39 и ≈$54–78. Это оценка для длинного, но нормального ответа, а не потолок: при зацикленной генерации верхней границы в $ нет. После фикса ≈$2–5/день | Слишком низкий `maxOutputTokens` обрежет JSON, и ответ уйдёт в 502 | S | VERIFIED (код) / HYPOTHESIS (оценка $) |
| 2 | A2 | Abuse | CORS только выставляет заголовки и не отклоняет запросы. Любой HTTP-клиент тратит общий лимит. Когда лимит исчерпан, сервис ложится у всех пользователей | `apps/cms/src/build-app.ts:32-38`, `apps/cms/tests/integration/cors.test.ts:21-28`, `apps/extension/lib/config.ts:6` | Защита от «бесплатного API перевода» и от DoS через лимит | Проверку Origin легко подделать, это только порог от наивных скриптов | S | VERIFIED |
| 3 | L1 | Стоимость LLM | 3.8-flash дорожает ×2 с 2027-01-01. `costUsd` не учитывает дату, поэтому `provider_calls.cost_usd` начнёт занижать расходы | `apps/cms/src/pipeline/pricing.ts:7-9,13-21` | Корректный учёт. Решение по модели нужно принять до 1 января | Нет | S | VERIFIED |
| 4 | L2 | Стоимость LLM | flash-lite в 3× дешевле и в 2.3× быстрее. Отставание сосредоточено в A1-A2 (4.02 против 4.91), в B1-B2 оно небольшое (4.64 против 4.81). На prompt v2 flash-lite **не проверялся** | `docs/quality/2026-10-19/judge-4-models.md:9,11`, `docs/quality/2026-10-19/README.md:14` | −60…80% $/абзац, −2 s задержки, если пройдёт порог качества (полностью или для части уровней) | Грамматические ошибки (неверный артикль) вредны для учащихся | M | HYPOTHESIS |
| 5 | S1 | Cold start | `ensureSchema`: 6 последовательных DDL через HTTP-драйвер Neon на первый запрос каждого инстанса. Затрагивает translate/events/report | `apps/cms/src/db.ts:14,21-73,76-78,84-95`, `apps/cms/src/build-app.ts:40-44` | −5 RTT к Neon на каждом холодном инстансе (оценка 50–150 ms) | Нужна миграция при деплое, иначе новая колонка не появится | S | VERIFIED / HYPOTHESIS (ms) |
| 6 | S2 | Задержка | `/api/exercises` даёт лишний сетевой RTT и отдельный вызов функции на каждый перевод. При этом генератор чистый и импортирует только тип | `apps/extension/entrypoints/background.ts:117`, `apps/cms/src/routes/exercises.ts:6,22`, `apps/cms/src/exercises/generate.ts:1` | −1 RTT (≈50–150 ms тёплый, до 1 s+ на холодном инстансе), −1 invocation на перевод, упражнения работают офлайн | Логика упражнений будет меняться только с релизом в стор | M | VERIFIED / HYPOTHESIS (ms) |
| 7 | S3 | Задержка / расходы | Ретрай: таймаут 15 s, затем пауза 200 ms и ещё 15 s, итого ≈30.2 s в худшем случае. Повторяются 429 и таймауты, общего дедлайна нет. У `fetch` клиента нет таймаута. Ретраи не видны ни в `provider_calls`, ни в allowance (одна резервация на обе попытки) | `apps/cms/src/pipeline/retry.ts:5-16`, `apps/cms/src/pipeline/translate.ts:128,204-207`, `apps/cms/src/routes/translate.ts:57,61-85`, `apps/extension/lib/cms/client.ts:44` | Хвост задержки ≤10–12 s вместо 30 s. Резервация на каждую попытку и видимость ретраев | Короткий дедлайн чаще даёт 502 на длинных абзацах | S | VERIFIED |
| 8 | C1 | Клиент | `recordVocabEncounters` при k spans делает k+1 полных чтений и k полных записей объекта `vocabulary` на перевод, то есть O(k·N). `recordAttempt` при каждом ответе тоже читает и переписывает целиком `vocabulary` и `reviewQueue`, а потом пересчитывает все слова (O(N+R)). Каждая запись рассылается во все вкладки. Операции не сериализованы между собой, поэтому возможна потеря обновлений | `apps/extension/lib/vocab/upsert.ts:19,43`, `apps/extension/lib/storage/progress.ts:36-41,85-123`, `apps/extension/entrypoints/background.ts:358-366` | Вместо 3–8 записей одна. Нет гонок | Низкий | S | VERIFIED |
| 9 | C2 | Клиент | `findExerciseById` при каждом ответе перебирает **все** наборы упражнений в IndexedDB, по одному `get` на ключ. Сообщение не несёт ключ кэша | `apps/extension/lib/storage/content-cache.ts:70-81`, `packages/shared/src/schemas/messages.ts:41-47`, `apps/extension/entrypoints/background.ts:164` | O(N) превращается в O(1). Рост задержки ответа с историей исчезает | Низкий (нужно поле `variantId` в сообщении) | S | VERIFIED (рост) / HYPOTHESIS (ms) |
| 10 | C3 | Клиент | Любая запись vocab/progress делает `chrome.tabs.query({})` и шлёт `sendMessage` в каждую вкладку. Content script слушает только `siteRules` | `apps/extension/entrypoints/background.ts:337-349,358-366`, `apps/extension/entrypoints/content/index.tsx:212`, `apps/extension/entrypoints/options/ProgressView.tsx:18` | −(вкладки × записи) IPC на каждый перевод и ответ | Нет | S | VERIFIED |
| 11 | K1 | Кэш | В `cache_entries` нет `model`/`prompt_version`/`level`, записи вечные. Hit rate по версии не измерить, мёртвые строки после bump не удалить | `apps/cms/src/db.ts:22-27`, `apps/cms/src/cache/store.ts:22-28` | Измеримость, чистка старых версий | Миграция таблицы | S | VERIFIED |
| 12 | M1 | Метрики | Не записываются: уровень (ни в `events`, ни в `provider_calls`), номер попытки, локальные cache hit, задержка `/api/exercises` | `apps/cms/src/db.ts:29-54`, `apps/extension/entrypoints/background.ts:62-64,79-82`, `specs/003-private-beta/metrics.sql:8-9` | Без этого не доказать эффект L2/S2/S3 | Только поля без текста (конституция III) | S | VERIFIED |
| 12a | M2 | Учёт расходов | `provider_calls` недоучитывает расходы, и есть три причины. Usage неудачной попытки теряется: ошибки разбора и формы ответа бросаются до возврата usage, поэтому строка `error` пишется без токенов, а при ретрае `ok` содержит usage только второй попытки. Статус `ok` пишется до валидации и записи в кэш, так что `ok` не означает доставленный перевод. Наконец, при отсутствии `usageMetadata` любое поле превращается в 0, поэтому «0 thinking» может означать «поле не пришло» | `apps/cms/src/pipeline/translate.ts:157-172,182-190`, `apps/cms/src/routes/translate.ts:69-91`, `apps/cms/src/usage/provider-calls.ts:30` | Точная стоимость и честный «cost per delivered translation» | Не подменять неизвестную стоимость нулём. Не добавлять текст, URL или installId в журнал | S | VERIFIED (пробел) / HYPOTHESIS (размер недоучёта) |
| 13 | C4 | Клиент / DOM | `findEligibleParagraphs` вызывает `innerText` (форсирует layout) на каждом кандидате и на каждом его ребёнке. Density-лимит применяется после полного обхода страницы | `apps/extension/lib/dom/paragraph-parser.ts:39-44,52-64,71-77`, `apps/extension/entrypoints/content/index.tsx:146-155` | На длинных страницах (Википедия, форумы) десятки–сотни ms main thread при загрузке. Ранний выход сохраняет семантику | Низкий | S | HYPOTHESIS |
| 14 | C5 | Клиент / сервер | Каждое событие сразу шлёт отдельный `POST /api/events`. На один перевод получается 3 вызова функции (translate + exercises + events), на каждый ответ ещё 1 | `apps/extension/lib/metrics/events.ts:77-87`, `apps/cms/src/routes/events.ts:17,22` | −30…50% invocations и меньше пробуждений Neon | Задержка доставки метрик | M | HYPOTHESIS |
| 15 | L3 | Стоимость LLM | Output составляет 81% цены. JSON-ключи `german/lemma/russian` повторяются в 3–8 объектах | `apps/cms/src/pipeline/translate.ts:69-79,92-110` | −10…25% output-токенов | Качество глосс (v2 их подняло) | M | HYPOTHESIS |
| 16 | S4 | Cold start / инфраструктура | Регион задан не в репо, а в дашборде (по документам `fra1` + Neon `aws-eu-central-1`). Пробуждение Neon после простоя (scale-to-zero) попадает в запрос пользователя | `docs/ship-first-dollar.md:101-103`, `apps/cms/src/privacy/policy.ts:128`, нет `vercel.json` | Подтвердить совпадение регионов. Возможно −0.3…1 s на первом запросе после простоя | Отключение scale-to-zero стоит денег | S (конфиг) | HYPOTHESIS |
| 17 | C6 | Клиент | Для тултипа одного слова content script запрашивает весь снапшот (vocab + reviewQueue + profile). Снапшот сбрасывается после каждого перевода | `apps/extension/entrypoints/content/index.tsx:56,89-98`, `apps/extension/entrypoints/background.ts:312-325` | Меньше сериализации при большом словаре | Нет | S | VERIFIED (влияние малое) |
| 18 | S5 | Задержка | На miss после Gemini идут две последовательные записи (`provider_calls`, потом `cache_entries`) | `apps/cms/src/routes/translate.ts:76-91` | −1 RTT (≈10–30 ms) | Нет | S | VERIFIED (влияние малое) |
| 19 | K2 | Кэш | При bump модели или промпта локальный кэш не инвалидируется (в ключе нет model/pv), поэтому старые переводы v1 остаются у пользователей навсегда. Серверный кэш пустеет полностью, но повторы и так гасит локальный кэш | `apps/extension/lib/storage/content-cache.ts:36-37`, `apps/cms/src/cache/key.ts:21`, `apps/extension/entrypoints/background.ts:97-98` | Стоимость bump мала (≈ трафик новых абзацев). Расхождение кэшей касается качества, а не денег | — | — | VERIFIED / HYPOTHESIS (hit rate) |
| 20 | K3 | Кэш / корректность | (а) Пока DOM не заменён, повторный клик запускает второй `TRANSLATE_PARAGRAPH`. Клиентской блокировки запросов в полёте нет, поэтому оба получают локальный miss, оба ходят в сеть и оба вызывают `recordVocabEncounters`, то есть `encounterCount` считается дважды. Серверный coalescing это не устраняет, он работает только внутри одного инстанса. (б) Нормализация серверного ключа: только trim и схлопывание пробелов (нет NFC, soft hyphen, zero-width) | `apps/extension/entrypoints/content/index.tsx:128-144`, `apps/extension/entrypoints/background.ts:56-83`, `apps/cms/src/cache/coalesce.ts:8`, `apps/cms/src/cache/key.ts:4-5` | (а) Нет двойного учёта и лишнего запроса. (б) Небольшой прирост hit rate между пользователями | Нет | S | VERIFIED (а) / HYPOTHESIS (частота а, эффект б) |
| 21 | C7 | Клиент | React-панель монтируется на каждой загрузке разрешённого сайта, даже если пользователь ничего не нажмёт | `apps/extension/entrypoints/content/index.tsx:195-206`, `apps/extension/lib/content-script-registration.ts:39` | Меньше parse/execute на страницу | Регрессии UI-тестов | M | HYPOTHESIS |
| 22 | S6 | Cold start | В бандле сервера npm-зависимости внешние (Vercel трассирует `node_modules`), есть sourcemap | `apps/cms/scripts/bundle.mjs:8-10,19-20` | Вероятно, единицы–десятки ms | Сложнее отладка | S | HYPOTHESIS (малое) |

### Детали и как закрыть гипотезы

**A1. Цена худшего запроса.** `TranslateRequestSchema` ограничивает текст только снизу (`packages/shared/src/schemas/cms.ts:4-8`), сервер режет на 5000 символах (`apps/cms/src/routes/translate.ts:34`). Клиент шлёт абзацы длиннее 80 символов (`apps/extension/lib/dom/paragraph-parser.ts:3`), в среднем в тестовом наборе около 253 символов. Абзац в 5000 символов примерно в 20 раз длиннее среднего.
- Оценка: ≈1500 входных токенов и ≈2200–3200 выходных, то есть ≈$0.009–0.013 за вызов при сегодняшней цене.
- Без ретраев: если выжечь все 1500 резерваций такими текстами по одной попытке, получится ≈$15–20 в сутки (≈$450–600 в месяц), а с 2027 вдвое больше (≈$30–40).
- С ретраями: каждая резервация допускает две оплачиваемые попытки (см. VERIFIED ниже), то есть до 3000 попыток × $0.009–0.013 ≈ $27–39 в сутки сейчас и ≈$54–78 с 2027.
- Обе цифры описывают обычный длинный ответ, а не максимум расходов. Без `maxOutputTokens` редкая зацикленная генерация ограничена только потолком модели, поэтому сверху по $ сутки не ограничены.
- VERIFIED: резерв делается один раз на запуск pipeline, внутри `coalescing.run`, а ретрай повторяет `fetch` без новой резервации (`apps/cms/src/routes/translate.ts:54-67`, `apps/cms/src/pipeline/retry.ts:5-16`). Значит, 1500 резерваций в сутки допускают до 3000 HTTP-попыток к Gemini. «Сутки» здесь означают UTC-день резервации, а сама попытка может закончиться уже после полуночи (`apps/cms/src/usage/ledger.ts:72-84`).
- Как закрыть: SQL «token_distribution» (раздел 3) даёт p99/max `prompt_tokens` и `output_tokens` в проде. Отдельно стоит проверить в Google Billing, тарифицируются ли вызовы, оборванные по таймауту.

**A2. CORS не авторизация.** `@fastify/cors` с callback `origin` только решает, ставить ли `Access-Control-Allow-Origin`. Обработчик маршрута выполняется для любого Origin и для запросов без него (`apps/cms/src/build-app.ts:34-38`). Тест проверяет только заголовок (`apps/cms/tests/integration/cors.test.ts:26-28`). URL API зашит в публичный бандл (`apps/extension/lib/config.ts:6`). Лимит общий для всех (`apps/cms/src/usage/ledger.ts:79`), поэтому один скрейпер, исчерпав его, вызывает 429 у всех (`apps/cms/src/routes/translate.ts:103`). Hashed-IP лимит уже спроектирован, но отложен (`docs/ship-first-dollar.md:69`). Install ID создаётся на клиенте и уходит только в `/api/events` (`apps/extension/lib/metrics/events.ts:74-76`), так что пропуском он служить не может. Защищает ли production что-то на уровне хостинга, неизвестно: в репо задокументирована только Vercel Authentication для preview (`.github/workflows/preview-smoke.yml:18-19`), это HYPOTHESIS, проверить в настройках проекта. Как увидеть атаку: SQL «calls_not_seen_by_extension» в разделе 3. Это сигнал, а не точный счёт (см. ограничения данных в 3.1).

**L1.** Комментарий о подорожании есть (`pricing.ts:7`), но таблица `PRICES` одна и без дат. После 2027-01-01 `cost_usd` в `provider_calls` будет вдвое занижен (`apps/cms/src/usage/provider-calls.ts:30`).

**L2. flash-lite.** Сравнение моделей делалось только на prompt v1 (`docs/quality/2026-10-19/README.md:9-10`). Prompt v2 поднял 3.8 по глоссам с 3.80 до 4.85 (`judge-3.8-prompt-v1-vs-v2.md:9-10`), а именно глоссы и грамматика слабое место lite. Выборка мала: 20 русских абзацев, только A1-A2 и B1-B2 (`apps/cms/scripts/quality-paragraphs.ts:9`). Судья из того же семейства (`apps/cms/scripts/judge.ts:9`). Уровень по умолчанию A1-A2 (`apps/extension/lib/storage/settings.ts:15`), то есть, вероятно, большая часть трафика приходится на самый слабый для lite уровень. Это гипотеза: распределения по уровням нет (M1). Как закрыть: эксперимент из раздела 3.2.

Ограничения имеющихся данных (VERIFIED, найдено при сверке с внешним ревью):
- В v1-сравнении 3.8 шла с thinking `low`, а остальные модели с `minimal` (`runs/*-prompt-v1.md:4`). Эффект модели не отделён от эффекта thinking.
- Оценки судьи не образуют единую шкалу между прогонами: один и тот же 3.8 v1 получил 4.86 в одном прогоне и 4.59 в другом (`judge-4-models.md:9`, `judge-3.8-prompt-v1-vs-v2.md:10`). Сравнивать можно только кандидатов внутри одного прогона судьи.
- $0.00039 у lite v1 и $0.00156 у 3.8 v2 получены на разных промптах, поэтому это не прогноз экономии. Оценка lite v2 ≈$0.0006 в R2 тоже HYPOTHESIS.
- «0 thinking» в отчётах может означать отсутствующее поле: при отсутствии значения оно подставляется как 0 (`apps/cms/src/pipeline/translate.ts:188`).

**M2. Учёт расходов неполон.** `doTranslate` бросает ошибку разбора или формы ответа раньше, чем возвращает usage (`apps/cms/src/pipeline/translate.ts:157-172` против `182-190`). Отсюда следуют три вещи:
- оплаченная, но непригодная попытка не попадает в `cost_usd`;
- при ретрае `ok`-строка несёт usage только второй попытки;
- финальная ошибка пишется без usage (`apps/cms/src/routes/translate.ts:69-75`).
Строка `ok` пишется до `TranslateResponseSchema.parse` и `putCacheEntry` (`routes/translate.ts:76-91`), поэтому `ok` не означает доставленный перевод: разницу показывает SQL «wasted_paid_calls». Как закрыть: писать строку на каждую попытку (номер попытки, статус, usage при наличии), а для невалидных ответов сохранять `usageMetadata` до разбора payload.

**K3. Двойной клик.** `onParagraphClick` проверяет только `isTranslated(el)` (`apps/extension/entrypoints/content/index.tsx:136`), а этот флаг выставляется лишь после ответа. Каждый клик до ответа шлёт ещё один `TRANSLATE_PARAGRAPH`, и фон для каждого делает локальный miss, сетевой запрос и `recordVocabEncounters` (`apps/extension/entrypoints/background.ts:56-83`). Это VERIFIED. Частота неизвестна (HYPOTHESIS). Как закрыть: e2e-тест с двойным кликом и проверкой `encounterCount`. Исправление: in-flight `Map<cacheKey, Promise>` в фоне, тот же приём, что серверный `createCoalescingMap` (`apps/cms/src/cache/coalesce.ts:6-20`).

**S1. DDL на холодном старте.** `withSchema` мемоизирует `ensureSchema` на процесс (`apps/cms/src/db.ts:84-95`). Это 6 отдельных HTTP-запросов к Neon по очереди (`apps/cms/src/db.ts:77`) до первого полезного запроса. Сюда попадают и `/api/events`, и `/api/report` (`apps/cms/src/build-app.ts:40-44`). Как закрыть: временно логировать длительность `ensureSchema` (одна строка `request.log.info`, без текста) или смотреть duration первых запросов инстанса в Vercel runtime logs.

**S2. Лишний round trip.** Поток в фоне строго последовательный: translate, затем `recordVocabEncounters`, затем `putCachedVariant`, затем `POST /api/exercises` (`apps/extension/entrypoints/background.ts:73-117`). Для закэшированного варианта без упражнений сеть нужна снова (`background.ts:66-69,117`). Генератор не имеет зависимостей, кроме типа (`apps/cms/src/exercises/generate.ts:1`), поэтому переносится в `packages/shared` без изменений. Как закрыть: замерить `performance.now()` вокруг `generateExercises` в фоне (сейчас задержка упражнений нигде не пишется, M1).

**S3. Ретраи.** Любая ошибка, кроме `ProviderConfigError`, включая `AbortSignal.timeout` и HTTP 429, повторяется через 200 ms (`apps/cms/src/pipeline/translate.ts:204-207`, `apps/cms/src/pipeline/retry.ts:13-15`). Строка `provider_calls` пишется одна на весь `withRetry`, её latency включает обе попытки, а usage берётся только у успешной (`apps/cms/src/routes/translate.ts:61-85`). Резерв allowance тоже один (`routes/translate.ts:57`). Если `maxDuration` функции на Vercel меньше 30 s, функцию убьют посреди ретрая. Тогда в `usage_counters` будет резерв без строки в `provider_calls` (SQL «allowance_utilization»).

**C1/C2/C3.** Это проверено чтением кода. Задержку можно замерить в DevTools service worker: `performance.now()` вокруг `recordVocabEncounters` и `findExerciseById` при 1k/5k словах и абзацах (синтетически заполнить storage в тесте).

**C4.** Как закрыть: Performance-профиль `activate()` на 3–5 тяжёлых страницах (длинная статья Википедии, тред форума, лента новостей) до и после правки.

**C5.** Как закрыть: Vercel Observability, invocations по путям `/api/events` против `/api/translate`.

**L3.** Как закрыть: прогнать `quality-check` с компактной схемой vocab и сравнить строку `Tokens:` и оценки судьи с baseline.

**S4.** Как закрыть: проверить регион функций и Neon в дашбордах, `suspend_timeout` compute и SQL «idle_gaps» (доля платных вызовов после паузы в платных вызовах больше 5 минут). Это прокси без гарантированной границы: cache hit, `/api/events` и `/api/report` тоже обращаются к БД, не создавая строк `provider_calls`, так что пауза здесь не означает простоя Neon. Фактические suspend/resume проверять отдельно по истории compute в Neon, иначе эксперимент припишет простои тёплым запросам.

**K2.** Как закрыть: SQL «server_cache_hit_rate». Если доля hit на сервере в единицах процентов, серверный кэш почти не экономит и цена bump пренебрежима.

---

## 2. Топ-3 рекомендации

### R1. Ограничить расходы на запрос и закрыть API от скрейперов (A1 + A2)
Почему первым: изменения S-размера, а без них публичный листинг даёт расходы без верхней границы в $ и общий DoS через лимит.
1. Выполнить SQL `token_distribution` (раздел 3) и получить p99/max `prompt_tokens` и `output_tokens` по модели.
2. Добавить в `generationConfig` значение `maxOutputTokens` ≈ 2× p99 output (по бете ожидаю ≈1000–1500) (`apps/cms/src/pipeline/translate.ts:90-114`). Если ответ упрётся в лимит (`finishReason: MAX_TOKENS`), он не пройдёт парсинг и вернётся 502 без кэширования. Это уже обрабатывается (`translate.ts:163-172`).
3. Снизить лимит входа до p99 длины реальных абзацев с запасом (ожидаю 1500–2000). Просто поменять env нельзя: тот же `TRANSLATE_MAX_CHARS` (`apps/cms/src/config.ts:11`) ограничивает и немецкий `variantText` в `/api/exercises` (`apps/cms/src/routes/exercises.ts:15-19`). Перевод допустимого исходника может оказаться длиннее него, и тогда ответ будет оплачен и закэширован, а упражнения получат 400. Поэтому сначала разделить лимиты: `TRANSLATE_MAX_CHARS` для входа `/api/translate` и отдельный лимит для `variantText`, не ниже текущих 5000. Так продолжат работать уже закэшированные ответы и старые версии расширения, которые и дальше ходят в `/api/exercises`: перенос генератора в новые версии (R3, шаг 1) их не исправит. Только после этого снижать лимит входа через env.
4. Сделать единицей лимита фактическую HTTP-попытку к Gemini: резервировать перед каждым `fetch`, включая ретрай, а не один раз на pipeline (`apps/cms/src/routes/translate.ts:57`, `apps/cms/src/pipeline/retry.ts:5-16`). Мемоизированный `ProviderConfigError` до `fetch` не доходит и резервацию тратить не должен. Вторым счётчиком в `reserveCounters` (`apps/cms/src/usage/ledger.ts:53-66`) ввести дневной бюджет в токенах, где резерв равен оценке по длине текста. Механизм «всё или ничего» уже есть.
4a. Писать строку `provider_calls` на каждую попытку: номер попытки, статус, usage при наличии (M2). Неизвестную стоимость оставлять `NULL`, не 0.
5. Отклонять на сервере запросы с `Origin`, которого нет в `CORS_ALLOWED_ORIGINS` (хук `onRequest` в `apps/cms/src/build-app.ts`), с ответом 403. Это не аутентификация, а отсечение браузерных злоупотреблений и наивных скриптов.
6. В Vercel Firewall добавить rate-limit правило на `/api/translate` по IP (например, 60 запросов в минуту и ~300 в сутки). Это конфиг, не код. Наличие на текущем плане надо проверить.
7. Когда лимиты вернутся в план, включить уже спроектированный hashed-IP ledger (`docs/ship-first-dollar.md:69`).
8. Ежедневно проверять SQL `allowance_utilization` и `calls_not_seen_by_extension` и завести алерт при использовании лимита выше 80%.
9. Позже, вместе с платным тарифом: квота на выданный сервером ключ. Лицензионный ключ Pro уже запланирован (`docs/ship-first-dollar.md:70,89`). Оговорка: у расширения без аккаунтов эндпоинт выдачи анонимного токена сам становится целью скрейпинга, поэтому без лимита выдачи по IP или без оплаты такой токен ничего не доказывает. Общий секрет внутри расширения не годится: код публичный.

Критерий успеха: max `output_tokens` ≤ лимита, число попыток ≤ числа резерваций, `calls_not_seen_by_extension` около 0 (с учётом ограничений данных), нет дней со 100% лимита без роста DAU.

### R2. Решение по модели до 2027-01-01 (L1 + L2)
1. Сделать `pricing.ts` зависимым от даты, например `[{ from: "2027-01-01", price: [1.5, 7.5] }]` для 3.6 и 3.8, и передавать в `costUsd` время вызова (`apps/cms/src/pipeline/pricing.ts:13`).
2. Провести офлайн-эксперимент из раздела 3.2: 3.1-flash-lite на prompt v2 против 3.8 на prompt v2, по уровням.
3. Принять решение:
   - lite проходит порог на всех уровнях: переключить `GEMINI_MODEL` (env, без кода);
   - lite проходит только для B1-B2/C1+: добавить маршрутизацию модели по `level`, но не внутри `translateParagraph`. Обработчик заранее берёт модель из глобального `cfg.GEMINI_MODEL` для `producedBy`, ключа кэша, `call` и `provider_calls` (`apps/cms/src/routes/translate.ts:24,42-85`). Если выбирать модель только в `translateParagraph`, существующие записи 3.8 обойдут маршрутизацию, а новые lite-ответы будут записаны в кэш и учтены как 3.8. Поэтому фактическую конфигурацию `{ model, thinkingLevel }` нужно выбирать в начале обработчика, до `cacheKey`/`getCacheEntry`, и передавать её во всё остальное: ключ, `producedBy`, `recordProviderCall`, `translateParagraph`. Модель в ключе кэша уже есть (`apps/cms/src/cache/key.ts:21`), так что при правильном выборе ответы не смешаются;
   - lite не проходит: оставить 3.8, заложить в бюджет ≈$0.0031 за абзац и вернуться к L3.
4. Выкатить на неделю и следить за `provider_latency` и `cost_per_day`. Откатить, если ухудшилась p95. `report_rate_by_model` для порога отката не годится: жалобы приходят и на показы из кэша (обоих уровней), а знаменатель считает только новые генерации, поэтому после смены модели отношение зависит от возраста кэша и hit rate, а не только от качества. Для порога «доля „Плохой перевод“ не больше 2× baseline» нужен учёт показов по фактической модели, включая оба уровня кэша (например, `model` в событии `paragraph_translated`, `packages/shared/src/schemas/cms.ts:136-141`). Пока его нет, запрос только диагностический, а решение держится на офлайн-эксперименте (3.2).
5. Учесть, что смена модели обнуляет серверный кэш. Это дёшево (K2): локальные кэши пользователей продолжат отдавать старые переводы.

Ожидаемый эффект при полном переходе: ≈$0.0006 за абзац (386×0.25 + ~340×1.5 µ$) против $0.00156 сейчас и $0.00312 с 2027, то есть в 2.6–5× дешевле. Задержка ≈1.3 s против ≈3.5 s. Это HYPOTHESIS до эксперимента. Токены lite взяты из прогона v1 (там thinking `minimal`), а на v2 их число вырастет.

### R3. Сократить интерактивный путь (S2 + S1 + S3, плюс быстрые C1–C3)
1. Перенести `apps/cms/src/exercises/generate.ts` в `packages/shared` и вызывать его в `handleTranslateParagraph` вместо `POST /api/exercises` (`apps/extension/entrypoints/background.ts:117`). Эндпоинт оставить ради старых версий расширения. Тесты `apps/cms/tests/unit/generate-exercises.test.ts` переезжают вместе с кодом.
2. Убрать DDL с пути запроса. Для этого сделать скрипт `pnpm --filter @sprachweise/cms migrate`, который вызывает `ensureSchema` и запускается перед `vercel deploy --prod`, а `withSchema` в проде отключить. Минимальный вариант: выполнить 6 statements одним `sql.transaction([...])`, то есть одним HTTP-запросом (`apps/cms/src/db.ts:76-78`).
3. Ретраи:
   - общий дедлайн около 10–12 s: первая попытка до ~8 s, ретрай только при оставшемся бюджете;
   - не повторять 429 и 4xx;
   - `AbortSignal.timeout(20000)` в `postJson` клиента (`apps/extension/lib/cms/client.ts:44`);
   - колонка `attempts` в `provider_calls`, каждую попытку писать отдельно (`apps/cms/src/routes/translate.ts:61-85`).
4. В том же PR сделать быстрые клиентские правки:
   - C1: одна запись `vocabulary` после цикла (`apps/extension/lib/vocab/upsert.ts:43`) и общая очередь сериализации для `recordVocabEncounters` и `recordAttempt` (`apps/extension/lib/storage/progress.ts:85-123`). Пакетирование само по себе гонку не устраняет, нужна именно общая очередь;
   - K3: in-flight дедупликация `TRANSLATE_PARAGRAPH` по `cacheKey` в фоне, чтобы при двойном клике `encounterCount` не удваивался;
   - C2: передавать `variantId` в `SUBMIT_EXERCISE_ATTEMPT` (он уже есть в сессии, `apps/extension/entrypoints/content/index.tsx:53`) и читать один ключ вместо перебора (`apps/extension/lib/storage/content-cache.ts:70-81`);
   - C3: рассылать во вкладки только slice `siteRules` (`apps/extension/entrypoints/background.ts:337-349`).
5. Замерить до и после: SQL `latency_weekly` (hit/miss p50/p95), новое событие с задержкой «перевод + упражнения», duration первого запроса инстанса.

Ожидаемый эффект: −1 RTT и −1 invocation на каждый перевод, −5 RTT на холодный инстанс, хвост ≤12 s вместо 30 s. Абсолютные ms пока HYPOTHESIS: доминирует Gemini, ≈3.5 s.

---

## 3. План измерений

### 3.1. SQL (PostgreSQL, Neon; не запускался)

Готовые запросы `dau`, `errors` и `latency` уже есть в `specs/003-private-beta/metrics.sql:14,98,111`. Ниже только новые запросы в том же формате `-- name:`. Дни считаются в UTC. `events` хранит только день (`occurred_on`), `provider_calls` хранит timestamp.

Ограничения данных (VERIFIED; дополнено после сверки с внешним ревью):
- Локальные cache hit событий не шлют (`specs/003-private-beta/metrics.sql:8-9`). Hit rate считается только по запросам, дошедшим до сервера.
- В `provider_calls` нет уровня и номера попытки (M1). Одна строка соответствует одному `withRetry`, а не одной HTTP-попытке.
- У ошибочных вызовов `cost_usd` равен NULL, хотя Google мог их тарифицировать. Usage неудачной попытки теряется (M2).
- `ok` в `provider_calls` пишется до валидации и записи в кэш (`apps/cms/src/routes/translate.ts:76-91`).
- Запросы, слитые coalescing, тоже получают `cache: "miss"` (`apps/cms/src/routes/translate.ts:95`). Поэтому клиентских miss может быть больше, чем платных вызовов.
- Если после удачного перевода упадёт запись в storage, клиент пошлёт и `paragraph_translated`, и `translate-failed` (`apps/extension/entrypoints/background.ts:78-83,100-109`). Клиентская доля ошибок поэтому приблизительная.
- События доставляются по возможности: очередь ограничена 200 событиями, данные хранятся 90 дней (`apps/extension/lib/metrics/events.ts:8`, `apps/cms/src/metrics/events.ts:4`). Строка `provider_calls` пишется в режиме «никогда не бросает» (`apps/cms/src/usage/provider-calls.ts:12-37`).
- Общего ключа запроса у `events` и `provider_calls` нет. Агрегаты сопоставляются только по дню, и это диагностические отношения, а не стоимость конкретного перевода. Сырые строки по дню не соединять: это размножит суммы. Резервация (`usage_counters`) и строка `provider_calls` могут попасть в разные UTC-дни.
- `/api/health` к БД не обращается (`apps/cms/src/build-app.ts:45`). Как проба БД или прогрев Neon он не годится.

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
  ROUND($1::int * AVG((u.tokens_in * s.usd_in_per_m + u.tokens_out * s.usd_out_per_m) / 1e6), 2)
    AS usd_per_day_at_allowance -- $1 = GEMINI_DAILY_REQUEST_ALLOWANCE; up to 2x with retries
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

-- name: retries_heuristic
-- Retries aren't recorded (one provider_calls row per withRetry), so the exact retry share is
-- unobservable. Estimate: an OK call slower than the 15 s timeout (GEMINI_TIMEOUT_MS) must have
-- retried after a timeout; a non-config error is retried once. Caveats: a fast failure followed by
-- a fast success is invisible (undercount); an error that was never retried (ProviderConfigError,
-- which pipeline/translate.ts excludes from retries) but took >= 50 ms lands in errors_retried
-- (overcount). So it is neither a lower nor an upper bound: an unverified heuristic, trend only.
-- Exact counts need per-attempt rows (M2).
SELECT
  (created_at AT TIME ZONE 'UTC')::date AS day,
  COUNT(*) FILTER (WHERE status = 'ok') AS ok_calls,
  COUNT(*) FILTER (WHERE status = 'ok' AND latency_ms >= 15000) AS ok_after_timeout_retry,
  COUNT(*) FILTER (WHERE status = 'error' AND latency_ms >= 50) AS errors_retried,
  COUNT(*) FILTER (WHERE status = 'ok' AND latency_ms >= 15000)
    + COUNT(*) FILTER (WHERE status = 'error' AND latency_ms >= 50) AS retries_est,
  ROUND(
    100.0 * (COUNT(*) FILTER (WHERE status = 'ok' AND latency_ms >= 15000)
             + COUNT(*) FILTER (WHERE status = 'error' AND latency_ms >= 50))
      / NULLIF(COUNT(*), 0),
    2
  ) AS retry_pct_est
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
-- Daily allowance use. $1 = the deployed GEMINI_DAILY_REQUEST_ALLOWANCE (1500 is only the default).
-- reservation_record_gap is NOT a retry count: a reservation may lack a row because the
-- best-effort insert failed, the function was killed mid-call (e.g. maxDuration < 30 s), or the
-- call finished after UTC midnight (row lands on the next day).
WITH calls AS (
  SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*) AS recorded_calls
  FROM provider_calls
  GROUP BY 1
)
SELECT
  u.period_key::date AS day,
  u.usage AS reserved,
  ROUND(100.0 * u.usage / NULLIF($1::int, 0), 1) AS pct_of_allowance,
  COALESCE(c.recorded_calls, 0) AS recorded_calls,
  u.usage - COALESCE(c.recorded_calls, 0) AS reservation_record_gap
FROM usage_counters u
LEFT JOIN calls c ON c.day = u.period_key::date
WHERE u.counter = 'gemini'
ORDER BY day DESC
LIMIT 30;

-- name: calls_not_seen_by_extension
-- Abuse signal: paid calls per day minus what extension installs report (misses + failures).
-- A signal, not a count: events arrive late or get dropped, 429s appear as failures without a
-- paid call, coalesced callers report extra misses (gap can go negative), and a storage failure
-- after success reports both a success and a failure. A persistent large positive gap still means
-- traffic from outside the extension.
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
-- How often a paid call follows > 5 min of paid-call silence. PROXY, not a bound in either
-- direction: cache hits, /api/events and /api/report also query the DB without writing
-- provider_calls rows, so a long gap here does not mean Neon was idle. latency_ms covers only
-- Gemini, not the DB wake-up. Confirm real suspend/resume from Neon compute history separately.
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
-- DIAGNOSTIC ONLY. "Плохой перевод" reports per 100 fresh translations of each model. Reports
-- also come from cache hits (server and local), but the denominator counts fresh generations only,
-- so the ratio depends on cache age and hit rate, not just on quality. Not usable as a rollback
-- threshold or a model comparison until impressions are counted per actual model.
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
1. Расширить `apps/cms/scripts/quality-paragraphs.ts` с 20 до ~60 абзацев: не меньше 20 на каждый уровень, RU и EN поровну. В набор включить:
   - английские источники (промпт заявляет «usually Russian or English», `apps/cms/src/pipeline/translate.ts:65`);
   - уровень `C1+`, для которого нужно расширить тип в `quality-paragraphs.ts:9`;
   - длинные абзацы по 600–1500 символов;
   - числа, даты, отрицания, отделяемые приставки;
   - списки и `<strong>`.
   Если результат выйдет неубедительным (интервал пересекает порог), набор увеличить, а не решать на шуме.
2. Доработать скрипты. Это обязательные условия, иначе метрики эксперимента не посчитать:
   - `quality-check.ts` сейчас пишет в JSON только текст и глоссы. Нужно добавить для каждой строки ms, usage и problems (`apps/cms/scripts/quality-check.ts:140-148`), сейчас итог считается только по успешным строкам (`:84-92`);
   - `judge.ts` жёстко называет источник русским (`apps/cms/scripts/judge.ts:87-88`). Для EN нужно параметризовать язык источника;
   - `judge.ts` молча пропускает кандидата без оценки (`apps/cms/scripts/judge.ts:173`). Нужно повторять запрос до полной оценки или падать, не исключать молча.
3. Проверить, принимает ли 3.1-flash-lite `thinkingLevel: low`. Если отвергнет, `ProviderConfigError` выдаст это сразу (`apps/cms/src/pipeline/translate.ts:142-151`).
4. Влияние thinking измерять отдельным экспериментом внутри одной модели. В v1 модель и thinking менялись одновременно (L2).

Прогоны: каждый ≈$0.05–0.15 на 60 абзацах, судья ≈$0.3–1. Все кандидаты оценивает **один и тот же прогон судьи**, потому что оценки разных прогонов несопоставимы (L2):
```bash
cd apps/cms
# quality-check.ts writes with writeFileSync and does not create the parent dir
mkdir -p exp
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

Порог «достаточно хорошо» проверяется для каждого уровня отдельно. Основной критерий — **парная разность** «кандидат − baseline» на одних и тех же абзацах внутри одного прогона судьи. Доверительный интервал строится по абзацам (bootstrap по абзацам: повторы одного текста не считаются независимыми). Абсолютные баллы приводятся только для справки.

| Метрика | Порог |
| --- | --- |
| Meaning, Grammar, Level fit, Glosses | Нижняя граница 95% CI парной разности не ниже −0.15 по каждой оценке. Если разброс между двумя baseline-прогонами шире, порог равен этому разбросу |
| Критические ошибки | Ни одного нового искажения чисел, дат, отрицаний или сроков по ручной слепой проверке. Абзацев с grammar ≤ 3 не больше, чем у baseline, плюс 1 на 20 |
| Надёжность | 0 упавших вызовов и 0 провалов валидации. Доля выпавших vocab не хуже baseline |
| Ручная проверка | Все ошибки артикля, рода и падежа проверены вручную. Ни одной неверной формы в глоссе `lemma` |
| Экономика | Стоимость всех попыток на валидный результат хотя бы в 2× ниже baseline, p95 не хуже baseline. Иначе риск по качеству не окупается |
| Недостаточно данных | Если интервал пересекает порог, вердикт «данных недостаточно», а не «прошёл» |

Решение:
- все уровни прошли: переключить `GEMINI_MODEL`;
- прошли только B1-B2/C1+: маршрутизация по уровню (R2, шаг 3);
- ничего не прошло: остаться на 3.8.

Онлайн-проверка неделю после выката:
- `report_rate_by_model` только как диагностика (см. R2, шаг 4). Порог «жалоб не больше 2× baseline» применять, когда появится учёт показов по модели;
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
| Распределённое (межинстансное) слияние запросов | Пока не рекомендую, сначала измерить. Coalescing хранится в локальном Map (`apps/cms/src/routes/translate.ts:22`), поэтому N инстансов, одновременно увидевших один miss, выполнят N pipeline и до 2N HTTP-попыток с ретраями. `ON CONFLICT DO NOTHING` устраняет только повторную запись, а не расходы. Предел задаёт число конкурирующих инстансов, а не единица. Насколько это часто, HYPOTHESIS: проверить SQL `wasted_paid_calls` |
| Отдавать после bump записи старой версии промпта | Это намеренно худший вывод. Стоимость bump и так мала, потому что повторы гасит локальный кэш (K2) |
| Урезать инструкции промпта ради цены | Вход ≈19% цены, а добавления v2 дали глоссы +1.05 балла (`judge-3.8-prompt-v1-vs-v2.md:9-10`) |
| Вытеснение локального кэша или перенос vocab в IndexedDB прямо сейчас | Запись словаря ~150 байт. До квоты `chrome.storage.local` около 10 МБ (нет `unlimitedStorage`, `apps/extension/wxt.config.ts:36`), то есть десятки тысяч слов. Сначала надо исправить шаблон записи (C1) |
| Лимиты по install ID | ID генерирует клиент, его легко сменить. По дизайну он не отправляется в `/api/translate` (`apps/extension/lib/metrics/events.ts:74-76`, конституция III) |
| Ключ API или общий секрет внутри расширения; Origin как аутентификация | Код расширения публичный, ключ извлекается за минуту. Origin подделывается любым не-браузерным клиентом. Проверка Origin в R1 нужна только как порог, а не как допуск |
| Расширить нормализацию серверного ключа до регистра и пунктуации | Это объединит разные тексты. Без корпуса с проверкой качества не обосновано. NFC и невидимые символы допустимы (K3) |
| Убрать `level`, `model` или `prompt_version` из серверного ключа | Уровень меняет инструкцию (`apps/cms/src/pipeline/translate.ts:45-53`), модель и версия меняют вывод. Объединение отдаст чужой результат |
| Массово чистить кэш при bump | Новые ключи и так отделяются новым hash, а чистка только усилит прогрев. Старые серверные строки удалять после K1, когда появятся колонки версии |
| Считать ретраи как `usage_counters.usage − COUNT(provider_calls)` | Это разность резерваций и best-effort записей с учётом границы суток, а не число попыток. Точно ретраи станут видны только после M2 |
| Немедленный распределённый lock на ключ | Доля межинстансных дублей неизвестна, `ON CONFLICT DO NOTHING` (`apps/cms/src/cache/store.ts:26`) уже защищает данные. Сначала посмотреть SQL `wasted_paid_calls` |
| Сменить драйвер Neon на WebSocket/pool | На запрос приходится 1–4 простых запроса. HTTP-драйвер правильный выбор для serverless (`apps/cms/src/db.ts:5-8`). Лишние RTT убираются правкой S1/S5, а не сменой драйвера |
| Повторять здесь существующее (два уровня кэша, coalescing, генерация упражнений кодом, дневной лимит) | Это уже есть. Выше предлагаются только их доработки |

---

## 5. Сверка с внешним ревью (GPT Astra, 2026-10-30)

Каждый пункт внешнего ревью я проверил по коду на `main`. Вердикты:
- **подтверждено**: внесено в отчёт;
- **уточнено**: верно частично или нужна оговорка;
- **отклонено**: не подтверждается кодом или не имеет эффекта сейчас.

| Пункт ревью | Вердикт | Проверка | Где в отчёте |
| --- | --- | --- | --- |
| F1: нет проверки клиента; ретрай внутри одной резервации, 1500 резерваций дают до 3000 попыток | Подтверждено (механизм) | `apps/cms/src/routes/translate.ts:54-67`, `apps/cms/src/pipeline/retry.ts:5-16`, `apps/cms/src/build-app.ts:32-38` | A1, A2, R1 шаг 4 |
| F1: выдаваемый сервером допуск клиента как решение | Уточнено | У расширения без аккаунтов эндпоинт выдачи токена сам скрейпится. Это работает только вместе с лимитом выдачи по IP или с лицензионным ключом Pro (`docs/ship-first-dollar.md:70,89`). Сейчас разумнее Origin-порог, WAF и бюджет в токенах | R1 шаги 5–9 |
| F2: `recordVocabEncounters` делает k+1 чтений и k записей, O(kN); пакетирование не устраняет гонку | Подтверждено | `apps/extension/lib/vocab/upsert.ts:19,43`, `apps/extension/lib/storage/progress.ts:36-41` | C1, R3 шаг 4 |
| F3: `/api/exercises` можно убрать, генератор чистый | Подтверждено (совпадает с S2) | `apps/cms/src/exercises/generate.ts:1`, `apps/extension/entrypoints/background.ts:117` | S2, R3 |
| F3: глоссы для закэшированного варианта восстанавливаются из словаря и могут нести контекст первой встречи | Подтверждено (существующее поведение, не регресс) | `apps/extension/entrypoints/background.ts:144-158` | Проверить при переносе (R3 шаг 1) |
| F4: 6 DDL на холодном инстансе | Подтверждено (совпадает с S1) | `apps/cms/src/db.ts:21-73,76-78` | S1 |
| F5: `topic` в локальном ключе вызывает лишние промахи | Отклонено как текущий эффект | `currentTopic` всегда `"general"`, интерфейса для его смены нет: только чтение в `apps/extension/lib/storage/settings.ts:16`, `apps/extension/entrypoints/content/overlay/Panel.tsx:61,74`, `apps/extension/entrypoints/content/index.tsx:39`. Проблема станет реальной, только если вернут выбор темы | — |
| F5: локальный хэш не схлопывает внутренние пробелы | Уточнено | Верно (`apps/extension/lib/dom/content-hash.ts:6-12`), но ключ локальный для одного пользователя, и `innerText` одного и того же абзаца стабилен. Эффект малый | K3 |
| F6: output составляет 81% стоимости; «0 thinking» может быть отсутствующим полем | Подтверждено | `docs/quality/2026-10-19/runs/gemini-3.8-flash-prompt-v2.md:7`, `apps/cms/src/pipeline/translate.ts:188` | Базовые цифры, L2, M2 |
| F6/A: сравнение моделей смешивает модель и thinking (3.8 `low`, остальные `minimal`) | Подтверждено | `docs/quality/2026-10-19/runs/*-prompt-v1.md:4` | L2, 3.2 шаг 4 |
| A: оценки судьи между прогонами несопоставимы (4.86 против 4.59 для одного и того же 3.8 v1) | Подтверждено | `docs/quality/2026-10-19/judge-4-models.md:9`, `docs/quality/2026-10-19/judge-3.8-prompt-v1-vs-v2.md:10` | 3.2: пороги переведены на парные разности |
| F7: usage неудачной попытки теряется; `ok` пишется до валидации | Подтверждено | `apps/cms/src/pipeline/translate.ts:157-172,182-190`, `apps/cms/src/routes/translate.ts:69-91` | M2, R1 шаг 4a |
| F8: `recordAttempt` переписывает целиком `vocabulary` и `reviewQueue`; `findExerciseById` перебирает всё | Подтверждено | `apps/extension/lib/storage/progress.ts:85-123`, `apps/extension/lib/storage/content-cache.ts:70-81` | C1, C2 |
| F9: bump не инвалидирует локальный кэш; старые серверные строки нельзя отделить по версии | Подтверждено (совпадает с K1/K2) | `apps/cms/src/cache/key.ts:21`, `apps/extension/lib/storage/content-cache.ts:36-37`, `apps/cms/src/db.ts:22-27` | K1, K2 |
| F10: регион, размер бандла и стоимость импортов не измерены | Подтверждено (совпадает с S4/S6) | `apps/cms/scripts/bundle.mjs:8-20`, `apps/cms/src/privacy/policy.ts:128` | S4, S6 |
| E: защита production на уровне хостинга не подтверждена | Подтверждено как HYPOTHESIS | Vercel Authentication упомянута только для preview: `.github/workflows/preview-smoke.yml:18-19` | Детали A2 |
| M: coalesced-запросы тоже получают `cache: "miss"`; storage-ошибка даёт два события; полночь; нет общего ключа запроса | Подтверждено | `apps/cms/src/routes/translate.ts:95`, `apps/extension/entrypoints/background.ts:78-83,100-109` | 3.1, «Ограничения данных», комментарии SQL |
| M: allowance задавать параметром, а не константой 1500 | Принято | `apps/cms/src/config.ts:13` | SQL `allowance_utilization`, `cost_projection` (`$1`) |
| M: `/api/health` не трогает БД | Подтверждено | `apps/cms/src/build-app.ts:45` | 3.1, «Ограничения данных» |
| M7: двойной клик запускает повторный перевод; серверный coalescing этого не устраняет | Подтверждено и усилено: `encounterCount` считается дважды | `apps/extension/entrypoints/content/index.tsx:128-144`, `apps/extension/entrypoints/background.ts:56-83` | K3, R3 шаг 4 |
| M6: 180 абзацев × 3 повтора, парные интервалы | Уточнено | Парный дизайн и CI по абзацам принят. Объём уменьшен до ~60 абзацев × 2 повтора baseline, с расширением, если результат неубедителен | 3.2 |
| Упоминание `apps/extension/lib/page-actions.ts` | Не относится | Этого файла нет и в нашей задаче он не упоминался. Пользовательский путь: `apps/extension/entrypoints/content/index.tsx:128` | — |

В исходном отчёте были пункты, которых нет во внешнем ревью. Они остаются в силе:
- A1: нет `maxOutputTokens` и худший запрос стоит в 6–8 раз дороже;
- L1: подорожание 3.8 вдвое с 2027-01-01, `pricing.ts` не учитывает дату;
- L2: разбивка по уровням (у lite отставание в A1-A2);
- S3: худший случай ≈30 s и отсутствие таймаута у клиента;
- C3: рассылка во все вкладки, которую никто не слушает;
- C4: парсер абзацев;
- C5: отдельный POST на каждое событие;
- C7: React-панель монтируется заранее.
