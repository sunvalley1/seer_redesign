---
name: Opportunity Markets
description: Seer Night Shell — seerrebrand purple-night identity with Opportunity Markets as the product line
colors:
  wall: "#0A0814"
  plaque: "#110d1c"
  plaque-edge: "#1e1830"
  paper: "#ECE8F5"
  muted: "#8B83A3"
  brand: "#520078"
  up: "#A774D1"
  down: "#ea3943"
  edge: "rgba(167, 116, 209, 0.12)"
  edge-strong: "rgba(167, 116, 209, 0.25)"
typography:
  display:
    fontFamily: "Urbanist, system-ui, sans-serif"
    fontSize: "clamp(3rem, 7vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.04em"
  lead:
    fontFamily: "Urbanist, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2.2vw, 1.5rem)"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  section:
    fontFamily: "Urbanist, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 3vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Urbanist, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Urbanist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Urbanist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
rounded:
  panel: "8px"
  control: "6px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.up}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  filter-selected:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.wall}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  filter-idle:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  lot-panel:
    backgroundColor: "{colors.plaque}"
    textColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "24px"
  status-chip:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "4px 10px"
---

# Design System: Opportunity Markets

## Overview

**Creative North Star: "Seer Night Shell"**

A Seer-branded purple-night shell (aligned to seerrebrand.com) where Opportunity Markets is the product line. Deep `#0A0814` ground, elevated `#110d1c` plaques, Seer mark in header and footer, brand purple `#520078` for primary actions, lavender `#A774D1` for rising odds and focus. Composition stays Equal Stack: Seer chrome, product proof, then full-width stacked lots.

Density stays deliberate. Home opens with a centered persuasion hero and protocol roadmap, then Equal Stack pilot lots; market detail opens one active lot with outcomes, price history, and a sticky trade plaque. Motion is sparse and meaningful: a short entrance on the hero lead, a bid-tick when odds move.

**Key Characteristics:**
- Seer logo + Opportunity Markets product label in the shell
- Purple-night wall with elevated plaque lots
- Equal hero lots (not a dense card grid)
- Urbanist for UI + JetBrains Mono for odds
- Soft-square plaques and controls (tight radius, no pills)
- Lavender up / red down as the live board language; brand purple for primary CTAs

## Colors

Purple-night Seer shell with plaque elevation and signal motion.

### Primary
- **Brand** (#520078): Primary CTAs (Connect Wallet, decisive actions). Matches seerrebrand Submit.
- **Up** (#A774D1): Rising odds, hero accent, focus rings, positive bar segments, hover wash on Brand.
- **Down** (#ea3943): Falling odds and negative bar segments. Pair with Up as a motion pair — never as brand chrome alone.

### Neutral
- **Wall** (#0A0814): Page ground and sticky header wash.
- **Plaque** (#110d1c): Lot panels, filter shells, outcome lists, trade surfaces.
- **Plaque Edge** (#1e1830): Reserved edge tone when a harder divider than Edge is needed.
- **Paper** (#ECE8F5): Primary text.
- **Muted** (#8B83A3): Supporting copy, meta labels, idle filter text.
- **Edge** / **Edge Strong**: Purple hairlines (`rgba(167, 116, 209, 0.12/0.25)`).

### Named Rules
**The Bid Motion Rule.** Lavender and red mark real odds direction and outcome share. Brand purple is for decisive chrome (primary buttons), not decorative fills.

**The Wall/Plaque Rule.** Content sits on Plaque; the page is Wall. Do not invert that stack into light-mode cards on dark chrome.

**The Seer Shell Rule.** Header and footer lead with the Seer mark; Opportunity Markets is the product line label beside or under it.

## Typography

**Display Font:** Urbanist (with system-ui)
**Body Font:** Urbanist (with system-ui)
**Odds / Data Font:** JetBrains Mono (with ui-monospace)

**Character:** Urbanist carries the Seer contest-site voice for brand and UI. JetBrains Mono is the ticker — odds and measured liquidity only.

### Hierarchy
- **Display** (600, clamp 3rem–4.5rem, line-height 1.05): Home hero headline.
- **Lead** (400, clamp 1.25rem–1.5rem): Hero supporting sentence under the display line.
- **Section** (600, clamp ~1.875rem–2.25rem): Protocol and pilot section headings.
- **Title** (600, ~1.25rem–1.85rem clamp on lots): Lot headings and detail section titles (Outcomes).
- **Body** (400, 1rem–1.125rem, relaxed): Paragraphs, UI copy, hero step chips, empty states.
- **Label** (600, 0.75rem, uppercase, 0.08em tracking): Status chips, section kickers, meta rows, primary button text.
- **Mono** (600, ~1.125rem–1.875rem tabular): Leading odds and liquidity figures.

### Named Rules
**The Ticker Rule.** Mono is for numbers that move or measure. Do not set marketing sentences in JetBrains Mono.

## Layout

Shell max width 1350px (`max-w-shell`) with horizontal padding 24px / 40px at large breakpoints. Home rhythm: proof row → ~40px gap → Equal Stack of full-width lots with ~20px gutters. Market detail: 8/4 column grid at large screens — narrative + outcomes left, sticky trade plaque right (`top-24` under the sticky header). Vertical density prefers roomy plaque padding (24–32px) over cramped dashboards.

### Named Rules
**The Equal Lot Rule.** Featured opportunities share the same full-width plaque treatment. Do not promote one market into an inset hero card while demoting others to a dense grid.

## Elevation & Depth

Plaque lift: lots rise from the wall with a soft structural shadow and a hairline paper border — not glass mist, not multi-layer glow. Sticky header uses a translucent wall wash plus light blur so lots can scroll underneath without competing chrome.

### Shadow Vocabulary
- **Lot** (`box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35)`): Default lift under `.lot-panel`; strengthens slightly on lot hover with an up-tinted border.
- **Panel** (`box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45)`): Reserved deeper lift when a surface must sit above the lot plane.

### Named Rules
**The No Mist Rule.** Depth is border + shadow on opaque plaque. Do not revive frost glass, shader mist, or heavy backdrop blur on content panels.

## Shapes

Soft-square language throughout: panels at 8px, controls at 6px. Status chips, filter segments, and primary buttons share the control radius. Outcome share bars and probability tracks use the same soft-square clip. Never pill-shaped (`rounded-full`) controls.

### Named Rules
**The Soft-Square Rule.** If a control looks like a capsule, it is wrong for this system.

## Components

### Buttons
- **Shape:** Soft-square (6px)
- **Primary:** Brand fill, Paper text, uppercase label tracking; hover fills Up. Used for Connect Wallet, Retry, and decisive actions.
- **Secondary / Ghost:** Transparent with Edge border, Paper text; hover border shifts toward Up/40.
- **Focus:** 2px Up outline, 2px offset on all interactive controls.

### Chips / Filters
- **Filter shell:** Plaque background, paper/15 border, 4px inset padding holding segmented soft-square buttons.
- **Selected:** Paper fill, Wall text.
- **Idle:** Transparent, Muted text; hover to Paper text.
- **Status chip:** Hairline paper/15 border, Muted uppercase label (Active / Closed). Market type on detail can invert to Paper fill / Wall text for hierarchy.

### Cards / Containers (Lot Panel)
- **Corner Style:** Panel radius (8px)
- **Background:** Plaque
- **Shadow Strategy:** Lot shadow (see Elevation)
- **Border:** 1px Edge; hover may tint toward Up/40
- **Internal Padding:** 24px default; 32px on larger lot previews

### Inputs / Fields
- Trade inputs live inside the trade plaque (SwapWidget). Match plaque ground, soft-square controls, Paper/Muted text, and Up focus — no light-mode form islands.

### Navigation
- Sticky header on Wall/90 with Edge bottom rule. Seer mark + “Seer” + Beta pill left; section links (The protocol, The pilot) and Brand-filled pill Connect wallet on the right. Footer repeats the Seer logo and Opportunity Markets blurb.

### Lot Preview (signature)
Full-width Equal Stack plaque: status + liquidity meta, Urbanist title, segmented outcome strip (Up/Down tones), then leading odds in mono with optional Up/Down tick label. Hover lifts border toward Up and title toward Up.

### Outcome List (signature)
Single lot-panel with divided rows: mono index, Urbanist outcome name, mono odds with bid-tick, thin probability track. Held positions wash the row with Up/5.

## Do's and Don'ts

### Do:
- **Do** lead chrome with the Seer mark and Beta; keep Opportunity Markets as the product line in prose and footer.
- **Do** keep Opportunity Markets product copy and Seer browse/trade flows intact.
- **Do** give each pilot market equal presence in the stack.
- **Do** use lavender/red for real odds motion; Brand purple for primary CTAs.
- **Do** keep lot panels soft-square (8px); header Connect wallet and home CTAs may use pill radii to match the marketing open.

### Don't:
- **Don't** present Opportunity Markets as a competing standalone brand without Seer chrome.
- **Don't** revive Dusk Shader Mist, frost glass, or misty blur panels as the world.
- **Don't** ship a dense many-card catalog grid as the home default.
- **Don't** add submit-proposal CTAs on marketing or browse surfaces.
- **Don't** use Paradigm scout/talent framing; sponsor is fine when it means who launches or resolves a market.
- **Don't** use neon glow or crypto-HUD chrome on lot panels.
