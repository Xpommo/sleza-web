---
target: cabinet-mvp.html
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-25T12-28-18Z
slug: cabinet-mvp-html
---
**Method: dual-agent (A: design-review sub-agent · B: adafd0f0d5f64b39e — detector/browser-evidence sub-agent)**

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | 4 undocumented dead buttons (Отправить инструкцию/себе, Сохранить×2) give zero feedback on click |
| 2 | Match System / Real World | 3 | No new findings this round; domain language holds up |
| 3 | User Control and Freedom | 3 | No new findings this round |
| 4 | Consistency and Standards | 1 | Same class="tiny" renders two different contrast levels depending on inline style; .dark-footer .badge breaks the product's own "One Voice Rule" |
| 5 | Error Prevention | 3 | Length validation (ИНН/invoice account) still solid, unaffected by this round |
| 6 | Recognition Rather Than Recall | 3 | Anketa substep-split genuinely reduced memory load — confirmed real, no regression |
| 7 | Flexibility and Efficiency | 1 | New tablist/radiogroup ARIA roles promise keyboard efficiency, deliver none — zero keydown handlers anywhere in the file |
| 8 | Aesthetic and Minimalist Design | 3 | Mostly clean; badge blue-fill is the one jarring note, already counted under #4 |
| 9 | Error Recovery | 3 | sbpRetryBtn path still works correctly |
| 10 | Help and Documentation | 1 | No contextual help anywhere; the one explanatory comment (install-check no-op) is dev-facing, not user-facing |
| **Total** | | **23/40** | **Acceptable** |

Down from 29/40 on the first pass.

## Design Specificity Verdict

**LLM assessment:** The substep-split and the checklist metaphor are genuinely product-specific — they read as authored for a compliance-document subscription, not generic SaaS chrome. But this round's additions don't clear that bar as cleanly. The .dark-footer .badge solid-blue fill sits inside the single most persuasive moment in the whole macet — the "here's what a compliant site looks like" preview — and it's exactly where DESIGN.md's own "One Voice Rule" (--brand reserved for logo/hover/focus only) gets broken.

**Deterministic scan:** 2 findings from detect.mjs (degraded regex mode — htmlparser2/css-select/css-tree/domutils unavailable, undercount not clean bill):
- bounce-easing (line 533): .cl-item.done .cl-mark checkmark-pop animation uses cubic-bezier(.34,1.56,.64,1) — real overshoot. Minor, plausibly intentional celebratory micro-detail.
- em-dash-overuse (91 dashes, advisory-only): expected in heavily-authored Russian-copy mockup — not urgent.

## Overall Impression

The fix pass solved the problem it was aimed at and, in solving it, created two new ones. The cognitive-load fix (anketa substeps) is real and holds up under independent re-check. But the contrast fix only touched two CSS class definitions, not the ~10 places where an inline style= sits on the same element and silently overrides them. And the accessibility upgrade (adding tablist/radiogroup roles) added a promise — arrow-key navigation — that the WAI-ARIA pattern requires and the file doesn't deliver, which is a regression.

## What's Working

- Anketa substep-split (confirmed genuinely solid) — both assessments independently re-verified the cognitive-load fix holds up.
- Payment-issue state modeling is correct in code, just not reachable — the underlying logic is sound; it's a demo-surface gap, not a logic bug.
- sbpRetryBtn wiring — clean example of the pattern the 4 dead buttons should have followed.

## Priority Issues

**[P1] Contrast fix is real in the CSS class, silenced by inline overrides on 10 real elements**
- Why it matters: inline style="color:rgba(17,17,16,.5)" sits directly on class="tiny" (2 of them "tiny mono") and wins by specificity, so the rendered color never changed. Lines: 746, 1153, 1310, 1374, 1545, 1582, 1664, 1668, 1759, 1946. Three more stray sub-.62 instances without class collision (1550, 1919, 1934), plus two undefined --ink-3 references (1275, 1277) falling back to .5.
- Fix: strip the inline color override from all 10 tiny/tiny-mono elements; clean up the 3 stray instances and dead --ink-3 references.
- Suggested command: /impeccable polish

**[P1] New tablist/radiogroup ARIA roles have zero keyboard support — a regression vs. plain buttons**
- Why it matters: initA11yGroups() assigns role=tablist/tab or role=radiogroup/radio, but no keydown/Arrow handler exists anywhere in the file. Worse than before for screen-reader users who now expect arrow-key movement per WAI-ARIA APG and get nothing.
- Fix: implement roving-tabindex + arrow-key handling, or roll back to plain buttons without the roles until keyboard support exists.
- Suggested command: /impeccable harden

**[P2] .dark-footer .badge fills solid brand blue, breaking the product's own "One Voice Rule"**
- Why it matters: line 342 uses --brand (#1f1fe6) as a decorative pill fill inside the dark-footer "what you get" preview, on 3 screens — DESIGN.md reserves brand blue for logo/hover/focus only.
- Fix: recolor the badge using a neutral or --ok-family token; reserve --brand per the documented rule.
- Suggested command: /impeccable polish

**[P2] 4 undocumented dead buttons sit visually identical to working ones**
- Why it matters: "Отправить инструкцию" (1409), "Отправить себе" (1418), Account Settings "Сохранить" (1706), billing "Сохранить реквизиты" (1783) have no id, no data-*, no listener. Two other no-id buttons ("Проверить установку," 1458/1473) are explicitly commented as an intentional honest-simulation no-op; these 4 have no such justification.
- Fix: wire real save/send state-changes (even a fake toast, matching the honesty pattern already established for install-check), or add the same explanatory comment if intentionally stubbed.
- Suggested command: /impeccable harden

**[P2] Payment-failure states are correct in code but unreachable in a real click-through**
- Why it matters: paymentIssue (sbp-declined/invoice-stalled) only changes via a devtools console command — no UI path triggers either state, so last round's #1 P1 fix can't be demonstrated by clicking through.
- Fix: add a dev-only trigger (matching the existing MockControls-style toolbar pattern) so these states are reachable without devtools.
- Suggested command: /impeccable harden

## Persona Red Flags

**Sam (Accessibility-Dependent User):** Tabs into a segmented control now announced as tablist/tab, presses Arrow Right expecting standard tab-pattern movement — nothing happens; ends up cycling the whole page with Tab instead, worse than the plain unlabeled buttons this replaced. Separately, the 10 tiny-class elements meant to get the brightened .62 contrast still render at .5 because of inline overrides — the exact fine-print notices the fix was meant to help never actually got brighter.

**Alex (Power User):** Clicks "Сохранить реквизиты" on billing expecting an instant confirm — nothing happens. Re-clicks, then generalizes: stops trusting any solid-styled button on the page, including ones that do work (sbpRetryBtn).

**Jordan (First-Timer):** Best-served persona this round — the anketa substep fix genuinely helps. But a stakeholder demo of "here's what happens if payment gets declined" has no click path to show it — last round's top reassurance fix is invisible in normal use.

## Minor Observations

- The two "Проверить установку" no-ops (1458 sticky + 1473 duplicate) are fine as-is — remember both need updating together if ever wired for real.
- --ink-3 is referenced twice (1275, 1277) but never defined anywhere — harmless now, but a landmine if defined later expecting existing usages to pick it up.
- Checkmark-pop bounce easing (line 533) worth a second look but not urgent — could be intentional micro-delight rather than dated bounce.

## Questions to Consider

- The badge is the one place brand-blue breaks its own no-decorative-fill rule, on the most persuasive screen in the macet — intentional exception, or did the fix pass just miss it?
- Given the established pattern for "Проверить установку" (a comment explaining an honest no-op), should the 4 dead buttons get the same honesty treatment before real wiring, or be wired now?
- Now that tablist/radiogroup roles exist without keyboard support, is it faster to roll back to plain buttons until keyboard nav is ready, rather than ship a technically-incorrect ARIA pattern?
