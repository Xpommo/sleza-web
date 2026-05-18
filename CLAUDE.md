# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

Monorepo with two packages managed from the root:

- `backend/` — Fastify HTTP server, Node.js ESM, no transpilation
- `frontend/` — Next.js 14 App Router, Tailwind CSS

**Critical external dependency:** `backend/src/engine.js` resolves `../../../sleza_tets_js/script` (two directories up from this repo). Both repos must be siblings on disk — e.g. `~/sleza-web/` and `~/sleza_tets_js/`. The backend will not start if the script file is missing.

**Required branch in sleza_tets_js:** `claude/improve-compliance-checker-HjMh0`. The `main` branch does not export `setHttpTransport`, `setKeyStore`, or `saveKeys` — the backend will crash with "not a function" if the wrong branch is checked out.

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

## Текущий статус (2026-05-18)

Последнее что сделано: `fix: Round 1 stability — 3 bugs fixed + singleton browser`

**Что работает:**
- Single-scan и full-site scan работают без API-ключей (`useAI=false`)
- SSE-стриминг прогресса + кнопка «Стоп»
- Карточки результатов: иноагенты, 152-ФЗ, 149-ФЗ, ЕРИР, оферта, ЕГРЮЛ
- Адаптивный лимит страниц (50 с Sleza-ключом, 150 без)
- Singleton Chromium — один браузер на весь сервер

**Следующая задача — Раунд 1.5: Выбор типа сайта**

Проблема: ложные срабатывания на медиа-сайтах (тест theblueprint.ru):
- Проверка оферты/возврата флагирует СМИ — но ЗоЗПП ст.26.1 применяется только к интернет-магазинам
- Упоминания наркотиков в новостях — журналистский контекст, не нарушение

Решение: пользователь выбирает тип сайта ДО сканирования (4 варианта):

| Тип | siteType | Что отключается |
|-----|----------|----------------|
| Интернет-магазин | `ecommerce` | ничего |
| СМИ / Медиа / Блог | `media` | оферта, возврат; мягче наркотики |
| Корпоративный / Услуги | `services` | возврат товара |
| Сервис / SaaS | `saas` | оферта, возврат физтоваров |

Изменения: `ScanForm.js` (кнопки), `server.js` (поле `siteType` в схеме), `scanner.js` (фильтрация проверок).

**После Раунда 1.5 — Раунд 2: Лидогенерация**
- `POST /api/results` → UUID → `?report=<id>` в URL
- Email-gate (обязателен для "Поделиться" и "Скачать PDF")
- PDF через Playwright
- CTA-блок с суммой штрафов
