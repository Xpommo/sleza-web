# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

Monorepo with two packages managed from the root:

- `backend/` — Fastify HTTP server, Node.js ESM, no transpilation
- `frontend/` — Next.js 14 App Router, Tailwind CSS

**Script resolution** (engine.js проверяет в порядке приоритета):
1. `SLEZA_SCRIPT_PATH` env var (Railway/Docker)
2. `backend/sleza_script` — бандлованная копия в репо (для Railway, всегда актуальна)
3. `../../../sleza_tets_js/script` — сиблинг-репо (локальная разработка)

**Локальная разработка:** `sleza_tets_js` должен быть склонирован рядом в `~/sleza_tets_js/` на ветке `main` (все фиксы смержены в main).

**Важно при обновлении скрипта:** после изменений в `sleza_tets_js/script` нужно обновить бандлованную копию: `cp ~/sleza_tets_js/script ~/sleza-web/backend/sleza_script && git add backend/sleza_script && git commit`

## Common commands

```bash
# Node.js is installed via NVM on this machine — load it first
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"

# From repo root — install all packages
npm run install:all

# Start both servers concurrently (backend :3001, frontend :3000)
npm run dev

# Start individually
npm run dev:backend
npm run dev:frontend

# Production
npm run start --prefix backend
```

Backend auto-restarts on file changes (`node --watch`). Frontend uses Next.js dev server with HMR.

**First-time setup:** copy `backend/.env.example` to `backend/.env`. Keys can be left empty — users pass their own via request headers.

Playwright (Chromium) must be installed once:
```bash
npx playwright install chromium
```

## Architecture

### Data flow

```
Browser → Next.js frontend
        → POST /api/scan/single        (JSON response)
        → POST /api/scan/full/stream   (SSE stream)
              ↓
        Fastify backend (backend/src/server.js)
              ↓
        createEngine()  ← loads sleza_tets_js/script in a Node VM context
              ↓
        buildPageContext()  ← Playwright headless Chromium renders the page
              ↓
        engine.checkWithSleza()  → sleza.media/api/parse
        engine.checkEgrul()      → egrul.org/<id>.json
        engine.runAIAnalysis()   → api.groq.com (Groq llama-3.3-70b)
```

### Engine isolation (`backend/src/engine.js`)

Each HTTP request gets its own `vm.createContext()` — this is intentional. The Tampermonkey script uses module-level mutable state (`scanCancelled`, `SKIP_REASONS`, etc.) that would leak across concurrent scans if shared. After VM instantiation, two adapters are wired in:

- `engine.setHttpTransport(makeFetchTransport())` — replaces `GM_xmlhttpRequest` with Node `fetch` (see `transport.js`)
- `engine.setKeyStore({ get, set })` — replaces `GM_getValue`/`GM_setValue` with request-scoped key lookup

Keys (Groq, Sleza) arrive in request headers (`x-groq-key`, `x-sleza-key`) and are never stored server-side.

### Why Playwright (`backend/src/pageContext.js`)

Many Russian sites (SPA frameworks, React/Vue) return an empty skeleton on plain `fetch()`. Playwright runs the full JS and gives the same DOM content that the Tampermonkey extension sees in a real browser. `buildPageContext()` is called once per scan — only for the main/current page. The rest of the URLs in a full-site scan use `engine.fetchUrl()` (plain HTTP) since Sleza only needs text, not rendered HTML.

A single Chromium instance is kept alive as a singleton and reused across requests. Each scan gets an isolated `BrowserContext` (separate cookies/storage) which is closed after use. `closeBrowser()` is called on `SIGTERM`/`SIGINT`.

### SSE streaming (`/api/scan/full/stream`)

Full-site scans take 2–5 minutes. Instead of a long-polling JSON response, the backend sends Server-Sent Events (SSE) with `{ phase, current, total, url }` progress objects and a final `{ done: true, result }`. The frontend (`frontend/app/page.js`) reads the stream via `res.body.getReader()` and populates a progress bar. The stop button calls `reader.cancel()` — the backend detects the closed socket and exits naturally.

### Key flow

Frontend stores keys in `localStorage` and sends them on every request as `x-groq-key` / `x-sleza-key` headers. Backend reads them in `extractKeys()` and passes them to `createEngine()`. If `DEFAULT_GROQ_KEY` / `DEFAULT_SLEZA_KEY` are set in `.env`, they act as fallbacks when headers are absent.

### Adaptive scan limit

Full-site scan caps pages differently depending on whether a Sleza key was provided: 50 pages with key (rate-limited to 1.1 s/page ≈ 55 s wait), 150 pages without (no rate limit).

## Frontend components

- `frontend/app/page.js` — single-page app: key storage, scan trigger, SSE reader, progress bar, stop button
- `frontend/components/ScanForm.js` — URL input + mode buttons (single / full)
- `frontend/components/Results.js` — renders `{ pages, aiData, egrul, slezaError, stats }` returned by the backend

Result shape is identical to what the Tampermonkey script's `runFullSiteScan` / `runSinglePageScan` produce, so the rendering logic can be kept in sync.

## Git workflow

- Main branch: `master`
- Backend is Node ESM (`"type": "module"`) — use `import`/`export`, not `require`.
- Do not push to `master` without explicit user request.

## Текущий статус (2026-05-24) — АКТУАЛЬНО

### Что реализовано и задеплоено ✅

**Раунд 1 — базовый скан** ✅
**Раунд 1.5 — точность детектирования** ✅
**Раунд 2 — лидогенерация** ✅ (UUID отчёты, PDF, ShareModal, CTA штрафов)

**Раунд 3 — качество сканирования** ✅

_pageContext.js:_
- `bodyText` cap: 25k для compliance-страниц (/privacy, /oferta и т.д.), 10k для остальных
- `policyLinks` лимит 2→5, `offerLinks` 2→4, `aboutLinks` 2→4
- Авто-закрытие cookie-баннеров перед извлечением DOM
- Детект Cloudflare/DDoS-Guard challenge страниц → fallback на plain fetch
- Новые поля: `hasPolicyFooterLink`, `hasConsentCheckbox`
- User-Agent: Windows Chrome (уже был), таймаут 20s→30s
- Логи скрипта подавлены по умолчанию (включить: `SLEZA_DEBUG=1`)

_scanner.js:_
- PDF-парсинг через `pdf-parse`: читает оферты/договоры в PDF (напр. callibri.ru/Offer.pdf)
- `fetchExtraText` проактивно пробует `/Offer.pdf`, `/oferta.pdf` и т.д. при каждом скане
- `fetchPolicyText` Fallback 2: пробует `/terms`, `/legal`, `/rules`, `/agreement` напрямую
- C1: при single-scan субстраницы — добавляет текст главной для check149FZ (ИНН в footer)
- C2: трёхуровневая стратификация URL при full-scan:
  - Layer 1 (mandatory): главная + известные compliance-пути (/privacy, /about, /contacts...)
  - Layer 2 (scored): топ URL по scoreUrl() — 70% бюджета
  - Layer 3 (sample): stride-sample из остатка — 15% бюджета

_engine.js:_
- Логи скрипта через `scriptConsole` — тихо по умолчанию, `SLEZA_DEBUG=1` для отладки

_test/:_
- `backend/test/smoke.js` — smoke-тест по 7 типам сайтов
- `backend/test-urls.txt` — список тестовых URL
- Запуск: `export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh" && cd backend && node test/smoke.js 2>/dev/null` (запускать из `backend/`, не из root)
- С диффом: добавить флаг `--diff`

**Раунд 4 — Supabase PostgreSQL** ✅ (версия `r4-supabase`)

_db.js:_
- Таблица `scans`: хранит результаты по UUID (заменяет `backend/results/*.json`)
- Таблица `leads`: email-лиды (заменяет `backend/leads.jsonl`)
- Кэш повторных сканов одного URL — 20 минут (`findCachedScan`)
- `cleanupOldScans(7)` — автоочистка при старте (старше 7 дней)
- Graceful fallback: если `DATABASE_URL` не задан — работает без БД (local dev)

_server.js:_
- `initSchema()` запускается после `app.listen` — Railway healthcheck не блокируется
- `/api/results/:uuid` — чтение отчёта из БД
- `/health` возвращает `"db": true/false`

**D2 — Структурированный AI-промпт** ✅ (2026-05-21)

_sleza_tets_js/script (runAIAnalysis):_
- `bodyText` в промпте обрезан 25k → 2000 симв. (local checks уже используют полный текст)
- Секции policy/offer/about перенесены **перед** блоком ЕГРЮЛ — AI читает источники первым
- Каждая секция помечена URL источника: `─── ПОЛИТИКА [https://example.ru/privacy] ───`
- `hasConsentCheckbox` добавлен в мета-строку промпта

**D1 — Retry Groq API + улучшенный SYSTEM prompt** ✅ (2026-05-22)

_sleza_tets_js/script (runAIAnalysis):_
- `tryGroq()` — `_httpRequest` обёрнут в Promise
- 2 попытки с паузой 3 секунды между ними (обрабатывает rate-limit спайки)
- Fallback на локальные проверки только если обе попытки упали
- SYSTEM prompt: явная инструкция доверять локальным чек-листам и не пересчитывать их
- Чёткие критерии `violation` / `risk` / `unknown` (презумпция соответствия)
- Инструкция по заполнению `found_text` (цитата), `location` (где на сайте), `found_url`

**S1 — Security hardening** ✅ (2026-05-23)

_server.js:_
- `isSafeUrl()` — SSRF-защита: блокирует `file://`, `gopher://`, `javascript:`, RFC-1918, loopback (`127.*`), link-local (`169.254.*`). Применена во всех 4 точках где URL попадает в Playwright/fetch: `/api/scan/single`, `/api/scan/full`, `/api/scan/full/stream`, `/api/debug/links`
- `/api/admin/stats` и `/api/admin/cases` — добавлен `ADMIN_TOKEN` guard (раньше не было совсем)
- `/api/debug/links` — добавлен `ADMIN_TOKEN` guard (раньше публичный)
- Все admin guard-ы переведены на **fail-closed**: без токена → 401 всегда (было: без токена → открыто)
- Предупреждение в логах при старте если `ADMIN_TOKEN` не выставлен

**Переменная окружения:** `ADMIN_TOKEN` — обязательно выставить в Railway Variables. Без неё все `/api/admin/*` и `/api/debug/*` возвращают 401. `/api/debug/links` оставлен намеренно на период разработки — удалить перед публичным релизом.

**S2 — Security audit fixes** ✅ (2026-05-25)

_Выявлено `/security-review`, два подтверждённых High severity:_

_utils.js (новый файл):_
- `isSafeUrl()` вынесена из server.js в `backend/src/utils.js` — shared между server и scanner

_scanner.js:_
- SSRF fix: `isSafeUrl()` теперь применяется ко всем URL из сторонних HTML-страниц:
  `policyLinks`, `offerLinks`, `aboutLinks` кандидаты; `extractPolicyHrefs()` sub-ссылки; `fetchExtraText` hrefs; sitemap URL
- До фикса: атакующий мог передать `evil.com` с ссылкой `href="http://169.254.169.254/..."` → сканер запрашивал внутреннюю инфраструктуру Railway

_server.js:_
- `POST /api/results` удалён — позволял записать произвольный JSON в БД без аутентификации → создать поддельный «зелёный» отчёт с чужим доменом
- Scan-роуты уже возвращают `uuid` в ответе — frontend теперь читает его напрямую

_frontend/app/page.js:_
- `saveResult()` убрана; заменена на `applyUuid(data.uuid)` — uuid берётся из ответа скана

**UI v2 — audit-report дизайн** ✅ (2026-05-24, в master)

Смержено в master. Новый дизайн задеплоен на Vercel.

**Раунд 5 — точность детектирования (фикс 4 root-cause bugs)** ✅ (2026-05-24)

_pageContext.js:_
- `isContentPath` — `COMPLIANCE_IN_PATH` exception: compliance-пути (personal_data, privacy, ofert...) никогда не считаются content-путями → hh.ru `/article/personal_data` теперь корректно попадает в policyLinks
- `hasPolicyFooterLink` — возвращает `null` (не `false`) когда footer-элемент не найден; исключает false-positive "нет ссылки в footer" для сайтов без `<footer>`
- KW.policy расширен: `personal_data`, `privacy_policy`, `personaldata` (underscore/слитные варианты)
- KW.policy расширен: EN-фразы (`privacy policy`, `data protection`, `cookie policy`, etc.)
- KW.offer расширен: EN-фразы (`terms of service`, `terms of use`, `eula`, `license agreement`, etc.)
- Новые ad-network скрипты: `adriver.ru`, `begun.ru`, `smi2.ru`, `relap.io`, `recreativ.ru`, `segmento.net`, `criteo.net`, `doubleclick.net`, `adnxs.com`
- GTM вынесен из adNetworkSelectors → отдельный `hasGtm` флаг
- Новые CMP dismiss-селекторы: OneTrust, Cookiebot, Axeptio, Usercentrics

_scanner.js:_
- `fetchPolicyText` quality-check: использует combined текст только если `check152FZ` находит ≥4/7 разделов — предотвращает использование страницы «Правила» (vc.ru) вместо /privacy
- `detectSiteType`: media-детект расширен на body2k + паттерны community-платформ (`моя лента`, `написать/войти`)
- `applyMediaOverride` / `applyServicesOverride` теперь вызываются и для local-checks (не только AI)
- `effectiveHasAdScripts`: GTM считается рекламой только если на странице есть текстовые ad-маркеры
- `tryDiscoverFromSitemap`: sitemap-discovery как Fallback 1.5 в fetchPolicyText
- `EXTRA_PATHS` расширен: `/help/privacy`, `/help/terms`, `/article/personal_data`, `/v10/privacy` и др.
- `REKVIZITY_PATHS` расширен: `/rbc_about`, `/about-us`, `/company/about` и др.
- `blocked403` поле в результатах → frontend показывает предупреждение

**Раунд 6 — modal policy + VK false positive** ✅ (2026-05-24)

_frontend:_
- 403 warning banner в Results.js
- Auto-scroll к результатам при завершении сканирования
- ConfidenceBadge с tooltip-объяснением
- Кнопка «← проверить другой сайт»

_pageContext.js:_
- `vk.com/js/api` удалён из adNetworkScriptSelectors — VK openapi.js это социальный виджет, НЕ реклама
- Modal detection: если `policyLinks: []`, Playwright кликает кнопку с текстом "политика/конфиденц/privacy", захватывает текст из modal/dialog → поле `inlineModalPolicyText`

_scanner.js:_
- `fetchPolicyText` проверяет `inlineModalPolicyText` (≥2 152-FZ секций) как источник политики

**Раунд 7 — DOCX-политики + точность типа сайта** ✅ (2026-05-24)

_scanner.js:_
- `fetchDocxText()` + `isDocxUrl()` — парсинг Word-документов через mammoth (политики в .docx у Russian B2B/застройщиков)
- `fetchPolicyText` и `fetchExtraText` обрабатывают .docx наравне с .pdf
- `SITEMAP_KW` расширен: `.docx`, `положени`
- `detectSiteType`: `realEstateRe` — застройщики/девелоперы не классифицируются как media
- `detectSiteType`: `installServiceRe` — монтаж/ремонт/натяжные потолки → 'services'
- `applyServicesOverride`: offer violation → risk для services (индивидуальные договоры, не публичная оферта); обновлен action text

_pageContext.js (Р7):_
- KW.policy расширен: `положени`, `согласие на обработку`
- policyLinks исключает антикоррупционные и технические "политики" (антикоррупцион, политика.качества, охрана.труда)

_sleza_tets_js/script + backend/sleza_script (Р7):_
- ИНН/ОГРН regex: добавлен `(` в character class → поддержка формата `(ИНН 3000001232)` (brackets в DOCX)

**mammoth dependency:** `npm install mammoth` уже добавлен в `backend/package.json`

### Деплой

- **Frontend:** https://sleza-web.vercel.app (Vercel, auto-deploy от master) ✅
- **Backend:** https://sleza-web-production.up.railway.app (Railway) ⚠️

Railway деплоит автоматически при каждом push в master (как и Vercel). ✅

Проверка версии: `curl https://sleza-web-production.up.railway.app/health`
- Актуальная версия: `"v":"r4-supabase"` + `"db":true`
- После security-фикса нужен Redeploy (коммит `e8cff6b` в master, `ADMIN_TOKEN` нужен в Railway Variables)

**Раунд 8 — Точность AI-сканов + SaaS offer fix** ✅ (2026-05-25)

_scanner.js:_
- Ground-truth overrides в AI-режиме: 149-ФЗ и ЕРИР проверяются локальными проверками после AI и перебивают ложные срабатывания AI
- `findAICheck(checks, id, lawSnippet)` — хелпер для поиска по `id` или `law` (AI использует human-readable `law`, локальный путь использует короткий `id`)
- `detectSiteType`: SaaS-детект переставлен ПЕРЕД e-commerce (calltouch.ru с `/product/` URL больше не классифицируется как ecommerce)
- `applyServicesOverride`: расширен на `siteType=saas` и `siteType=auto+aiMisclassified`; единственная жалоба "условия возврата товара" → `ok` для SaaS/services
- Убраны `\b` перед кириллицей в regex (JS `\b` = ASCII-only, не работает с русскими словами)
- `effectiveHasAds`: GTM считается рекламой только при наличии рекламного текста на странице
- `policyLinks` фильтр: исключает "Персональная доработка" и аналогичные ложные ссылки

_scanDiff.js:_
- Нормализация confidence к achievable max: без AI-ключей max=65 (не 100); score нормируется → "medium" вместо ложного "low"

**Раунд 9 — Feedback Loop: автообучение на фидбэке (Option A + D)** ✅ (2026-05-25)

_db.js:_
- Новая таблица `domain_exceptions`: lifecycle `pending → verifying → active/disputed/expired`
- `issue_text` добавлен в таблицу `feedback` (денормализация для D-аналитики)
- CRUD: `upsertDomainException`, `activateDomainException`, `disputeDomainException`, `handleConfirmFeedback`, `getActiveDomainExceptions`, `expireExceptionsByCheckId`
- `invalidateCacheForHostname` — инвалидирует 20-мин кэш при активации exception (К5)

_scanner.js:_
- `applyFeedbackOverrides(hostname, checks)` — применяет active exceptions; сохраняет `_original` (К1, К6)
- `verifyException(hostname, checkId, originUrl)` — check-specific re-scan стратегии (ЕРИР, 149-ФЗ, 152-ФЗ, оферта, cookie/drugs); max 3 retry → disputed (К7)
- Безопасность: law152/law149 max override = `risk`, никогда `ok`

_server.js:_
- `POST /api/feedback` расширен: сохраняет `issue_text` + upsert exception + `setImmediate(verifyException)` при 2-м голосе (К8 идемпотентность)
- `GET /api/admin/exceptions` — все domain exceptions
- `POST /api/admin/exceptions/expire {check_id}` — bulk-expire (К3)
- `GET /api/admin/patterns` — D-аналитика: кластеризация issue_text по check_id

_scanDiff.js:_
- diff сравнивает `_original.status` а не текущий статус (К6 — исключает ложные «улучшения»)

_Results.js:_
- Бейдж «оспорено N раз» рядом со статусом когда `check._override` присутствует

_test/feedback.js:_
- lifecycle suite: pending→verifying→active; applyFeedbackOverrides; confirm×2→disputed
- safety cap проверка: law152 override_status = 'risk' не 'ok'
- retry exhaustion: 3 failed re-scans → disputed

**Раунд 10 — Scanner accuracy hotfixes** ✅ (2026-05-25)

_pageContext.js:_
- `kw.about` расширен: `'props'`, `'rekviz'` — захватывает ссылки типа `/ekb/props` (sdvor.com региональная структура)

_scanner.js:_
- `REKVIZITY_PATHS` расширен: `/props`, `/rekviz` — прямой fallback для нестандартных путей реквизитов
- `EXTRA_PATHS` расширен: `/page/policy`, `/page/privacy`, `/page/terms`, `/page/personal-data`, `/page/agreement`, `/page/legal`, `/pub/policy`, `/pub/privacy`, `/pub/terms` — покрывает CMS-сайты на Bitrix и custom CMS (sostav.ru и подобные)

_Исправленные false positives:_
- **sdvor.com/ekb**: 149-ФЗ false positive — реквизиты находились на `/ekb/props`, теперь захватываются через `kw.about: 'props'`
- **sostav.ru**: 152-ФЗ false positive — политика находится на `/page/policy`, теперь проверяется в EXTRA_PATHS

**Раунд 11 — Tilda lazy-load fix** ✅ (2026-05-25)

_Root cause:_ Tilda-сайты (thepike.ru и др.) используют `data-tilda-lazy="yes"` + IntersectionObserver для ленивой загрузки блоков. Без прокрутки Playwright захватывал пустой footer → ИНН/ОГРНИП не видны → 149-ФЗ false RISK.

_pageContext.js:_
- `buildPageContext()`: после закрытия cookie-баннера добавлен `scrollTo(0, scrollHeight)` + 800ms wait → lazy секции Tilda и других конструкторов рендерятся до захвата текста
- `fetchPageText()`: аналогичный scroll добавлен в fallback Playwright-функцию

_Результат:_ rbc.ru: 152-ФЗ и 149-ФЗ ⚠️→✅ (Qrator перестал блокировать политику через Playwright); sleza.media: оферта и куки ⚠️→✅

**Раунд 12 — Bitrix EXTRA_PATHS + alutech.ru диагностика** ✅ (2026-05-25)

_scanner.js:_
- `EXTRA_PATHS` в `fetchPolicyText` расширен Bitrix/транслит-путями:
  `/politika-konfidencialnosti`, `/politika-konfidencialnosti/`, `/politika-obrabotki-personalnyh-dannyh`, `/politika-obrabotki-personalnyh-dannyh/`, `/politika`, `/politika/`, `/konfidencialnost`, `/konfidencialnost/`, `/personalnie-dannie`, `/personal-data-policy`

_test/test-urls.txt:_
- Расширен с 7 до 140+ URL по 18 категориям: shop, marketplace, media, services, saas, finance, telecom, travel, food, realestate, health, education, gov, entertainment, legal, industrial, auto, charity, tech, extra
- Используется для полного regression-прогона (вечерний, ~70 мин): `node test/smoke.js 2>/dev/null` из `backend/`
- Для быстрого baseline (7 сайтов, ~5 мин) временно заменить test-urls.txt на 7-строчный файл или использовать `--baseline` флаг

_Диагностика alutech.ru (false positive разобран):_
- **alutech.ru 152-ФЗ РИСК** — Playwright подтвердил: policyLinks ×5 → `/politika-konfidencialnosti/`, check152FZ = 7/7 разделов → должен быть ✅
- **alutech.ru ЕРИР РИСК** — `hasAdScripts: false`, `hasGtm: true`, `adTextMarker: false` → effectiveHasAdScripts = false → должен быть ✅
- **Root cause:** 20-минутный Supabase-кэш (`findCachedScan`, `maxAgeMinutes=20`). Кэш хранится в БД, не в памяти Railway — пережил Redeploy. После 20 мин новый скан вернёт корректный результат.
- **Важно:** Railway Redeploy НЕ инвалидирует кэш сканов в Supabase. Нужно ждать 20 мин после последнего скана URL.

### Следующие задачи

**В резерве (Feedback Loop):** B (ML сигнальные паттерны), E (memory injection в промпт), F (shadow mode A/B), G (авто ре-валидация всего домена)

**Прочие улучшения:**
- ~~Удалить `/api/debug/links`~~ ✅ удалён (коммит `...`)
- ~~Настройка Telegram бота~~ ✅ настроен

### Известные ограничения / false positives

- **Cloudflare/DDoS-Guard** (wildberries.ru): fallback на plain fetch, результаты неполные (149-ФЗ ❌).
- **SmartCaptcha / Яндекс anti-bot** (sdvor.com): Railway IP блокируется, subpage-запросы через `engine.fetchUrl()` → редирект на капчу. 152-ФЗ показывает RISK несмотря на наличие `/ekb/personal-data`. Решение: кнопка «неверно?» → feedback loop активирует permanent exception.
- **403 на главной** (1cbit.ru): false positives по 149-ФЗ и 152-ФЗ (~5% SMB сайтов).
- **Реквизиты только в PDF** (callibri.ru): читаем через pdf-parse; если PDF недоступен — риск.
- **Политика скрыта в JS-виджете** (artlebedev.ru): fallback на /terms/, /legal/.
- **20-мин Supabase-кэш**: `findCachedScan` хранит результат в БД, не в памяти. Railway Redeploy НЕ сбрасывает кэш. Если после Redeploy результат кажется устаревшим — подождать 20 мин и пересканировать.

### Smoke test baseline (2026-05-25) ← АКТУАЛЬНЫЙ

```
shop     www.wildberries.ru  → ⚠️ ❌ ✅ ✅ ✅  (Cloudflare, 149 недоступен)
media    www.rbc.ru          → ✅ ✅ ✅ ✅ ✅
services hh.ru               → ✅ ✅ ✅ ✅ ✅
saas     www.bitrix24.ru     → ✅ ✅ ✅ ✅ ✅
media    vc.ru               → ✅ ✅ ✅ ✅ ✅
extra    callibri.ru         → ✅ ✅ ✅ ✅ ✅
extra    sleza.media         → ✅ ⚠️ ✅ ✅ ✅
Итого: 32✅ 2⚠️ 1❌
Колонки: 152-ФЗ | 149-ФЗ | ЕРИР | Оферта | Куки
```

Прогресс: 23✅ 11⚠️ 1❌ → 25✅ 9⚠️ 1❌ → 28✅ 6⚠️ 1❌ → 32✅ 2⚠️ 1❌
