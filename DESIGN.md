---
name: Слеза Белый Сайт
description: Хостинг документов и виджета для соответствия 152-ФЗ/149-ФЗ — личный кабинет (React, frontend/app/app)
colors:
  ink: "#111110"
  ink-2: "#2a2825"
  warm: "#f4f1ec"
  paper: "#faf8f4"
  white: "#ffffff"
  brand: "#1f1fe6"
  brand-hover: "#1a1acc"
  brand-soft: "#5f5fff"
  brand-tint: "rgba(31,31,230,0.08)"
  ok: "#1a7a52"
  ok-tint: "rgba(26,122,82,0.10)"
  warn: "#b87900"
  warn-ink: "#8a5a00"
  warn-tint: "rgba(184,121,0,0.10)"
  danger: "#d63816"
  danger-tint: "rgba(214,56,22,0.10)"
  line: "#e8e4dd"
  line-2: "#dcd6cc"
  ink-muted: "rgba(17,17,16,0.60)"
typography:
  display:
    fontFamily: "Onest, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.045em"
  display-mobile:
    fontFamily: "Onest, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Onest, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "28px"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Onest, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "28px"
    letterSpacing: "-0.02em"
  body-lead:
    fontFamily: "Onest, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "24px"
  body:
    fontFamily: "Onest, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  caption:
    fontFamily: "Onest, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
  meta:
    fontFamily: "Onest, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  label:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: "16px"
    letterSpacing: "0.16em"
  label-domain:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: "10.5px"
    fontWeight: 400
    letterSpacing: "0.18em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "28px"
  3xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.white}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
    textColor: "{colors.white}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 24px"
    height: "48px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "12px 12px"
  icon-action:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    size: "36px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lead}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "52px"
  tile:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "16px"
  tile-selected:
    backgroundColor: "{colors.brand-tint}"
    textColor: "{colors.ink}"
  segmented:
    backgroundColor: "{colors.warm}"
    rounded: "{rounded.lg}"
    padding: "4px"
  segmented-active:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.white}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.xl}"
    padding: "24px"
  table-head:
    backgroundColor: "{colors.warm}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    padding: "12px 24px"
  badge-ok:
    backgroundColor: "{colors.ok-tint}"
    textColor: "{colors.ok}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  badge-warn:
    backgroundColor: "{colors.warn-tint}"
    textColor: "{colors.warn-ink}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  badge-danger:
    backgroundColor: "{colors.danger-tint}"
    textColor: "{colors.danger}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  badge-info:
    backgroundColor: "{colors.brand-tint}"
    textColor: "{colors.brand}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  nav-item-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body}"
    padding: "4px 0 12px"
  tab-active:
    textColor: "{colors.ink}"
---

# Design System: Слеза Белый Сайт

## Overview

**Creative North Star: "The Notary's Desk"**

The cabinet reads like a well-run notary's desk, not a startup dashboard: warm paper under everything, near-black ink for the words, and one blue that always means "your next move." The person using it is a small-business owner who came to get their paperwork in order and leave. Every screen answers two questions in this order: where am I (ink), and what do I do now (blue). Nothing else on the page is allowed to compete with that.

Density is calm, not cramped: 14–15px working text, 16px cards with 24–28px padding, one column of content capped at 896–1024px next to a 270px sidebar. Copy is short by rule, not by taste. The owner reads each screen as a new client, and a hint line under a question, a caption inside a choice tile or a status that repeats on every row is treated as noise to delete, not decoration to style. Data the client must check against their own records (domains, codes, law references, a pasted snippet) switches to JetBrains Mono, the way a typed-in value stands apart from the printed form.

Depth is paper, not glass. Cards sit one soft hairline shadow above the warm desk. Real shadows appear only on things that float: menus and the mobile sheets that open above the bottom bar. Confirmed rejections: no gradients, no blur, no colored section backgrounds, no second accent hue. This is a compliance product; the interface should look as though it takes the law seriously.

**Key Characteristics:**
- Warm desk canvas (`#f4f1ec`), white sheets on it, near-black ink text
- Blue (`#1f1fe6`) marks the next action and the current choice; ink marks where you are
- One filled blue button per view; everything else is a white or text button
- Soft rounding by role: 8px icon buttons, 12px controls, 16px cards, pills for statuses
- Monospace only for data to verify and for small caps labels, never for prose or money
- Status in a closed set of green / amber / red tints, plus a blue tint for "info" states such as the trial

## Colors

Three warm neutrals do almost all the work; blue is spent on action and choice; the three status colors appear only as tinted pills or bordered notices.

### Primary
- **Seal Blue** (`#1f1fe6`, hover `#1a1acc`): the single accent. It fills the primary button, the selected segment, the selected tile's check marker, required-field stars, the «Зачем это нужно» toggle, text links and the focus ring (`ring-2 ring-brand ring-offset-2`). Its 8% tint (`brand-tint`) backs icon tiles next to headings, the selected tile and the "info" badge.

**The Next-Move Rule.** A screen has exactly one filled blue button: the thing we want the person to do now. A second action on the same screen is a white button with a hairline border or a text button. If two blue fills compete, one of them is wrong.

### Neutral
- **Ink** (`#111110`): headings and body text; also the fill of the active navigation item (desktop sidebar and mobile tab bar). Ink says "you are here", never "click me."
- **Soft Ink** (`#2a2825`): field labels (13px bold) where full Ink is too heavy.
- **Muted Ink** (Ink at 60%): secondary copy, meta lines, table-head labels, inactive nav items, icon buttons at rest. It is also the floor: readable text never goes below 60% (4.5:1 on Sheet and on Desk). Lower alphas (35–40%) are for placeholders and decorative icons only.
- **Desk** (`#f4f1ec`, Tailwind `warm`): the page background behind every screen; also the fill of the «Зачем» panel, segmented track, table-head band (at 70%) and row hover (at 60%).
- **Filed Paper** (`#faf8f4`, `paper`): rare. Only a few legacy surfaces (the old drawer); new screens should not reach for it.
- **Sheet** (`#ffffff`): cards, tables, inputs, tiles, modals and the sidebar.
- **Hairline** (`#e8e4dd`, `line`) / **Crease** (`#dcd6cc`, `line-2`): Hairline is every border and row divider at rest; Crease is the hover border of inputs and tiles and the border of the unchecked check marker.

### Status (never decorative)
- **Ledger Green** (`#1a7a52`): working, paid, done.
- **Amber Caution** (`#b87900` for fills, borders and dots; **Amber Ink** `#8a5a00`, `warn-ink`, for text): needs attention soon (the last day of the trial, auto-renew off, money short for a debit within a month, a field to review). Amber text is always `warn-ink`: `#b87900` as text on its tint was 3.2:1. Also the yellow edit frame (`border-warn/40 bg-warn/[0.06]`) around a found-by-INN card being changed.
- **Rust Alert** (`#d63816`): blocked, overdue, field error, destructive confirmation.

**The Near-Term Warning Rule.** Amber means "act soon", so it is spent only on what needs action within about a month (the `SOON` threshold in «Подписка»). A trial is good news and stays blue until its last day; a balance short for a debit a year away is not a warning at all.

**The Tint-Not-Fill Rule.** A status color is shown as text on its own 10% tint (pill or notice), never as a solid fill behind white text. The only solid fills in the system are blue (action/choice) and ink (you are here).

## Typography

**Body Font:** Onest (with system-ui, -apple-system, 'Segoe UI', sans-serif), loaded via next/font as `--font-onest`
**Label/Mono Font:** JetBrains Mono (with ui-monospace, Menlo, monospace), `--font-jetbrains-mono`

**Character:** Onest is a friendly, slightly geometric grotesque that stays legible at 12–14px in Cyrillic; tight negative tracking on headings gives it the weight of a letterhead. JetBrains Mono appears small and uppercase-spaced, like the typed fields on a form.

### Hierarchy
- **Display** (700, 28px mobile / 36px from `sm`, tracking −0.045em): the one H1 per screen («Обзор», «Подписка», «Документы»).
- **Headline** (700, 20px, tracking −0.02em): a question in the anketa (`SectionHead`). The question itself is the heading; no hint line under it.
- **Title** (700, 18px, tracking −0.02em): card titles, block heads with an icon tile (`BlockHead`), modal titles.
- **Body lead** (400, 15px / 24px): the lead paragraph under an H1 (capped at `max-w-2xl`), input text.
- **Body** (600–700, 14px / 20px): buttons, nav items, tile titles, row titles in tables.
- **Caption** (400, 13px / 20px): secondary copy, «Зачем» panel text, field labels (at 700 in Soft Ink).
- **Meta** (400, 11–12px): dates, versions and errors under a row or field; error text is 12px semibold danger.
- **Label** (JetBrains Mono 10px, uppercase, tracking 0.16em, Muted Ink): table heads. The sidebar's domain label uses 10.5px at tracking 0.18em.

**The Data-Goes-Mono Rule.** Domains, registry numbers, law references next to a document title (`152-ФЗ`), the installation snippet and the share link render in JetBrains Mono; so do the small caps labels over tables. Prose, headings, button labels and money never do: the balance is a 28px Onest bold figure, not a code.

**The Named-Scale Rule.** Sizes come from the scale above (10, 10.5, 11, 12, 13, 14, 15, 18, 20, 28, 36px). Half-pixel sizes (12.5, 13.5, 14.5px) are legacy drift in older screens, not options for new work.

## Layout

Every cabinet screen, including the anketa, uses one chrome: a white sidebar at 270px on the left (sticky, full height, hairline right border) and the content column on the warm desk. The content column has side padding 20 / 40 / 56 / 80px across `base` / `sm` / `lg` / `xl` breakpoints and is capped per screen: `max-w-4xl` (896px) for «Подписка», `max-w-5xl` (1024px) for «Обзор» and «Документы», 1000px for anketa steps.

- **Below `lg` (1024px)** the sidebar collapses to a top strip with the logo and the account avatar, and navigation moves to a fixed bottom tab bar (ink pill marks the active tab). In the anketa the tab bar is replaced by a funnel bar (step progress and «Назад»); its step list opens as a floating sheet above it.
- **Tables** (documents, sites in the subscription) are CSS grids with fixed column templates from `sm` up; below `sm` each row restacks into a card with the actions indented under the title (`pl-[52px]`, aligned past the 40px icon tile).
- **Choice tiles** always sit in two columns from `sm` up, so edges line up from block to block.
- **Vertical rhythm:** 16px between fields, 24–28px card padding, 40px between major sections, one H1 header block with a 12px gap to the lead.

**The One-Chrome Rule.** The anketa and the cabinet share the same sidebar, tab bar and focus language. A step of the anketa must look like part of the product, not a wizard bolted onto it. Step numbering is continuous within the funnel (a second site skips «Ваш профиль», so its funnel has 5 steps, numbered 1–5).

## Elevation & Depth

Paper on a desk: in-flow surfaces carry one almost invisible shadow (`shadow-sm`, `0 1px 2px rgba(0,0,0,.05)`) plus a Hairline border. That shadow separates a white sheet from the warm desk; it never signals importance. Things that float over the page get a real, directional shadow.

### Shadow Vocabulary
- **Sheet** (`0 1px 2px 0 rgba(0,0,0,0.05)`): cards, tables, inputs, filled and white buttons, the modal panel.
- **Menu** (`0 18px 40px -18px rgba(17,17,16,0.35)`): dropdowns such as the row «⋯» menu and the account menu.
- **Floating sheet** (Tailwind `shadow-xl`): the mobile sheets that open above the bottom bar (the anketa step list, the «Ещё» menu).

**The Float-Only Rule.** A deeper shadow is earned only by leaving the page flow (menu, sheet, sticky bar). A card never gets a bigger shadow to look more important; if it needs emphasis, it gets a colored border (blue selected tile, amber edit frame) instead. Modals use a 45% ink scrim, not a heavier panel shadow. One known exception predates this rule: the clickable site cards and the empty state in «Мои сайты» (`shadow-[0_18px_50px_-32px_rgba(17,17,16,0.35)]`, lifting 2px on hover). Don't copy it to other screens.

## Shapes

Soft, consistent rounding sized to the element's job:
- **6px** (`rounded-md`): the 20px square check marker in tiles, icon-button tooltips.
- **8px** (`rounded-lg`): 36px icon buttons, segmented thumbs, compact controls.
- **12px** (`rounded-xl`): buttons, inputs, tiles, notices, «Зачем» panels, nav items, menus, the 40px icon tile beside a heading.
- **16px** (`rounded-2xl`): cards, tables, modals, the mobile floating sheets.
- **Pill** (`rounded-full`): status badges, avatars, mobile tab highlights.

**The Square-Check Rule.** Every choice tile uses the same square check marker, single-choice included; the radio semantics live in `role="radio"`, not in the shape. A round marker next to square ones reads as an inconsistency (owner decision 23.09).

## Components

### Buttons
Confident and few.
- **Shape:** 12px radius, 48px tall (h-12), 20–24px horizontal padding, 14px bold.
- **Primary:** Seal Blue fill, white text, sheet shadow; hover darkens to `#1a1acc`. One per view.
- **Secondary:** white fill, Hairline border, Ink text, sheet shadow; hover moves the border to Crease (or to blue with blue text, where the secondary action is itself a next step).
- **Text:** no fill, Muted Ink semibold; hover to Ink. «Отмена», «Назад», low-emphasis actions.
- **Icon action** (`IconAction`): 36px square, 8px radius, Muted Ink icon at 17px; hover warms the background and turns the icon blue. Always has `aria-label` and a small ink tooltip; a disabled one explains why in the tooltip.
- **Focus (all):** `ring-2 ring-brand ring-offset-2`, outline removed. The earlier `ring-4 ring-brand/15` was about 1.3:1 and invisible on nav items and links; a focus ring must stay visible (3:1 or more).

### Status Badges
- **Style:** pill, 11px bold, 6px × 12px padding, status color on its 10% tint (`ok`, `warn` with `warn-ink` text, `danger`), `info` in blue on brand tint (trial), `beige` neutral on Desk with an inset Hairline ring, `muted` on Desk.
- **Rule:** a badge column exists only when statuses differ between rows. If every row would say «Готово», drop the column (`withStatus={false}`).

### Cards / Containers
- **Corner:** 16px. **Background:** Sheet. **Border:** 1px Hairline. **Shadow:** Sheet.
- **Padding:** 24px, 28px from `sm`.
- **Overview card:** title (18px bold), key–value rows, and a footer link pinned to the bottom with `mt-auto` behind a Hairline divider, so cards in one row align.
- **Notices:** 12px radius; neutral on Desk, attention as `warn-ink` text on amber tint, the found-by-INN edit frame as an amber 40% border over a 6% amber fill with a real blue «Готово» button.
- **Status banner (Обзор):** one per site, full width, 16px radius, tone = state: `info` (blue on 4% brand tint) for a running trial, `warn` on its last day and for auto-renew off, `danger` for an expired trial, `ok` for paid and current, `muted` for code not installed. Title 14px bold in the tone color with an icon, body 14px at 60% ink, the state's one action as the primary button on the right.

### Inputs / Fields
- **Style:** 52px tall, 12px radius, Sheet fill, Hairline border, sheet shadow, 15px medium text, placeholder at 35% ink.
- **Label:** 13px bold Soft Ink above the field; required star in blue.
- **Focus:** border turns blue plus `ring-4 ring-brand/10` (the blue 1px border carries the contrast). Hover: border to Crease.
- **Error:** danger border plus 12px semibold danger text under the field (`role="alert"`, so a screen reader announces it). Color is never the only signal.
- **Phone:** one mask everywhere (`PhoneField`): «+7 » inserted on focus, formatted, capped at 11 digits.

### Choice Tile (`Tile`)
- **Style:** 12px radius, Sheet, Hairline border, 16px padding, min-height 58px (compact) or 78px. Title only, no caption.
- **Selected:** blue border, brand 5% fill, `ring-2 ring-brand/10`, square marker filled blue with a white check.
- **Hover:** Crease border, Desk fill.

### Segmented Control (`Segmented`)
- Desk track with 4px padding and 12px radius; a blue thumb (8px radius, sheet shadow) slides under the chosen option with a 300ms transition. Options are 14px bold, unselected at 80% ink (not faded: an answer is still expected). With no value chosen, no thumb is shown. The client makes the choice; we never preselect.

### Tabs (step 6 «Кто поставит код?»)
- For switching between two views of the same task, not for answers: 14px bold labels, 28px apart, over a Hairline rule; the active tab is Ink with a 2px Ink underline (where you are), inactive at 60% ink. One tab is always open. Arrow keys move between tabs (`role="tablist"`/`tab`/`tabpanel`).

**The Answer-or-View Rule.** A Segmented control asks for an answer that ends up in the documents, so it starts empty and fills blue when chosen. Tabs switch what you see, so one is always open and they never fill. If a choice changes nothing but the view, it's tabs.

### Data Table (`DocRowList`, sites in «Подписка»)
- One 16px-radius white container; a Desk-70% head band with Label typography; rows 16px × 24px with Hairline dividers and a Desk-60% hover.
- Each row leads with a 40px blue-tint icon tile. The row title is itself the link (blue on hover, underlined), so no separate «Открыть» button is needed.
- Row actions: at most one icon action inline; anything more goes into a «⋯» menu (Menu shadow, 12px radius, closes on Escape and outside click). Repeated icon actions get a full spoken name (`name` prop: «Скопировать ссылку на «Политика…»»), while the tooltip stays short.

### Section Heads (`SectionHead`, `BlockHead`) and «Зачем это нужно»
- A question or block title with a small blue «ⓘ Зачем это нужно» toggle: on the right from `sm`, always directly under the heading on phones (next to it, it broke short headings onto two lines, and «sometimes right, sometimes below» read as inconsistency). The explanation opens under the heading in a Desk panel (12px radius, 13px Muted Ink), one short sentence of fact. The toggle keeps a 24px tall hit area.

### Navigation
- **Sidebar items:** 12px radius, 16px × 12px padding, 14px, 17px icon. **Active:** Ink fill, white bold text. **Inactive:** Muted Ink semibold; hover to Desk fill and Ink text.
- **Sidebar domain label:** mono 10.5px uppercase above the site's section list; «← Мои сайты» as a text link above it.
- **Mobile tab bar:** fixed bottom, 11px semibold labels, active icon on an ink pill (48 × 32px).

### Modal
- 45% ink scrim, panel 480–560px wide, 16px radius, Sheet, 24–28px padding, 18px bold title with a close icon, actions bottom-left: primary blue button, then a text «Отмена».
- Behavior through `useDialog` (`site/_shared/SiteChrome.js`): focus moves into the dialog on open, Tab cycles inside it, Escape closes it, and focus returns to the control that opened it. Multi-step dialogs pass their step so focus lands back in the dialog after a step changes.

## Do's and Don'ts

### Do:
- **Do** keep exactly one filled blue button per view and make it the next step (**The Next-Move Rule**).
- **Do** mark "you are here" in Ink (active nav item, active tab) and "your choice" in blue (selected tile, segment).
- **Do** show status as colored text on its own 10% tint, in a pill or a notice (**The Tint-Not-Fill Rule**).
- **Do** use the square check marker on every choice tile, single-choice included (**The Square-Check Rule**).
- **Do** put tiles in two columns from `sm` up and align card footers with `mt-auto`, so edges line up across blocks.
- **Do** render domains, codes, law references and the install snippet in JetBrains Mono; keep money and prose in Onest.
- **Do** turn a document or site title into the link itself instead of adding an «Открыть» button.
- **Do** use tabs (Ink underline) to switch views and Segmented (blue fill) only for answers (**The Answer-or-View Rule**).
- **Do** keep readable text at 60% ink or darker, and amber text in `warn-ink`.

### Don't:
- **Don't** put a hint line under a question heading or a caption inside a choice tile; if the heading is unclear without it, rewrite the heading.
- **Don't** show a status column where every row has the same status; drop the column.
- **Don't** add a second filled blue button, a blue section background, a gradient or a blur.
- **Don't** give an in-flow card a heavier shadow for emphasis; use a colored border (blue selected, amber edit) instead.
- **Don't** use solid green, amber or red fills behind white text.
- **Don't** introduce half-pixel font sizes or new radii outside 6 / 8 / 12 / 16px and pill.
- **Don't** reach for Filed Paper (`#faf8f4`) on new screens; the page is Desk, content is Sheet.
- **Don't** preselect an answer in the anketa, including a segmented control; the client chooses.
- **Don't** warn about something more than a month away, or paint a running trial amber before its last day (**The Near-Term Warning Rule**).
