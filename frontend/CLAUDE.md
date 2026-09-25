# Frontend components (`frontend/`)

Two independent product surfaces share this one Next.js app: the public scanner (below) and the subscriber personal cabinet (`app/app/*`, next section). They don't share components or data — don't assume a change to one affects the other.

### Scanner / marketing site

| File | Role |
|---|---|
| `app/page.js` | Key storage, scan trigger, SSE reader, progress bar, stop button |
| `components/ScanForm.js` | URL input + mode buttons |
| `components/ScanProgress.js` | Live terminal-log view of scan phases (maps backend SSE phase keys — `sitemap`/`crawl`/`render`/`sleza`/`policy`/`ai` — to log lines) |
| `components/Results.js` | Renders scan result — checks, штрафы, confidence badge |
| `components/Landing.js` | Marketing landing page |
| `components/LeadOfferCard.js` | Email capture CTA — sells the compliance subscription (price anchor: lawyers 75–200k one-time vs от 3 500 ₽/мес); shown right after the findings table when there's something to fix |
| `components/DocOfferCard.js` | Document package upsell |
| `components/MonitoringSignup.js` | Email capture for ongoing monitoring subscription — posts to the real backend (`NEXT_PUBLIC_BACKEND_URL`), unlike everything in `app/app/*` |
| `components/IntakeModal.js` | Full intake form |
| `components/ShareModal.js` | Share report link |
| `components/CookieBanner.js` | This site's *own* cookie-consent banner (localStorage `consent_v1`) — not the client-widget banner the product sells; unrelated component despite the similar name |

Result shape matches what `runFullSiteScan` / `runSinglePageScan` produce in the Tampermonkey script.

`frontend/migration/` holds a **staged, not-yet-applied** redesign of this scanner/landing surface (8 files: `app/page.js`, `ScanForm.js`, `Results.js`, `Landing.js`, `tailwind.config.js`, `globals.css`, `app/layout.js`, plus a new `ScanProgress.js`) — see `frontend/migration/README.md` for what changes and the copy-in steps. The files there differ from the live ones; don't assume it's already applied, and don't edit both copies expecting them to converge.

### Personal cabinet (`app/app/*`) — mock-only prototype, not wired to a backend

The subscriber-facing dashboard for the compliance-document subscription — the real-code counterpart to the static HTML macets in `design-export/` (`cabinet-mvp.html` / `cabinet-a.html` / `cabinet-b.html`). **Zero `fetch()` calls anywhere in this tree.** `app/app/login/LoginClient.js` says it plainly: "формы и валидация живые, но сессия не создаётся" (forms and validation are real, no session gets created). Treat changes here as prototype/design work, not production wiring, unless told otherwise.

- `app/app/(dashboard)/layout.js` wraps everything under `/app` in `<AppShell>` **except** `/app/login` — the `(dashboard)` route group opts out of the URL segment but not the shell.
- **`/app` itself now redirects to `/app/sites`** (24.09; `app/app/page.js` + `AppRedirect.js`, outside the group so the old shell never flashes). The legacy «Проекты — ШтрафКонтроль» list is no longer routed — `ProjectsClient.js` stays as a file, `/app/project/[id]` still renders.
- `components/app/AppShell.js` — sidebar chrome (desktop: sticky left column; mobile: drawer behind a burger button). Nav shows one item at the project list (`/app`) and swaps to project-scoped tabs (Обзор/Документы/Виджет) once inside `/app/project/[id]`. Account actions (settings, billing) live in `AccountMenu`, never in the sidebar nav. (This describes the older `/app` + `/app/project/[id]` prototype.)
- **Current flow (`/app/register` → `/app/sites` → `/app/start/*` → `/app/site/*`)** — state lives in `sessionStorage` via `app/app/start/_shared/anketaState.js`. Money is split the way domain registrars and hosting panels do it (owner 24.09): **«Мои сайты» = what we pay for** — its «Таблица» view is the subscription table (`BillingClient mode="sites"`: tariff, status, auto-renew switch, «⋯», a visible «Оплатить год» / «Продлить на год»; the year is paid inside the row, a shortfall is paid there by card or invoice); **«Баланс и платежи» = what and how much** — `/app/billing` («Платежи»: balance, top-up, payment method, operations history) and `/app/accounting` («Документы»: acts, e-mail for documents). Each site has its own tariff, subscription year and renewal date; the balance, card, payer and acts e-mail are shared. **Auto-renew off = manual renewal, not leaving**; leaving is «Отключить сайт» in the row «⋯» (flag `leaving`), reversible with «Вернуть в подписку». An open top-up invoice counts toward the shortfall (no second «Пополнить» while it is pending). Subscription state is derived only in `app/app/site/_shared/subscription.js` + `sites.js` — overview, the sites table and the «Мои сайты» card must not derive it separately. After the 5-day trial an unpaid site is `expired` but keeps working for `GRACE_DAYS` (3), and indefinitely while a top-up invoice is pending (owner 25.09): «виджет снят» / «Остановлена» only when `widgetStopped(a, now, invoice)` is true — never test `subState === 'expired'` for that.
- `components/app/MockControls.js` — an in-app dev toggle (`<MockBar>`), the React-context equivalent of the "МАКЕТ" toolbar in the static macets: flips `isAgency` (client vs. agency wording/filtering) and `hasData` (empty state) live, no reload.
- `lib/appMock.js` — the project list's data shape **and** the shared derivation layer: `counts()`, `projectSummary()`, `checkSegments()`, `fineLabel()`, `paymentState()`, `severityScore()`, `terms()`. Comment in the file: "при подключении бэкенда заменяется запросом к API, форма объектов сохраняется" — when a backend gets wired up, only the data source changes; this shape and its helper functions are the contract to preserve.
- **Six checks, not five**: `CHECK_NAMES = ['152-ФЗ','149-ФЗ','ЕРИР','Оферта','Куки','Google Analytics']`. `lib/projectMock.js`'s `CHECK_DETAILS` tags each with `closedBy: CLOSED_BY.US | CLOSED_BY.CLIENT` — **only 4 of 6 are closeable by the product** (152-ФЗ, 149-ФЗ, Оферта, Куки — documents/widget); ЕРИР and Google Analytics need the client to act themselves (get an ERID, migrate off GA) because no generated document cures either. The file states the rule directly: "Обещать кнопку там, где мы бессильны — вводить в заблуждение" (promising a fix button where the product can't deliver is misleading). Any screen — macet or real — showing "закроем всё сами" for the full check list is overpromising against this; use each check's `weDo` / `youDo` text for the correct framing.
- `terms(isAgency)` is the single source for "site" vs. "project" wording (`сайт`/«Мои сайты» vs `проект`/«Проекты») — don't hardcode either word elsewhere in this tree.
