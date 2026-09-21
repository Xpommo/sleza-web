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
3. `../../../sleza_tets_js/script`, resolved from `backend/src/` — **three levels up lands one directory above this repo**, i.e. `~/sleza_tets_js/script`, a sibling checkout next to `sleza-web/`. This is a different thing from the `sleza_tets_js/` **git submodule** committed inside this repo (`.gitmodules`) — the submodule isn't what `engine.js` reads; the sibling clone is.

**Updating the bundled script:** after changes in `sleza_tets_js/script`:
```bash
cp ~/sleza_tets_js/script ~/sleza-web/backend/sleza_script && git add backend/sleza_script && git commit
```

## Common commands

```bash
# Node.js via NVM — load first
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"

# root package.json has the install:all / dev / dev:backend / dev:frontend scripts; backend/package.json has start

# Smoke tests — run from backend/, not root
cd backend && node test/smoke.js 2>/dev/null           # all URLs in test-urls.txt (~70 min)
cd backend && node test/smoke.js --diff                # with diff vs baseline
cd backend && node test/smoke.js --vs-baseline         # vs golden baseline.json (7 sites)
# NB: smoke without --ai does NOT exercise the AI-path fixes (law152 guard, GA) — use --ai for those
# For 7-site quick baseline: temporarily replace test-urls.txt with 7 lines, restore after

# Unit tests (node:test)
cd backend && node --test test/calcConfidence.test.js test/computeScanDiff.test.js test/validateLead.test.js
# test/ also holds ad-hoc diagnostic scripts (node test/<file> directly: ga.js, intake.js, precheck.mjs, …) — not node:test suites
# CI (.github/workflows/smoke.yml) runs `node test/smoke.js --vs-baseline --strict` daily + on push to
# master touching backend/sleza_script or backend/src/** — same command works locally

# Telegram agent bot (client-facing) — run from backend/
cd backend && node src/agent/bot.mjs        # long-poll; needs TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env
cd backend && node src/agent/tg-setup.mjs   # validate token / find chat id / detect webhook conflict
```

Backend auto-restarts on file changes and auto-loads `.env` in dev (`node --env-file=.env --watch`). First-time setup: copy `backend/.env.example` to `backend/.env`. Playwright Chromium must be installed once: `npm run build --prefix backend` (wraps `playwright install chromium --with-deps`; `--with-deps` pulls the system libraries needed on fresh Linux/Railway).

Testing detector changes locally without hitting production Supabase: see the `test-detector-locally` skill.

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
| `agent/` | Client-facing Telegram agent bot — see `backend/src/agent/CLAUDE.md` |
| `email.js` | Resend email integration |
| `validateLead.js` | Lead form validation |

### Engine isolation (`engine.js`)

Each HTTP request gets its own `vm.createContext()`. The Tampermonkey script uses module-level mutable state (`scanCancelled`, `SKIP_REASONS`) that would leak across concurrent scans if shared. Two adapters are wired in per request:
- `engine.setHttpTransport(makeFetchTransport())` — replaces `GM_xmlhttpRequest`
- `engine.setKeyStore({ get, set })` — request-scoped key lookup

Keys (Groq, Sleza) arrive in request headers (`x-groq-key`, `x-sleza-key`), never stored server-side.

### Why Playwright (`pageContext.js`)

Many Russian sites (SPAs, React/Vue) return empty skeletons on plain `fetch()`. Playwright runs full JS. `buildPageContext()` is called once per scan for the main page only. A single Chromium instance is kept alive as a singleton; each scan gets an isolated `BrowserContext` (separate cookies/storage) closed after use.

**Every context MUST be created via `newStealthContext(browser, opts)`, never `browser.newContext` directly.** It launches Chromium with `--disable-blink-features=AutomationControlled` and injects a stealth init-script (hides `navigator.webdriver`, fakes `plugins`/`languages`/`window.chrome`). This defeats **fingerprint-based** anti-bots (BotFAQtor and similar) that otherwise redirect a headless browser to a block page — the block page's own contact form was being scanned and producing false "форма без согласия". It does **not** defeat interactive captchas (SmartCaptcha, Cloudflare Turnstile). If a scan still lands on a block host, `buildPageContext` and `fetchFormPageSignal` detect it (final URL `botfaqtor`/`blocked.*` or signature text) and refuse to scan the stub — never trust a form/policy read from a block page.

**Key signals extracted by `buildPageContext`:**
- `policyLinks`, `offerLinks`, `aboutLinks` — same-domain compliance links
- `hasCookieBanner`, `hasConsentCheckbox`, `hasPreCheckedConsent`
- `hasPreConsentTracking`, `preConsentTrackingServices` — tracking fires before banner interaction
- `hasDataFormNoConsent`, `inlineModalPolicyText`, `bundledConsent`
- `hasAdScripts`, `hasAnalytics`, `hasGtm`, `hasGoogleAnalytics`
- `marketingServices` (`[{name, tier:'email'|'push'}]` — ESP/web-push captured via network interception), `hasSubscribeWidget`
- `_http403`, `_firewalled`, `_blocked`, `_fallback` — access failure flags

**Consent controls are detected broadly:** `detectDataFormNoConsent` treats a `role=switch`/toggle as consent, not only `<input type=checkbox>`; a valid text-notice ("нажимая кнопку, вы соглашаетесь…") also counts — 152-FZ ч.1 ст.9 does not require a checkbox specifically. `detectPreCheckedConsent` matches native checked checkboxes plus `[role=checkbox|switch][aria-checked=true]` — **not** a bare `[aria-checked=true]` (that matched tabs/radios/ratings near consent text → false "pre-checked violation").

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

**Check `status` is one of `ok` / `risk` / `violation` / `recommendation`.** `recommendation` (rendered blue, excluded from violation/risk counts) is for best-practice-but-not-mandatory findings — 149-FZ requisites, a cookie-rules doc, delivery/return rules, missing marketing consent. When adding a status, update the STATUS maps in `frontend/components/Results.js` **and** `frontend/app/print/page.js`.

After assembly, `scanner.js` runs a sequence of post-AI guards/overrides — **this is where most accuracy tuning lives**, not in the detectors themselves:
- **Locally-injected deterministic checks** (pushed into `aiData.checks` on both paths; pattern: build a `{id, law, status, ...}` object and push if that `id` isn't already present):
  - `checkGoogleAnalytics(pageContext, gaPolicyText)` — `id:'ga'`. `gaPolicyText` **must** be populated from `aiData.fetched.policy` on the AI path; if left empty the disclosure regex always sees a blank policy → false "violation / policy doesn't disclose".
  - `checkCookiePolicy(pageContext, policyText)` — `id:'cookie_policy'`. Cookie-rules doc is **not** required to be separate — pass `policyText` (same `gaPolicyText`) so cookies described inside the privacy policy read as `ok`, not a false recommendation.
  - `checkDeliveryReturn(pageContext)` — `id:'delivery_return'`. Fires only for physical-goods-with-delivery; requires a real link, not a text mention.
  - `checkMarketingConsent(pageContext)` — `id:'marketing_consent'`. Triggered by marketing infrastructure (`marketingServices` ESP/push, `hasSubscribeWidget`), not by contact forms: push→`risk`, email/widget→`recommendation`, separate consent doc→`ok`. **These last three are single-scan only** — not yet injected in `runFullSiteScan`.
- **149-FZ (`law149`/requisites) is downgraded to `recommendation`** (no fine) unless the requisites are provably invalid (defunct/not-in-EGRUL).
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

## Frontend components (`frontend/`)

Two independent product surfaces (public scanner + subscriber personal cabinet) — see `frontend/CLAUDE.md` for the file-by-file breakdown.

## Design macets (`gh-pages` branch)

Static, dependency-free HTML click-through prototypes of the personal cabinet live on the **`gh-pages` branch**, not `master` — `cabinet-mvp.html` / `cabinet-a.html` / `cabinet-b.html` (three competing designs, see file-header comments for what each cuts) plus `client.html` / `client-flow.html` (the pre-signup scan→findings→buy journey), `admin.html`, `index.html`, and a shared `mobile-shared.css`. Each file is a single page with every screen present in the DOM at once, toggled via a `goScreen(id)` JS switcher and a dev-only "МАКЕТ" toolbar (hidden in the real product). They're published straight from that branch to `https://xpommo.github.io/sleza-web/`.

**A `design-export/` folder also exists locally on `master` — it is untracked (`git status` shows it `??`, nothing under it has ever been committed) and can be badly out of date.** Before trusting anything in it, compare timestamps or content against the same file on `gh-pages`; when in doubt, `gh-pages` is the one that's actually deployed. Editing macets directly on `master`'s working tree risks colliding with unrelated uncommitted backend/frontend work — check out `gh-pages` into a separate `git worktree` first.

**On branch `anketa-hierarchy` there are two `cabinet-mvp.html` copies: the live one is at the repo root (`git show anketa-hierarchy:cabinet-mvp.html`), `design-export/cabinet-mvp.html` there is a stale 16.09 snapshot.** Porting from the stale copy already reversed an owner decision once (account-level billing, 18.09).

`design-export/HANDOFF.md` (also local/untracked) is the running decision log for macet copy and behavior — check it before changing established text (legal wording, cookie-banner copy, etc.) instead of re-deriving it.

## Environment variables

```
# PORT, DEFAULT_GROQ_KEY, DEFAULT_SLEZA_KEY, ALLOWED_ORIGINS, FRONTEND_URL — see backend/.env.example
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

`.mcp.json` at project root configures two MCP servers for Claude Code (VSCode extension): Playwright (browser automation — used for testing the macets and the real frontend) and Figma (`mcp.figma.com`, needs its own OAuth before use). Restart session after changes to `.mcp.json`.

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

- **Fingerprint anti-bots (BotFAQtor etc.)**: defeated by the stealth context (see "Why Playwright") — the block was on the headless fingerprint, not the IP (a plain `fetch()` from the same IP got the real page). Sites that used to render as a block page now scan for real.
- **Cloudflare/DDoS-Guard** (wildberries.ru): falls back to plain fetch — results partial
- **Яндекс anti-bot / SmartCaptcha, Cloudflare Turnstile**: interactive challenges — stealth does **not** bypass these; server IP blocked → 152-FZ RISK despite a compliant site. The ultimate answer here is a browser extension running in the client's own browser (discussed, not built).
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
