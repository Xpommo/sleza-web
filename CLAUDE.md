# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

Monorepo with two packages managed from the root:

- `backend/` — Fastify HTTP server, Node.js ESM, no transpilation
- `frontend/` — Next.js 14 App Router, Tailwind CSS
- `marketing/` — untracked outreach tools (dashboard.html, triage.mjs), not part of the product

**Not npm workspaces** — root `package.json` has no `workspaces` field; each package installs and builds independently (its own `node_modules`), wired only by the root `install:all` / `dev` scripts and `--prefix`. Add a new package the same way, not via workspace hoisting.

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
cd backend && node test/smoke.js --vs-baseline         # vs golden baseline.json (7 sites)
# NB: smoke without --ai does NOT exercise the AI-path fixes (law152 guard, GA) — use --ai for those
# For 7-site quick baseline: temporarily replace test-urls.txt with 7 lines, restore after

# Unit tests (node:test)
cd backend && node --test test/calcConfidence.test.js test/computeScanDiff.test.js test/validateLead.test.js
# test/ also holds ad-hoc diagnostic scripts (node test/<file> directly: ga.js, intake.js, precheck.mjs, …) — not node:test suites

# Telegram agent bot (client-facing) — run from backend/
cd backend && node src/agent/bot.mjs        # long-poll; needs TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env
cd backend && node src/agent/tg-setup.mjs   # validate token / find chat id / detect webhook conflict
```

Backend auto-restarts on file changes and auto-loads `.env` in dev (`node --env-file=.env --watch`). First-time setup: copy `backend/.env.example` to `backend/.env`. Playwright Chromium must be installed once: `npm run build --prefix backend` (wraps `playwright install chromium --with-deps`; `--with-deps` pulls the system libraries needed on fresh Linux/Railway).

### Testing detector changes locally (no Claude/agent cost)

The local backend reads `DATABASE_URL` from `.env`. **If it's set, it points at *production* Supabase** — local scans then write to prod and read the prod 20-min cache, so detector edits appear to do nothing (cached) and pollute prod data. To test against fresh scans:

```bash
DATABASE_URL="" npm run dev:backend          # db off: fresh scans, no cache, no prod writes
curl -s -X POST http://localhost:3001/api/scan/single \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.ru","useAI":true,"siteType":"auto"}'   # ~40s/page
```

For false-positive analysis, query the `scans` table directly — results are JSONB at `result_json->'aiData'->'checks'`. The Supabase pooler (port 6543) needs `prepare:false` in postgres.js; `db.js`'s connection omits it, so use a **standalone** `postgres()` connection for ad-hoc queries, not `db.js`.

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

### Check assembly & override layer (`scanner.js`)

A scan produces `aiData.checks[]`, assembled one of two ways:
- **AI path** (`useAI=true`, production default): `engine.runAIAnalysis()` → Groq returns the checks. **These carry `law` (human name, e.g. `"152-ФЗ — персональные данные"`) but NO `id`.** `runAIAnalysis` also returns `fetched` (the fetched policy/offer/about text) and the raw local `result152`/`result149`/etc.
- **Local path** (`useAI=false`): `engine.buildLocalChecks()` from deterministic `check152FZ`/`check149FZ`/`checkERIR`/`checkOffer`/`checkDrugs`. These carry `id` (`law152`, `law149`, `erir`, `offer`, `drugs`, `cookie`).

**To find a check across both paths, match on both** — `c.id === 'law152' || /персональн/i.test(c.law)` (see the `findAICheck` helper). Matching on `id` alone silently misses every AI-path check.

After assembly, `scanner.js` runs a sequence of post-AI guards/overrides — **this is where most accuracy tuning lives**, not in the detectors themselves:
- `checkGoogleAnalytics(pageContext, gaPolicyText)` — injected with `id:'ga'`, local & deterministic (not LLM). `gaPolicyText` **must** be populated from `aiData.fetched.policy` on the AI path; if left empty the disclosure regex always sees a blank policy → false "violation / policy doesn't disclose".
- **Policy-read-confidence guard** — when a policy link exists but the extracted text is <3000 chars (image-PDF / SPA / wrong document), cap law152 at risk and report "found but couldn't read fully" instead of enumerating missing sections. The dominant law152 false-positive cause is *partial reads*, not a section-regex gap.
- `applyMediaOverride` / `applyServicesOverride` / `applyIPOverride` — site-type relaxations.
- Firewall/blocked caps — 149-FZ/152-FZ violations downgraded to risk when the page was IP-blocked/firewalled/fallback (can't prove what we couldn't read).
- `verifyERIRWithAI` (in the script) clears the "tracking script, no ad marker" ERIR risk when Groq confirms no paid third-party ads (`has_paid_advertising:false` at confidence high **or** medium).

### Policy text resolution (`fetchPolicyText` in `scanner.js`)

152-FZ accuracy depends on getting the full policy text. `fetchPolicyText` tries, in order: `policyLinks` → `offerLinks` → `rawDocLinks`, extracting PDFs via `pdf-parse` (`fetchPdfText`) and DOCX via `mammoth` (`fetchDocxText`), following one level of in-page links; then falls back to inline-modal text, common-path discovery, and sitemap. A source is accepted only if `check152FZ(text).found >= 4` (so community "Правила" pages aren't mistaken for a policy). **Scanned/image PDFs have no text layer → `pdf-parse` returns empty → the read-confidence guard handles them; text-layer PDFs/DOCX are read fine.**

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

Tables: `scans` (results by UUID), `leads`, `feedback`, `domain_exceptions` (feedback loop), `events` (funnel analytics), `doc_requests`, `monitoring_subscriptions`. Scan cache: 20-min TTL via `findCachedScan`. **Redeploying/restarting the backend does NOT invalidate the Supabase cache** — wait 20 min after a deploy for fresh results.

### Telegram agent (`backend/src/agent/`)

A **client-facing** bot (separate from `tg.js`, which is the admin lead-alert/command bot) that explains a scan's findings and guides the client to a human handoff. **In production it runs via webhook** — `tg.js` `handleUpdate` routes `/stats` and `/leads` to the admin bot and everything else to `handler.js`. For local testing run the long-poll wrapper: `node src/agent/bot.mjs` (no public URL needed).

| File | Role |
|---|---|
| `handler.js` | **Bot core** — `handleMessage` / `handleCallback`; command routing, ownership, funnel orchestration, relay. Shared by webhook (`tg.js`) and local poll (`bot.mjs`) |
| `kb.js` | Knowledge base as DATA (per-check explanations, confirmed fines, FAQ, guardrails) + `buildSystemPrompt()` |
| `llm.js` | LLM call — Groq `llama-3.3-70b` (default) or Claude (`AGENT_LLM=claude` + `ANTHROPIC_API_KEY`) |
| `agent.js` | `reply(history, scanContext)` — free-form Q&A grounded in KB + the client's own scan |
| `funnel.js` | Deterministic funnel — renders `{text, keyboard}` cards (Telegram **HTML**, `parse_mode:'HTML'`) from real `aiData.checks`, no LLM; `esc()` escapes user data |
| `scanLookup.js` | Read-only DB helpers — `getScanByUuid`, `normalizeScan`, `formatScanContext` |
| `store.js` | File-backed session persistence (`.agent-sessions.json`) — survives bot restart |
| `bot.mjs` | Thin long-poll wrapper for **local dev only** — imports `handler.js` |
| `tg-setup.mjs` | One-off helper: validate token / find chat id / detect a webhook conflict |

**Ownership model (privacy):** the bot reveals a scan only for sites the client *owns* — bound via deep-link `t.me/<bot>?start=<scan_uuid>` (or a typed `/start <uuid>`). Free-form domain mentions are deliberately **not** looked up in the DB (that would leak other clients' data); the bot instead links to the canonical scanner (`SCANNER_URL`). **There is no in-bot scanning** — checks always run on the main site scanner where the accuracy guards live.

**Funnel:** summary card → walk findings → fix/checklist → automate → handoff. Cards are templated from scan data (deterministic, no hallucination); the LLM handles only free-form questions. Guardrails (`kb.js` `GUARDRAILS`): signals-not-verdict, confirmed fines only (no certainty/outcome promises), defer specifics to a human, never invent findings for an unprovided site.

**Human handoff (relay):** "📞 Специалист" puts the client in relay mode — messages forward to the admin chat (`TELEGRAM_CHAT_ID`) with an inline "↩️ Ответить" button; the admin replies via button → type, `/reply <chatId> <text>`, or `/chats` (active-dialog picker). The client always sees a "🤖 Вернуться к боту-помощнику" button while in relay.

**Transport:** webhook is **live in prod** — `handler.js` is transport-agnostic; `tg.js` `handleUpdate` forwards non-admin updates (incl. `callback_query`) to it, `bot.mjs` does the same via long-poll locally. Remaining prod swap: persistence (file `.agent-sessions.json` → a `chat_links` DB table) for multi-instance durability.

**Shared bot token:** `tg.js` (admin alerts) and `handler.js` (agent) use the **same** `TELEGRAM_BOT_TOKEN` → one webhook. Admin commands are gated to `TELEGRAM_CHAT_ID`; everything else is the agent. `AGENT_ADMIN_ONLY=1` locks the agent to the admin chat.

## Frontend components (`frontend/`)

| File | Role |
|---|---|
| `app/page.js` | Key storage, scan trigger, SSE reader, progress bar, stop button |
| `components/ScanForm.js` | URL input + mode buttons |
| `components/Results.js` | Renders scan result — checks, штрафы, confidence badge |
| `components/Landing.js` | Marketing landing page |
| `components/LeadOfferCard.js` | Email capture CTA — sells the compliance subscription (price anchor: lawyers 75–200k one-time vs от 3 500 ₽/мес); shown right after the findings table when there's something to fix |
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

# Telegram agent (backend/src/agent/) + tg.js admin bot
TELEGRAM_BOT_TOKEN=        # @BotFather token (shared by tg.js alerts and the agent bot)
TELEGRAM_CHAT_ID=          # admin chat — lead alerts + handoff relay destination
AGENT_LLM=                 # groq (default) | claude
ANTHROPIC_API_KEY=         # required only if AGENT_LLM=claude
AGENT_ADMIN_ONLY=          # =1 locks the agent bot to the admin chat (default: open)
SCANNER_URL=               # public scanner link the bot sends (default: https://fonarik-web.vercel.app)
```

## Git workflow

- Main branch: `master`
- Backend is Node ESM (`"type": "module"`) — use `import`/`export`, not `require`
- Do not push to `master` without explicit user request
- Vercel auto-deploys the frontend on every push to `master`; the backend on Oracle is deployed manually (see Deployment)

## MCP tools

`.mcp.json` at project root configures Playwright MCP for Claude Code (VSCode extension). Restart session after changes to `.mcp.json`.

## Deployment

- **Frontend:** https://fonarik-web.vercel.app (Vercel, auto-deploy from master)
- **Backend:** Oracle Cloud Always Free ARM VM (Ubuntu 24.04, 2 OCPU / 12 GB), Caddy auto-TLS in front of Fastify on :3001
- Health check: `curl https://<subdomain>.duckdns.org/health`
- Provisioning + runbook: [`deploy/oracle/README.md`](deploy/oracle/README.md); one-shot `deploy/oracle/setup.sh`

**Railway is dead** (free credits exhausted → `404 Application not found`). Its env vars survive only as fallbacks: `RAILWAY_PUBLIC_DOMAIN` → `BACKEND_URL`, `RAILWAY_GIT_COMMIT_SHA` → `'dev'`. Set `BACKEND_URL` explicitly — the Telegram webhook registers against it at boot.

**No push-to-deploy on Oracle** — that was a Railway feature. Deploy is a manual `git pull && npm ci && systemctl restart fonarik-backend` (see the runbook).

**The backend now runs outside RF.** We store leads (PD of Russian citizens) while the scanner itself flags data-localization breaches under 152-ФЗ ст.18 ч.5. Oracle is an unblock, not the final architecture — the Yandex Cloud RF migration for the PD path still stands.

## Legal grounding for detectors

When editing a detector's verdict/severity/fine, verify the current law first (it changes) — LLM-auditor "false positive" verdicts are legally unreliable. Example baked into the code:

- **Google Analytics is a *real* violation, not a false positive.** Since 01.07.2025 (23-ФЗ → 152-ФЗ ст.18 ч.5) primary collection of Russian citizens' PD must happen on Russian servers; GA sends IP/behaviour to US servers → **data-localization** violation (КоАП 13.11 ч.8, 6–18M ₽ for legal entities). Policy disclosure or a РКН cross-border notification does **not** cure localization. `checkGoogleAnalytics` grades by policy transparency (discloses → risk, silent → violation) as a *severity* signal only; `law_code` is `152-ФЗ ст.18 ч.5 + ст.12`.

## Known limitations / false positives

- **Cloudflare/DDoS-Guard** (wildberries.ru): falls back to plain fetch — results partial
- **Яндекс anti-bot / SmartCaptcha**: server IP blocked → 152-FZ RISK despite compliant site (the Oracle IP is a fresh one — this may behave differently than it did on Railway)
- **Playwright fallback (⚡)**: sberbank.ru, rosatom.ru — ИНН in JS-footer invisible to plain fetch
- **20-min Supabase cache**: survives a backend redeploy/restart — wait 20 min for fresh scan
- **Server-Side GTM**: tracking requests are server-to-server, invisible to browser interception
- **SPA policy discovery**: if no policy link appears in the rendered DOM (some React/Vue sites, e.g. foxford), law152 reads as "not found" — the read-confidence guard can't soften it (no evidence a policy exists)
- **Scanned/image-PDF policies**: need OCR (not implemented); read-confidence guard degrades them to "couldn't read — verify manually" rather than a false "incomplete"

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

**Accuracy pass (2026-06-11, commits `7ec2e5d` `b7d6d77` `ba1e258`):** fixed five false-positive classes found by auditing reputable sites — form-consent scope, ERIR-for-SaaS, the AI-path GA bug (`gaPolicyText` was always empty → GA always violation), GA legal framing, and law152 partial-policy-read. Baseline above predates these; re-running smoke after deploy should show law152/erir/ga settle.
