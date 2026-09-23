---
target: кабинет frontend/app/app (после polish 0a34428)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-09-23T18-13-52Z
slug: frontend-app-app
---
Method: dual-agent (A: design review · B: detector + browser). Independent re-run after the polish commit 0a34428; neither agent saw the previous snapshot.

## Heuristic scores (previous → now)

| # | Heuristic | Prev | Now | Key issue |
|---|---|---|---|---|
| 1 | Visibility of System Status | 3 | 3 | Card payment and auto-renew-off finish without confirmation |
| 2 | Match System / Real World | 2 | 3 | Trial money contradictions gone; banking tone left («Оплатить год» → «Пополнить»; «Продлить на 1 год» for an unpaid site) |
| 3 | User Control and Freedom | 3 | 3 | Step-6 «Пока не видим код» dialog ignores Escape; «Включить автопродление» leads to payment |
| 4 | Consistency and Standards | 2 | 2 | Same state, different tone per screen; N blue buttons in «Мои сайты» |
| 5 | Error Prevention | 3 | 3 | Register consents below sign-in buttons, first click fails |
| 6 | Recognition Rather Than Recall | 3 | 3 | Document titles don't look like links at rest |
| 7 | Flexibility and Efficiency | 3 | 2 | No skip link; tiles and «⋯» menu ignore arrow keys |
| 8 | Aesthetic and Minimalist Design | 2 | 3 | Onest renders; repetition left (shortfall ×3, three progress indicators) |
| 9 | Error Recovery | 3 | 3 | 4 of 5 step-2 group errors not announced; no focus to first error |
| 10 | Help and Documentation | 3 | 3 | FAQ points to a removed pencil |
| **Total** | | **27** | **28/40** | **Good (low edge)** |

Why only +1: fixes raised H2 and H8; a fresh reviewer went deeper into keyboard paths and billing edge states and lowered H7. Whole-point scale; independent reviewers vary ±1–2. All three previous P1s are closed (font, trial money contradictions, step 6); the new P1s are mostly pre-existing edge states plus one polish miss (step-6 dialog).

## Design specificity
LLM: ~60% authored — specific in copy (law beside title in mono, answer→document provenance, one-line «Зачем»), interchangeable in form; the "Notary's Desk" never shows a document.
Detector: CLI plain — 1 finding, false positive (tab underline, CodeClient.js:87). With DESIGN.md applied: real in scope — login H1 34/38px (LoginClient.js:33), AccountMenu 9px «скоро» (legacy shell only). Browser, 5 pages: real — long lines in small text (billing «Что входит» ~130 @13px, doc row notes ~112/~90 @12px, overview banner ~96 @14px), INN truncated in «Документы» header at 390 (SiteDocumentsClient.js:171). False positives: cream-palette, 10.5px mono labels, table head bands as nested cards, tab underline, fixed-height button "cramped padding", hidden tooltips "clipped". Onest confirmed rendering on all pages.

## Strengths
1. Honest copy with document provenance.
2. System mostly enforced: one blue button on most screens, visible focus ring, billing modals with useDialog.
3. Anketa removes paperwork: INN→card, BIK→bank, phone mask, step-6 tabs with arrow keys.

## Priority issues
1. [P1] Billing buttons don't do what they say (verified in code): Обзор «Включить автопродление» → /app/billing?pay=current opens «Продлить на год — Списать 12 000 ₽» (debits, switch stays off); expired site shows auto-renew switch ON, pay only via «⋯» → «Продлить на 1 год»; at 390 «Оплатить год» lands with the panel off-screen. Fix: CTA to the row's switch; ?pay scrolls to the row; expired → pay panel open, switch hidden; «⋯» says «Оплатить год» for unpaid. Command: harden, then clarify.
2. [P1] Keyboard focus lands in hidden content: collapsed panels (step 2 «Чем вы занимаетесь?», step 5 «Изменить ответ →», Виджет «Скопировать код») stay in Tab order; step-6 «Пока не видим код» dialog lacks useDialog. Fix: inert on collapsed wrappers; useDialog in step-6 dialog. Command: harden.
3. [P2] Urgency only in colour; screens disagree on tone: last trial day changes only colour; Подписка identical day 1 vs last day; day 1 Обзор blue while Подписка says «не хватает 12 000 ₽» three times (5-day trial debit falls inside the 30-day SOON window); tone decided in four places (describe, badgeOf, siteStatus, toneCls). Fix: words on the last day; shortfall once; one state→tone map in sites.js. Command: clarify.
4. [P2] Money moments finish silently: after card payment the panel collapses, page jumps, only a green badge; auto-renew off without acknowledgement. Fix: ok-tint role=status notice in the row. Command: polish.
5. [P2] «Мои сайты»: N blue «Открыть сайт» buttons; card lifts on hover but isn't clickable. Fix: whole card is the link; blue only when action is needed. Command: distill.

## Persona red flags
- First-timer: register consents below buttons; profile placeholders «Кирилл» look pre-filled; document titles don't look like links.
- Keyboard/screen reader: focus into hidden panels; step-6 dialog unmanaged; «⋯» menu without arrow keys; no skip link.
- Mobile: pay panel off-screen at 390; copy icon over code on step 6; sphere placeholder truncated.
- Лена: trial Подписка reads like a debt notice two hours in; silent payment; FAQ pencil; consent task still grey (owner question).

## Minor observations
- FAQ «Как обновить реквизиты компании?» mentions a removed pencil (SupportClient.js FAQ[2]).
- Page title x-position jumps 350/407/471 between sections.
- Text below 60%: login legal links ink/40, «обязательное согласие · Слеза», step numbers ink/35.
- Solid bg-ok fills (CodeClient, RequisitesClient) vs Tint-Not-Fill; backdrop-blur on bottom bars vs no-blur.
- Required star on every step 2–3 question.
- Paid Обзор shows «до 22.09.2027» next to «Продление 23.09.2027».

## Questions to consider
1. What does the balance give a single-site owner that «Оплатить 12 000 ₽» doesn't?
2. Could step 5 open with one real typeset page of her policy, table second?
3. On trial day 1, is «Оплатить год» really the next move, or only in the last 48 hours?
