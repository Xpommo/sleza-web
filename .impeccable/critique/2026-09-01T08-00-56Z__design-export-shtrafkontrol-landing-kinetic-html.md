---
target: design-export/shtrafkontrol-landing-kinetic.html
total_score: 22
max_score: 36
na_heuristics: 7
p0_count: 2
p1_count: 4
timestamp: 2026-09-01T08-00-56Z
slug: design-export-shtrafkontrol-landing-kinetic-html
---
Method: dual-agent (A: a5a7742ca97346e93 · B: a8180eac626244622)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Scanned domain never echoed anywhere in the result |
| 2 | Match System / Real World | 2/4 | Copy matches the audience; radar/terminal chrome matches a developer's mental model instead |
| 3 | User Control and Freedom | 3/4 | No way to cancel mid-scan |
| 4 | Consistency and Standards | 1/4 | 2 of 3 "Проверить сайт" buttons are dead |
| 5 | Error Prevention | 3/4 | No input validation, but nothing can technically fail either |
| 6 | Recognition Rather Than Recall | 3/4 | Check catalog vs. anecdotes vs. stats share one card style |
| 7 | Flexibility and Efficiency | n/a | Not applicable to a single-session Persuade page |
| 8 | Aesthetic and Minimalist Design | 3/4 | Confident type scale, undercut by duplicated 9-check list |
| 9 | Error Recovery | 1/4 | Dead CTA fails in total silence — no disabled state, no feedback |
| 10 | Help and Documentation | 3/4 | FAQ + disclaimer present and correct |
| **Total** | | **22/36** | **Acceptable (61%)** |

## Design Specificity Verdict

**Mixed.** Content is unmistakably authored for this product — real statute citations, real ruble fine ranges per check, fully localized Russian copy. The visual/interaction metaphor (macOS-style traffic-light chrome, `signal://` faux-URI labels, sonar rings, severity badges) is a borrowed general-purpose cybersecurity-scanner trope, not a legal/regulatory one — swap the Cyrillic copy and this exact hero component is indistinguishable from a generic dev-tool vulnerability-scanner landing page. Content wins on specificity; the signature visual system is well-executed but domain-generic.

**Deterministic scan**: 70/70 CLI findings are `design-system-*` (comparing against DESIGN.md, which governs an unrelated product) — confirmed false positives, spot-checked and consistent with that explanation. Zero non-design-system findings fired (no `dark-glow`, `overused-font`, `codex-grid-background`) — but the detector ran in degraded regex-fallback mode (no HTML parser available on this machine), so this is "found nothing this weakened pass could catch," not a clean bill.

**Visual overlays**: injection failed — not a tooling fluke but a real browser security boundary (Chrome's Private Network Access policy blocks a public HTTPS origin from fetching a `localhost` resource). No live `[Human]`-tab overlay is available this run; findings below rest on CLI output + manual screenshot review instead.

## Overall Impression

Strong content-level craft (real law citations, a genuinely bespoke live-scan micro-interaction, confident distinctive typography) undercut by a handful of overlooked implementation bugs — most damagingly, two of the three CTA buttons on a conversion page are dead — plus a visual metaphor borrowed from developer tooling rather than one rooted in the legal/regulatory fear this specific audience feels. Single biggest opportunity: fix the dead CTAs (near-zero effort) and decide deliberately whether the radar/terminal chrome is right for a non-technical, anxious small-business owner, rather than distinctive for its own sake.

## What's Working

1. **The live scan micro-interaction** — per-check status transitions, ticking ring value, live counter genuinely dramatize "an audit happening," exactly what a templated AI-SaaS page would skip for a static screenshot.
2. **Headline typography** — oversized, tight-tracked Sora display type gives the hero real editorial confidence, distinct from default-Inter hero text.
3. **Content-level credibility** — real statutes and real ruble ranges per check, not vague "we check compliance" copy.

## Priority Issues

**[P0] Two of three "Проверить сайт" CTAs are completely non-functional.** The header's `.nav-cta` and the mid-page CTA section's button have no `id`/click handler — verified live, zero response on click. For a Persuade page whose entire job is this one action, a silent dead button (especially the always-visible sticky header one) reads as the tool being broken. *Fix*: wire both to the same handler as `#scanButton`. *Command*: `/impeccable harden`

**[P0] Primary CTA sits below the fold at 1440×900.** Only the eyebrow and a clipped 4-line headline are visible on first paint on a standard laptop; the actual input+button is entirely below the fold. *Fix*: tighten hero vertical stacking (padding, h1 margins, mini-facts spacing) or shorten the headline. *Command*: `/impeccable layout`

**[P1] Severity color is decorative, not semantic.** `--rose` is declared but never used for escalation — every status pill and the risk-bar render the identical amber-copper gradient regardless of score, so the demo's own climax (76/Высокий → 92/Критично) produces zero color change. *Fix*: map rose/red to нарушение/критично, amber to риск, teal/green to ok. *Command*: `/impeccable colorize`

**[P1] The 9 checks are duplicated verbatim, and 3 distinct content types share one card template.** Full list appears in both the radar panel and the grid; catalog, "Типичные ошибки" anecdotes, and stat callouts all render as identical `.check-card`s. Drives 4 of 8 cognitive-load-checklist failures. *Fix*: group by statute, give anecdotes distinct treatment, trim the hero panel to 3-4 rows. *Command*: `/impeccable distill` + `/impeccable layout`

**[P1] Ruble sign (₽) visibly clipped on fine-amount cards at mobile width (390px).** Reproduced via screenshot on cards 02-06; confirmed desktop-safe, mobile-specific — a webfont-kerning edge case at that exact flex width, not a gross overflow. This is the number the entire page exists to show. *Fix*: add small breathing room / reduce letter-spacing on `.check-meta strong` under the 640px breakpoint. *Command*: `/impeccable adapt`

**[P1] Mobile nav dropdown has no scrim and overlaps hero content when opened.** Reproduced via actual click (not a screenshot artifact) — the 94%-opaque panel sits directly over the hero, "БЕСПЛАТНЫЙ АУДИТ" badge and H1 bleed through underneath. *Fix*: add a backdrop/scrim behind the open panel, or push content down instead of overlaying. *Command*: `/impeccable adapt`

**[P2] No reassurance co-located with the worst-case reveal.** The demo's terminal state (92/КРИТИЧНО/НАРУШЕНИЕ) has nothing beside it but "Проверить другой сайт" — the page's one anxiety-defusing line and its actual next step live two sections and a scroll away. Peak-end rule mishandled for an audience defined by this exact anxiety. *Fix*: add a short reassuring line + visible next-step link directly under the risk-box in the done state. *Command*: `/impeccable clarify` + `/impeccable onboard`

**[P3] Header CTA wraps to two lines on mobile (390px).** Squeezed between hamburger and screen edge. *Fix*: shorten to "Проверить" under ~420px or hide on mobile. *Command*: `/impeccable adapt`

## Persona Red Flags

**Jordan (confused first-timer):** Sees a fully "finished-looking" demo panel before typing anything — nothing labels it as an example, so for a few seconds Jordan may read it as an already-completed result. Later clicks the mid-page "Проверить сайт →" — nothing happens, no error, no scroll-back. No way to know they did anything wrong.

**Riley (deliberate stress tester):** Types "asdf," submits — no validation, identical 6-second animation, identical ending (92/Критично). Reloads with a different nonsense string — gets the **identical** score sequence and identical verdict. Confirms in under a minute the "scan" is fully scripted and domain-independent, for a product whose entire pitch is credible risk assessment.

**Casey (distracted mobile user):** Header CTA text wrapped awkwardly may read as a rendering bug — and tapping it does nothing anyway, reinforcing "broken." Opens the hamburger menu and gets a scrim-less panel bleeding over the hero. If they tap "Смотреть пример" instead of entering their own domain, they get the exact same generic "critical" result — never seeing their own domain seemingly analyzed, the one thing that would actually hook them.

## Minor Observations

- Console 404 for `favicon.ico`.
- `<title>` leaks an internal dev label: "ШтрафКонтроль — signal system."
- Fine-range framing is inconsistent between the check catalog and the "Типичные ошибки" anecdotes for the same statute (card 01 states a full "от 30 000 до 60 000 ₽" range; its anecdote elsewhere states only one bound) — likely intentional narrative simplification for the anecdote, but worth a deliberate look rather than leaving as drift.
- "Смотреть пример" is functionally identical to the primary scan button (both call the same function) — a missed chance to make the secondary action meaningfully different.
- `signal://audit` / `signal://scan` / `signal://done` mixing English into an otherwise fully localized page was flagged by Assessment A — this one is already a deliberate, previously-confirmed decision this session (stylized URI-scheme flavor, explicitly kept), not new information.

## Questions to Consider

1. If a skeptical visitor scans two different fake domains and gets the identical "92, Критично" verdict both times, what happens to their trust in the one number this page is built around?
2. Three buttons say "Проверить сайт." If only one truly needs to exist, does the page still work as a persuasive flow with just that one, wired everywhere?
3. The radar/terminal metaphor visually says "security tool for engineers." Would a metaphor rooted in law/paperwork/inspection deliver the same "not another generic template" distinctiveness while actually matching what this audience fears?
