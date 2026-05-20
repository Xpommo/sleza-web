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

## Текущий статус (2026-05-20) — АКТУАЛЬНО

### Что реализовано и работает локально ✅

**Раунд 1 — базовый скан** ✅
**Раунд 1.5 — точность детектирования** ✅
**Раунд 2 — лидогенерация** ✅ (UUID отчёты, PDF, ShareModal, CTA штрафов)

**Раунд 3 — качество сканирования** ✅ (2026-05-20)

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
- `fetchPolicyText` Fallback 2: пробует `/terms`, `/legal`, `/rules`, `/agreement` напрямую (напр. artlebedev.ru/terms/)
- C1: при single-scan субстраницы — добавляет текст главной для check149FZ (ИНН в footer)
- C2: трёхуровневая стратификация URL при full-scan:
  - Layer 1 (mandatory): главная + известные compliance-пути (/privacy, /about, /contacts...)
  - Layer 2 (scored): топ URL по scoreUrl() — 70% бюджета
  - Layer 3 (sample): stride-sample из остатка — 15% бюджета

_engine.js:_
- Логи скрипта через `scriptConsole` — тихо по умолчанию, `SLEZA_DEBUG=1` для отладки

_test/:_
- `backend/test/smoke.js` — smoke-тест по 5 типам сайтов
- `backend/test-urls.txt` — список тестовых URL (shop/media/services/saas/large)
- Запуск: `node backend/test/smoke.js 2>/dev/null`
- С диффом: `node backend/test/smoke.js --diff 2>/dev/null`

### Деплой

- **Frontend:** https://sleza-web.vercel.app (Vercel, auto-deploy от master) ✅
- **Backend:** https://sleza-web-production.up.railway.app (Railway) ⚠️

**ПРОБЛЕМА Railway (не решена):** Railway не применяет новые коммиты автоматически.
Нужно: Railway → Deployments → **Redeploy** вручную после каждого push.

Проверка версии: `curl https://sleza-web-production.up.railway.app/health`
- Актуальная версия должна вернуть: `"v":"r3-pdf-fallback"`
- Если `"v":"bundled-script-v1"` — Railway не обновился, нужен ручной Redeploy

### Следующие задачи (Раунд 3 продолжение)

**В скрипте `sleza_tets_js/script` (B-блок):**
- B1: check149FZ — улучшить адресный regex (слишком широкий, дают false positives)
- B3: checkERIR — детект рекламных сетей по script src (Яндекс.Директ, VK Реклама)
- B4: check152FZ — использовать `hasPolicyFooterLink` и `hasConsentCheckbox`

**AI (D-блок):**
- D1: Retry для Groq API (2 попытки с backoff)
- D2: Структурированный prompt с разбивкой по страницам

**Инфраструктура:**
- Починить Railway auto-deploy (Settings → Source → проверить ветку master)
- Telegram webhook для новых лидов
- Предупреждение пользователю когда сайт вернул 403 (заблокировал сканер)

### Известные ограничения / false positives

- **Cloudflare/DDoS-Guard** (wildberries.ru, некоторые крупные сайты): детектируются, fallback на plain fetch. Результаты могут быть неполными — показать предупреждение пользователю (TODO).
- **403 на главной странице** (1cbit.ru): false positives по 149-ФЗ и 152-ФЗ т.к. нет доступа к HTML. Критично редко — SMB сайты (наша аудитория) блокируют ~5-10%.
- **Реквизиты только в PDF** (callibri.ru): теперь читаем PDF через pdf-parse. Если PDF недоступен — показываем риск (корректно).
- **Политика скрыта в order-виджете** (artlebedev.ru): теперь проверяем /terms/, /legal/ напрямую.

### Smoke test baseline (2026-05-20)

```
shop     wildberries.ru  → ❌ ❌ ✅ ✅ ✅  (fallback ⚡, Cloudflare)
media    rbc.ru          → ❌ ⚠️ ✅ ✅ ✅
services hh.ru           → ⚠️ ✅ ✅ ✅ ✅
saas     bitrix24.ru     → ✅ ✅ ✅ ❌ ✅
large    vc.ru           → ⚠️ ✅ ✅ ✅ ✅
Колонки: 152-ФЗ | 149-ФЗ | ЕРИР | Оферта | Наркотики
```
