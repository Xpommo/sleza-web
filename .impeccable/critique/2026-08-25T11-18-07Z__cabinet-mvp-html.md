---
target: cabinet-mvp.html (весь макет)
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-25T11-18-07Z
slug: cabinet-mvp-html
---
Method: dual-agent (A: a2a08f908357f65fd · B: aaf994f896afc6bf9)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Copy buttons and install-check give no click feedback |
| 2 | Match Real World | 4 | ОГРН/ОГРНИП correctly branched by legal form, statutes cited at point of question |
| 3 | User Control and Freedom | 3 | Back-links/cancel everywhere, but no autosave — anketa reload loses everything silently |
| 4 | Consistency and Standards | 3 | #cancel-confirm is the only solid-colored button besides ink |
| 5 | Error Prevention | 2 | Zero validation states anywhere, including bank fields |
| 6 | Recognition Rather Than Recall | 4 | Live document checklist is exemplary |
| 7 | Flexibility and Efficiency | 1 | Deliberately cut for MVP; only concession is hasIdentity skip |
| 8 | Aesthetic and Minimalist Design | 3 | Mono-for-numbers discipline held throughout; s-anketa2 density is the exception |
| 9 | Error Recovery | 2 | Only one modeled error state (install not-found), excellent but alone |
| 10 | Help and Documentation | 4 | Legal fold-outs embedded at point of question |
| **Total** | | **29/40** | **Good** |

## Design Specificity Verdict
LLM: strongly authored, not category-interchangeable (live checklist, legally-precise ownership branching, honest-copy discipline). Genericness only in login split-screen and FAQ accordion, appropriately so.
Detector (degraded mode — htmlparser2/css-select/css-tree/domutils unavailable, regex fallback, NO computed-contrast checked): 2 warnings — bounce-easing (line 513, isolated checklist-pop animation, only animation in file) and em-dash-overuse (86 instances, real count but rule calibrated for English; Russian em-dash use is grammatical, not an AI-tell per se). Detector's inability to check contrast means A's manually-estimated WCAG failures (.tiny ~4.1:1, .micro ~3.0:1) are uncorroborated-but-not-contradicted, not a clean bill of health.
Live browser: unavailable both assessments — shared Playwright instance locked by a concurrent process, not killed.

## Overall Impression
Domain-specific logic (registries, statutes, copy-honesty) executes well above typical mockup quality. But the highest-stakes screen (payment) has zero failure-state design, and the anketa's hardest step misrepresents itself as one decision when it's three.

## What's Working
1. Live document checklist (.cl-item/clPop) — turns abstract intake into visible real-time payoff.
2. Legally-precise ownership branching — ОГРН vs ОГРНИП vs neither, По счёту correctly hidden for self-employed.
3. Systemic honest-copy discipline — repeated deliberate removal of overclaims in commit history, not one-off cleanup.

## Priority Issues

[P1] No payment-failure state anywhere in the file
Why: highest-stakes screen (real money, bank data) is the only consequential moment with zero designed failure/edge state, unlike install-fail/trial-expiry/cancel.
Fix: design declined-SBP, bounced/stalled invoice, timeout states in the tone s-install already sets.
Command: /impeccable harden

[P1] s-anketa2 bundles three decision domains into one nominal step
Why: labeled "Шаг 2 из 4" but actually resolves legal-entity type + platform + client-contact purpose (+nested marketing consent) in one scroll — direct cause of both cognitive-load checklist failures, on the highest-effort screen of the highest-value flow.
Fix: split into real sub-steps (checklist sidebar already supports continuity) or make the step label honest about internal structure.
Command: /impeccable onboard

[P2] Zero validation/error states for any form field
Why: no .inp.error/pattern anywhere despite collecting ИНН/ОГРН and bank routing data (расчётный счёт/БИК/корр.счёт).
Fix: define error-state visual language now, before porting to real code.
Command: /impeccable harden

[P2] Segmented controls carry no accessible selected-state
Why: 6+ instances (ownership, platform, banner theme, payment tabs...) are plain buttons differentiated by CSS class only — no aria-pressed/role=radiogroup. Screen-reader users can't tell what's selected on a legally consequential form.
Fix: add aria-pressed/role=radiogroup to the existing data-swap handler — additive, not a rewrite.
Command: /impeccable polish

[P3] Copy buttons are silently non-functional
Why: unlike install-check (explicitly commented as "honest simulation"), copy buttons carry no such signal and read as broken.
Fix: wire navigator.clipboard.writeText() with a confirm state, or mark explicitly as demo-only.
Command: /impeccable polish

## Persona Red Flags
Jordan (first-timer): ОГРН/ОГРНИП unexplained; invoice bank fields (счёт/БИК/корр.счёт) have no format guidance; offer link on s-register is href="#".
Sam (accessibility): no segmented control announces state to screen readers; .tiny (~4.1:1) and .micro (~3.0:1, the "Шаг X из 4" label itself) fail WCAG AA; checklist state change has no aria-live.
Casey (mobile/interrupted): mobile checklist (.checklist-reveal) sits after all three dense form cards, weakening the exact motivational device meant to offset density; no autosave/draft-recovery warning anywhere.

## Minor Observations
- bounce-easing: isolated single animation in the whole file, not systemic.
- em-dash-overuse: real count, but rule calibrated for English; worth checking if "X — Y" became a copy crutch regardless of AI-tell framing.
- .find .dot/.dot.red/.dot.amber defined in CSS but unused in markup — likely dead code from an earlier iteration.
- SBP QR placeholder reads as a textile pattern, not QR-shaped.
- SBP phone input missing type="tel".
- s-support's cancel-subscription FAQ answer is thinner than modal-cancel's parallel copy (omits widget-disable/updates-stop consequences).

## Questions to Consider
1. Should every non-wired mockup control carry the same explicit "not wired yet" signal install-check gives itself, so intentional gaps stop reading as bugs?
2. s-pay has five well-considered "everything's fine" states and zero "something went wrong" states — what should happen on a declined SBP scan or a stalled invoice, before this ports to real code?
3. Is "Шаг 2 из 4" genuinely one step, or is the counter hiding the task's real shape — and would splitting it change completion on the funnel's hardest screen?
