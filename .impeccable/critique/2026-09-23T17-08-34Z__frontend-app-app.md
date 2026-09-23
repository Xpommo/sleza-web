---
target: кабинет frontend/app/app
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-09-23T17-08-34Z
slug: frontend-app-app
---
Method: dual-agent (A: design review · B: detector + browser). Both agents were restarted after a session rate limit; B returned before A, A worked isolated and never saw detector output.

## Heuristic scores

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | «Подписка» row says «28.09 спишем 12 000 ₽» with 0 ₽ balance; shortfall only as grey 12–13px meta |
| 2 | Match System / Real World | 2 | Balance model leaks to a single-site owner: «Оплатить год» lands on «Пополнить» |
| 3 | User Control and Freedom | 3 | Назад everywhere, «Изменить ответ →», two-step auto-renew off; cookie-banner switch in «Виджет» acts instantly |
| 4 | Consistency and Standards | 2 | Trial = blue pill in «Мои сайты»/«Подписка», amber banner in «Обзор»; one state has 4–5 names |
| 5 | Error Prevention | 3 | INN/BIK lookup, domain normalization, phone mask; widget switches without confirmation |
| 6 | Recognition Rather Than Recall | 3 | Answer→document loop excellent; doc title links have no resting affordance |
| 7 | Flexibility and Efficiency | 3 | «Поручу другому», ?pay=current deep links, one-click copy |
| 8 | Aesthetic and Minimalist Design | 2 | Everything renders in Times; same date/price repeated 3–4× on trial «Подписка» |
| 9 | Error Recovery | 3 | Error copy explains why; errors not announced, focus stays on «Далее» |
| 10 | Help and Documentation | 3 | One-line «Зачем», FAQ; no help at balance vs auto-renew |
| **Total** | | **27/40** | **Acceptable** |

## Design specificity
LLM: disciplined, coherent visual system (warm desk, white sheets, one blue, mono for data); product character lives almost entirely in copy (answer→document provenance, platform-specific install, versioned docs with reasons). Structure is category-generic SaaS; the document itself never appears as a page.
Detector: CLI 0 findings, but root DESIGN.md is not picked up (walk stops at frontend/package.json) so design-system rules didn't run. With DESIGN.md applied: 6 font-size findings in current flow, 1 real (AccountMenu.js:92 «скоро» 9px at ink/25); rest = 17px wordmark, login h1 34/38px. Browser on 4 pages: 24 findings. Real: amber trial text 3.2:1 on warm; 11px ink/45 version dates ~3:1; 10px badges on step 4; lead lines 90–130 chars (measured in Times). False positives: cream-palette (warm token), nested-cards on table header strip, kicker «Шаг 4 из 6», clipped tooltips (not clipped at tested width).
Overlays left in the [Human] tab of the Playwright MCP browser (requisites page).

## Overall
Honest copy and strong anketa ergonomics, but the cabinet doesn't render as designed: Onest never applies, so everything reviewed so far was seen in Times. After the font, the biggest opportunity is the money path.

## What's working
1. Answer → document provenance (lib/docPackage.js, step 5, «Документы»).
2. Consequence-first copy (7 Обзор banner states, SiteOffModal outcomes).
3. Anketa ergonomics: INN→registry card, BIK→bank, phone mask, platform install steps, «Поручу другому», explanatory errors.

## Priority issues
1. [P1] Whole cabinet renders in Times, not Onest. globals.css:34 declares --font-sans on :root via var(--font-onest), but next/font sets --font-onest only on <body> (layout.js:110). Broke in e940ce2 (2026-06-24). Verified computed font-family = Times on html/body/h1. Fix: move font variable classes to <html>, then re-check all screens at 1440/390 (Onest is wider). Command: typeset, then polish.
2. [P1] Money path contradicts itself. «Оплатить год» → «Подписка» with no «Оплатить год» but two blue «Пополнить»; row says «спишем 12 000 ₽» at 0 balance with auto-renew on (BillingClient.js:218, debit ignores balance); right after paying the balance card says «на балансе не хватает» and «Пополнить» stays primary; trial banner in «Обзор» amber from hour 1 with «пополните заранее» (SiteOverviewClient.js:103) — the trial-end moment the owner disliked. Fix: form titled with the clicked verb; balance «Пополнить» white when form open or nothing due within a month; amber shortfall notice «не хватит 12 000 ₽ — пополните до 28.09»; trial banner blue, amber only at the end. Command: clarify, then harden.
3. [P1] Step 6: answer preselected, primary action demoted. useState('Поставлю сам') (CodeClient.js:96) against the anketa's "client chooses" rule; the segmented thumb is the only blue fill; «Проверить код на сайте» is a 12px white chip (11px label on mobile). Fix: «Проверить код на сайте» as the single blue h-12 button; «Кто поставит код?» as tabs or without default. Command: layout.
4. [P2] The client's one legal task is a grey caption. «Ссылку на согласие добавьте в формы сайта» is 13px muted row text while «Обзор» says «Документы актуальны». Fix: visible notice with the consent URL + copy on step 5 and «Документы»; a tracked task in «Обзор» touches the owner's deferred self-checklist — owner decision. Command: clarify.
5. [P2] Accessibility below AA. Focus ring ring-brand/15 ≈1.3:1 (invisible on nav, doc links, icon actions); version dates ~3:1; errors not announced, no focus to first invalid field; SiteOffModal without focus trap; six identical «Скопировать ссылку» names; «Зачем» target 16px tall. Fix: ring-2 ring-brand ring-offset-2 across all 7 RING copies (update DESIGN.md), meta ≥ ink/60, aria-live + focus first error, focus trap, doc name in copy labels. Command: harden.

## Persona red flags
- First-timer: doc titles don't look like links, open new tab silently; step 5 «Посмотреть» promises a document, shows 3 lines; «Оплатить год»/«Пополнить»/«Автопродление» for one action.
- Keyboard/screen reader: invisible focus; tiles = separate tab stops, no arrow keys; errors without aria-live; modal without focus trap.
- Mobile: step 4 2559px tall; anketa next action is an 11px label while the ink pill goes to «Шаги»; step 6 snippet under the copy icon; sphere select truncated.
- Лена (school owner, fears fines): «152-ФЗ» in small mono reads as «152-Ф3»; amber trial on day one; «на балансе не хватает» after paying; consent task is a caption; one tap in «Виджет» turns the banner off; no response-time promise in «Поддержка».

## Minor observations
- In-flow cards in «Мои сайты» with heavy shadow (SitesClient.js:109) vs DESIGN.md Float-Only rule.
- Off-scale sizes: 26/22px empty state, 16px profile.
- Domain in Onest in cards, mono caps in sidebar.
- Step 4: three blue fills at once (ООО, Да, Далее).
- One state, many names: «Автопродление выключено» / «Без продления» / «Сайт выключен из подписки» / «Сайт отключается».
- Payment form: «12000» unformatted; «Отмена» under the button.
- «Виджет» preview says «здесь показан тёмный вариант» with «Авто» selected.
- «Мои сайты» footnote centered under a left-aligned card.
- Paid preset: year starts at payment, not after trial (maket data).
- Reversed mobile tab order is a deliberate decision (c661880), left as is.

## Questions to consider
1. Does a single-site owner paying by card need the balance in view at all? (Challenges the 23.09 balance decision.)
2. If the peak is "your documents with your data", why does step 5 hide them behind five collapsed rows, and «Документы» never show a page?
3. Is «Документы актуальны» true while forms lack the consent link?
