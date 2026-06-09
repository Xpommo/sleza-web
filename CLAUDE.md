# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

Monorepo with two packages managed from the root:

- `backend/` — Fastify HTTP server, Node.js ESM, no transpilation
- `frontend/` — Next.js 14 App Router, Tailwind CSS
- `marketing/` — untracked outreach tools (dashboard.html, triage.mjs), not part of the product

**Script resolution** (`engine.js` checks in priority order):
1. `SLEZA_SCRIPT_PATH` env var (Railway/Docker)
2. `backend/sleza_script` — bundled copy in repo (always up to date for Railway)
3. `../../../sleza_tets_js/script` — sibling repo (local dev)

**Updating the bundled script:** after changes in `sleza_tets_js/script`:
```bash
cp ~/sleza_tets_js/script ~/sleza-web/backend/sleza_script && git add backend/sleza_script && git commit
```

## Common commands

```bash
# Node.js via NVM — load first
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"

npm run install:all          # install all packages from root
npm run dev                  # backend :3001 + frontend :3000 concurrently
npm run dev:backend
npm run dev:frontend
npm run start --prefix backend   # production

# Smoke tests — run from backend/, not root
cd backend && node test/smoke.js 2>/dev/null           # all URLs in test-urls.txt (~70 min)
cd backend && node test/smoke.js --diff                # with diff vs baseline
# For 7-site quick baseline: temporarily replace test-urls.txt with 7 lines, restore after
```

Backend auto-restarts on file changes (`node --watch`). First-time setup: copy `backend/.env.example` to `backend/.env`. Playwright Chromium must be installed once: `npx playwright install chromium`.

## Architecture

### Data flow

```
Browser → Next.js frontend
        → POST /api/scan/single        (JSON)
        → POST /api/scan/full/stream   (SSE)
              ↓
        Fastify (backend/src/server.js)
              ↓
        createEngine()  ← loads sleza_script in Node VM context
              ↓
        buildPageContext()  ← Playwright renders the page
              ↓
        engine.checkWithSleza()  → sleza.media/api/parse
        engine.checkEgrul()      → egrul.org/<id>.json
        engine.runAIAnalysis()   → api.groq.com (llama-3.3-70b)
```

### Backend source files (`backend/src/`)

| File | Role |
|---|---|
| `server.js` | Fastify routes, SSRF guard (`isSafeUrl`), admin endpoints, SSE streaming |
| `engine.js` | VM isolation per request, adapters for fetch transport and keystore |
| `pageContext.js` | Playwright page rendering — extracts bodyText, links, cookie/consent signals |
| `scanner.js` | Orchestrates full/single scan, local compliance checks, post-processing |
| `db.js` | Supabase PostgreSQL — scans, leads, feedback, domain_exceptions tables |
| `scanDiff.js` | Compares scan results vs baseline for regression detection |
| `utils.js` | `isSafeUrl()` — shared SSRF protection |
| `transport.js` | `makeFetchTransport()` — replaces GM_xmlhttpRequest with Node fetch |
| `tg.js` | Telegram bot notifications (lead alerts, scan-of-day) |
| `email.js` | Resend email integration |
| `validateLead.js` | Lead form validation |

### Engine isolation (`engine.js`)

Each HTTP request gets its own `vm.createContext()`. The Tampermonkey script uses module-level mutable state (`scanCancelled`, `SKIP_REASONS`) that would leak across concurrent scans if shared. Two adapters are wired in per request:
- `engine.setHttpTransport(makeFetchTransport())` — replaces `GM_xmlhttpRequest`
- `engine.setKeyStore({ get, set })` — request-scoped key lookup

Keys (Groq, Sleza) arrive in request headers (`x-groq-key`, `x-sleza-key`), never stored server-side.

### Why Playwright (`pageContext.js`)

Many Russian sites (SPAs, React/Vue) return empty skeletons on plain `fetch()`. Playwright runs full JS. `buildPageContext()` is called once per scan for the main page only. A single Chromium instance is kept alive as a singleton; each scan gets an isolated `BrowserContext` (separate cookies/storage) closed after use.

**Key signals extracted by `buildPageContext`:**
- `policyLinks`, `offerLinks`, `aboutLinks` — same-domain compliance links
- `hasCookieBanner`, `hasConsentCheckbox`, `hasPreCheckedConsent`
- `hasPreConsentTracking`, `preConsentTrackingServices` — tracking fires before banner interaction
- `hasDataFormNoConsent`, `inlineModalPolicyText`, `bundledConsent`
- `hasAdScripts`, `hasAnalytics`, `hasGtm`, `hasGoogleAnalytics`
- `_http403`, `_firewalled`, `_blocked`, `_fallback` — access failure flags

### Consent detection pipeline (`scanner.js`)

For sites collecting personal data (online schools, services), `scanner.js` probes sub-pages:
1. `formPageLinks` / `registerLinks` — probed via `fetchFormPageSignal()` (batches of 3)
2. SPA course pages — discovered via `discoverCoursePageLinks()` (Playwright click-interception, up to 10 pages)
3. Each probe returns `{ preChecked, noConsent, bundledConsent }`

`bundledConsent` = single checkbox combining 2+ of: [privacy/data] + [offer/terms] + [newsletter] — violation of ч.1 ст.9 152-FZ.

`hasPreConsentTracking` = tracking cookies (`_ym_uid`, `_ga`, `_fbp`, etc.) or requests (`mc.yandex.ru/watch`, `analytics.google.com/g/collect`) detected before banner dismissal.

### URL stratification for full scans

Three-layer URL selection:
- **Layer 1** (mandatory): homepage + known compliance paths (`/privacy`, `/about`, `/contacts`, etc.)
- **Layer 2** (scored): top URLs by `scoreUrl()` — 70% of budget
- **Layer 3** (sample): stride-sample from remainder — 15% of budget

Page cap: 50 with Sleza key (rate-limited 1.1 s/page), 150 without.

### SSE streaming

Full-site scans take 2–5 min. Backend sends SSE `{ phase, current, total, url }` + final `{ done: true, result }`. Frontend reads via `res.body.getReader()`. Stop button calls `reader.cancel()`.

### Key flow

Frontend stores keys in `localStorage`, sends as `x-groq-key` / `x-sleza-key` headers. Backend `extractKeys()` reads them, falls back to `DEFAULT_GROQ_KEY` / `DEFAULT_SLEZA_KEY` env vars.

### Database (Supabase PostgreSQL, `db.js`)

Tables: `scans` (results by UUID), `leads`, `feedback`, `domain_exceptions` (feedback loop), `events` (funnel analytics), `doc_requests`. Scan cache: 20-min TTL via `findCachedScan`. **Railway Redeploy does NOT invalidate the Supabase cache** — wait 20 min after redeploy for fresh results.

## Frontend components (`frontend/`)

| File | Role |
|---|---|
| `app/page.js` | Key storage, scan trigger, SSE reader, progress bar, stop button |
| `components/ScanForm.js` | URL input + mode buttons |
| `components/Results.js` | Renders scan result — checks, штрафы, confidence badge |
| `components/Landing.js` | Marketing landing page |
| `components/LeadOfferCard.js` | Email capture CTA (free audit offer) |
| `components/DocOfferCard.js` | Document package upsell |
| `components/IntakeModal.js` | Full intake form |
| `components/ShareModal.js` | Share report link |

Result shape matches what `runFullSiteScan` / `runSinglePageScan` produce in the Tampermonkey script.

## Environment variables

```
PORT=3001
DEFAULT_GROQ_KEY=          # fallback if user doesn't provide header
DEFAULT_SLEZA_KEY=
ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000   # used by PDF generator (Playwright screenshots)
DATABASE_URL=              # Supabase postgres:// — graceful fallback if absent
ADMIN_TOKEN=               # required for /api/admin/* and /api/debug/* (fail-closed)
```

## Git workflow

- Main branch: `master`
- Backend is Node ESM (`"type": "module"`) — use `import`/`export`, not `require`
- Do not push to `master` without explicit user request
- Railway and Vercel auto-deploy on every push to `master`

## MCP tools

`.mcp.json` at project root configures Playwright MCP for Claude Code (VSCode extension). Restart session after changes to `.mcp.json`.

## Deployment

- **Frontend:** https://fonarik-web.vercel.app (Vercel, auto-deploy from master)
- **Backend:** https://sleza-web-production.up.railway.app (Railway)
- Health check: `curl https://sleza-web-production.up.railway.app/health`

## Known limitations / false positives

- **Cloudflare/DDoS-Guard** (wildberries.ru): falls back to plain fetch — results partial
- **Яндекс anti-bot / SmartCaptcha**: Railway IP blocked → 152-FZ RISK despite compliant site
- **Playwright fallback (⚡)**: sberbank.ru, rosatom.ru — ИНН in JS-footer invisible to plain fetch
- **20-min Supabase cache**: survives Railway Redeploy — wait 20 min for fresh scan
- **Server-Side GTM**: tracking requests are server-to-server, invisible to browser interception

## Smoke test baseline (2026-05-27, актуальный)

```
shop     wildberries.ru   → ⚠️ ⚠️ ✅ ✅ ✅ ✅  (Cloudflare firewalled)
media    rbc.ru           → ✅ ✅ ✅ ✅ ✅ ✅
services hh.ru            → ✅ ✅ ✅ ✅ ✅ ✅
saas     bitrix24.ru      → ✅ ✅ ✅ ✅ ✅ ✅
media    vc.ru            → ✅ ✅ ✅ ✅ ✅ ✅
extra    callibri.ru      → ✅ ✅ ✅ ✅ ✅ ✅
extra    sleza.media      → ✅ ⚠️ ✅ ✅ ✅ ✅
Колонки: 152-ФЗ | 149-ФЗ | ЕРИР | Оферта | Куки | GA
```
