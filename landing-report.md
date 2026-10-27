# Обновление лендинга Sprachweise

Ветка: `agent/update-landing-v1`, коммит `c4c04fd` (от актуального `origin/main`, `1805396`). Ветка отправлена на GitHub. Рабочий checkout находится в `landing-work/`: исходная рабочая копия проекта была устаревшей, а её Git-метаданные доступны только для чтения.

## Изменённые файлы

- `apps/cms/src/landing/page.ts`: синхронные RU/UK тексты для выделения и контекстного меню v1.0.0; Alt+Shift+G; возврат оригинала; упражнения; meta/OG; публичная бета; приватность; точная ссылка Chrome Web Store; блок открытого кода, GitHub, релизы, issues и динамические бейджи.
- `LICENSE`: добавлена MIT, ранее файла лицензии не было.

Версия и манифест расширения не изменены. JavaScript и сторонние скрипты не добавлены. В лендинге нет CSP; расширять её не потребовалось. Бейдж CI использует `.github/workflows/ci.yml`, `branch=main`; при проверке отдавал `passing`, версия — `v1.0.0`. GitHub-бейдж не перенаправляет на githubusercontent.com.

Тексты сверены с `store/description.txt`, `store/description.en.txt`, `store/test-instructions.txt`, `store/data-usage.md` и полученной с сайта https://sprachweise.vercel.app/privacy политикой.

## Остальные упоминания закрытой беты — оставлены без изменений

- `store/description.txt:22` — «закрытая бета».
- `store/description.en.txt:22` — private beta.
- `store/test-instructions.txt:13`, `store/test-instructions.md:18` — private-beta daily cap.
- `docs/store-listing.md:1` — private beta.
- `docs/ship-first-dollar.md:7,85,118` — private beta.
- `docs/research/2026-10-25-exercise-types/README.md:32` — private beta.
- `specs/003-private-beta/spec.md:1,9`, `plan.md:1`, `tasks.md:1`, `checklists/requirements.md:1`, `metrics.sql:1` — названия/описания private beta.
- Ссылки на каталог/ветки `003-private-beta` сохранены в `.specify/memory/constitution.md:18,22`, `docs/ship-first-dollar.md:5,85,119`, `docs/store-listing.md:5`, `specs/003-private-beta/tasks.md:5,42`, `apps/cms/tests/integration/metrics-sql.test.ts:6,53`.

В README, шаблоне release notes, privacy policy и тестах лендинга таких формулировок нет. `check:store` не требует совпадения этих формулировок с лендингом и проходит без изменения store-файлов.

## Проверки

- Node 24.22.0, pnpm 10.33.0; зависимости установлены с frozen lockfile.
- `pnpm lint`, `pnpm format:check`, `pnpm -r typecheck`, `pnpm build`, `pnpm check:store` — успешно.
- `pnpm test:unit` — 242 теста успешно (42 shared, 27 CMS, 173 extension).
- CMS integration: 48/48 успешно с одним worker (тайм-ауты не увеличивались).
- Extension E2E: 34/34 успешно, 5.2 минуты. Использован `build:test` из стандартного `test:integration`, затем `TMPDIR=/tmp/swl-tmp pnpm --filter @sprachweise/extension exec playwright test`. Тестовый bundle не публиковался.
- `/ru` и `/uk` открыты Chromium на 375 и 1280 px, скриншоты просмотрены: переполнения нет, бейджи загружены, «закрытая/закрита» отсутствуют, обе CTA ведут на требуемый item.
- GitHub repo/issues/releases/latest/Actions и Chrome Web Store отвечают HTTP 200; latest ведёт на v1.0.0.
- Локальный эквивалент preview-smoke: `/api/health` → `{"ok":true}`. Vercel deployment_status workflow не запускался: нет созданного PR/preview deployment.
- Lighthouse 12.8.2, те же категории и пороги, что в preview-smoke:

| URL | Performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| /privacy | 100 | 100 | 96 | 90 |
| /ru | 98 | 100 | 96 | 100 |
| /uk | 100 | 100 | 96 | 100 |

Все пороги (80/90/90/90) пройдены. Best practices снижает существующий 404 `/favicon.ico`; у неизменённой privacy-страницы отсутствует meta description. HTML/JSON отчёты сохранены рядом с этим файлом.

Первые прогоны прерывались из-за заполненного общего `/tmp`; Chromium затем сообщил `Socket path too long`. Для повторов используются файлы в рабочем каталоге и короткий TMPDIR `/tmp/swl-tmp`. Первый полный прогон CMS: 41/48 успешно, 7 тайм-аутов 5000 ms; повтор с одним worker завершился успешно: 48/48, без изменений тестов или тайм-аутов. Команда: `pnpm --filter @sprachweise/cms exec vitest run tests/integration --maxWorkers=1 --minWorkers=1`.

## PR

Создание PR через GitHub-инструмент отклонено: `MCP tool call requires approval, but approval policy is never`. PR не создан, main не изменён, релизы/теги не создавались.

Открыть PR: https://github.com/alexbaumgertner/chrome-extension-languadge-learn/compare/main...agent/update-landing-v1?expand=1

Preview: http://localhost:4302 (страницы `/ru`, `/uk`).
