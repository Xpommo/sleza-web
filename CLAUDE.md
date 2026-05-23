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

_frontend:_
- 403 warning banner в Results.js
- Auto-scroll к результатам при завершении сканирования
- ConfidenceBadge с tooltip-объяснением
- Кнопка «← проверить другой сайт»

### Деплой

- **Frontend:** https://sleza-web.vercel.app (Vercel, auto-deploy от master) ✅
- **Backend:** https://sleza-web-production.up.railway.app (Railway) ⚠️

**ПРОБЛЕМА Railway (не решена):** Railway не применяет новые коммиты автоматически.
Нужно: Railway → Deployments → **Redeploy** вручную после каждого push.

Проверка версии: `curl https://sleza-web-production.up.railway.app/health`
- Актуальная версия: `"v":"r4-supabase"` + `"db":true`
- После security-фикса нужен Redeploy (коммит `e8cff6b` в master, `ADMIN_TOKEN` нужен в Railway Variables)

### Следующие задачи

**Возможные улучшения:**
- Telegram webhook для новых лидов
- Улучшить check152FZ паттерны для rbc.ru (Qrator блокирует subpages, политика найдена но неполная)
- rbc.ru 149: ИНН/ОГРН недоступны через plain fetch (Qrator JS-challenge) — нужен Playwright для subpages
- Удалить `/api/debug/links` перед публичным релизом

### Известные ограничения / false positives

- **Cloudflare/DDoS-Guard** (wildberries.ru): fallback на plain fetch, результаты неполные.
- **Qrator anti-bot** (rbc.ru): все subpages (about, privacy details) возвращают JS-challenge (265 байт) на plain fetch. 149-ФЗ и часть 152-ФЗ могут быть неточны.
- **403 на главной** (1cbit.ru): false positives по 149-ФЗ и 152-ФЗ (~5% SMB сайтов).
- **Реквизиты только в PDF** (callibri.ru): читаем через pdf-parse; если PDF недоступен — риск.
- **Политика скрыта в JS-виджете** (artlebedev.ru): fallback на /terms/, /legal/.

### Smoke test baseline (2026-05-24) ← АКТУАЛЬНЫЙ

```
shop     www.wildberries.ru  → ⚠️ ❌ ✅ ✅ ✅  (fallback ⚡, Cloudflare)
media    www.rbc.ru          → ⚠️ ⚠️ ✅ ✅ ✅  (Qrator блокирует subpages)
services www.hh.ru           → ⚠️ ✅ ⚠️ ✅ ✅  (реальные compliance gaps)
saas     www.bitrix24.ru     → ✅ ✅ ✅ ✅ ✅
large    vc.ru               → ✅ ✅ ✅ ✅ ✅
saas     callibri.ru         → ✅ ✅ ⚠️ ✅ ✅
ip       sleza.media         → ✅ ⚠️ ✅ ⚠️ ⚠️
Итого: 25✅ 9⚠️ 1❌
Колонки: 152-ФЗ | 149-ФЗ | ЕРИР | Оферта | Куки
```

Прогресс за 2 сессии: 23✅ 11⚠️ 1❌ → 25✅ 9⚠️ 1❌
