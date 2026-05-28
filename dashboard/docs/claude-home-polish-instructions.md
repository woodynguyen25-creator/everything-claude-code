# Claude → Codex: Home Polish + Sidebar Council Expansion

**Date:** 2026-05-18
**Author:** Claude (design / UX / IA lead)
**Status:** Final polish pass on v1 home + sidebar before Slice 4 (Ravens). All decisions locked through 5 ideation waves with Woody.

---

## Context

Slice 3.5 is functionally complete. The dashboard is healthy, the Doctor/Tasks contract migration shipped, all routes return 200, polish items landed. Now:

1. **The Council expands.** All 5 agents (Lebot James, Thor, Perseus, Fenrir, Sauron) become first-class citizens in the left sidebar — the pantheon is always visible.
2. **The home page gets a beauty pass.** Atmospheric motion, scene-wired backgrounds, refined entrance animation, tactile hover/click feedback.
3. **The `/skills` page gets a simple Yggdrasil treatment.** No commissioned art — reuse the existing Midjourney night-scene asset and overlay clickable hotspots.

This whole batch ships as **Slice 3.6 (Home Polish)** — a single atomic PR. Slice 4 (Ravens) starts after this lands.

Read first:
1. `dashboard/DESIGN-LANGUAGE.md` — authoritative spec (will be updated alongside this slice)
2. `dashboard/docs/claude-critique-slice-3.md` — previous Slice 3 acceptance + polish list
3. `dashboard/docs/claude-slice-3-5-instructions.md` — Slice 3.5 instructions (already implemented)
4. This doc — Slice 3.6 marching orders

---

## Part A — Sidebar Council Expansion

### A1. Brand block upgrade (top-left of sidebar)

**Current state:** Plain text `AIOS / OPERATOR` stack in `components/Sidebar.tsx`.

**Locked new state:**
- Small Vegvísir SVG sigil (32px × 32px, gold, simplified version of the SessionGlyph rune)
- `WOODY'S REALM` in Cinzel tracked 0.2em uppercase, gold-tinted
- `Operator · {today's date}` in Inter mono small (live date, computed from `getModeContext()`)

**Layout sketch:**
```
┌─────────────────────────┐
│ ⚜ WOODY'S REALM         │
│   Operator · May 18     │
├─────────────────────────┤
│ ...                     │
```

**Implementation hints:**
- The Vegvísir SVG can be extracted from `components/SessionGlyph.tsx` (the 8-arm rune element). Make it a small inline SVG component, e.g. `components/VegvisirSigil.tsx`, exported with a `size` prop so it can be reused (32px in sidebar brand, larger in SessionGlyph).
- Date fetch can be server-side via the existing `getModeContext()` in `lib/mode.ts`. Sidebar will need to become a server component OR pass the date as a prop from the layout.

### A2. Section header rename

`AGENTS` → `COUNCIL`. One-line edit.

### A3. Council card layout (Option B — portraits + status dots)

**5 agents, in this order, each with their own card:**

| # | Codename | Persona | Accent | Route | Sigil placeholder (until art lands) |
|---|---|---|---|---|---|
| 1 | AIOS-AGENT | Lebot James · All-Father | `rune-gold` | `/lebot-james` | 👑 |
| 2 | THOR-AGENT | Thor · Thunder | `bifrost` (electric blue) | `/thor` | ⚡ |
| 3 | PERSEUS-AGENT | Perseus · Prince of Parleys | `perseus-emerald` (new token — `oklch(60% 0.14 155)`) | `/perseus` | 💰 |
| 4 | FENRIR-AGENT | Fenrir · Wolf of the Forge | `blood` | `/fenrir` | 🐺 |
| 5 | SAURON-AGENT | Sauron · All-Seeing Eye | `sauron-fire` (new token — `oklch(60% 0.22 35)`) | `/sauron` | 👁 |

**Per-card anatomy:**
```
┌──────────────────────────────┐
│ [40px square portrait slot] CODENAME     ● │  ← status dot top-right
│                              Persona name  │
└──────────────────────────────┘
  ↑ accent-color left-border (2px idle, 4px active)
```

- **Portrait slot:** 40×40px square on the left. For v1, render the emoji-sigil centered in a `bg-bg-raised` rounded square. When real Midjourney portraits land at `dashboard/public/art/agents/sigils/{slug}.png`, swap to `<Image>` automatically (check file existence at build time, fall back to emoji).
- **Right side:** codename (Inter `text-xs` uppercase tracked, accent-colored) on top, persona name (Inter `text-[11px]` text-muted) below.
- **Status dot:** small 8px circle, top-right of card, color determined by per-agent logic (see A4).
- **Card padding:** 12px all sides. Total card height ~64px.
- **Spacing between cards:** 8px (`space-y-2`).
- **Total Council vertical space:** ~360px (5 cards × 64px + 4 gaps × 8px + section header ~20px).

### A4. Status dot logic (per-agent, wired to real data)

Each agent's dot reflects current state. Compute server-side, pass as prop into each card.

| Agent | Dot state logic |
|---|---|
| **Lebot James** | `bifrost` solid when active (home or his page open) · `iron` (gray) otherwise |
| **Thor** | `bifrost` solid during NYSE regular hours (Mon-Fri 9:30am-4pm ET) · `ember` during extended hours · `iron` when market closed |
| **Perseus** | `bifrost` solid when ParlayBot has a fresh slate (latest slate timestamp < 12h ago) · `iron` otherwise |
| **Fenrir** | `iron` for v1 (no Lucky Dog activity detector yet) · upgrade in v2 to detect recent commits in `lucky-dog-landing` repo |
| **Sauron** | `iron` for v1 (no watch system yet) · upgrade in v2 when Sauron's watch feature lands |

**Active-route override:** if the user is currently viewing that agent's page (e.g. on `/thor`), the dot becomes `bifrost` and pulses gently (see A6).

### A5. Hover state

When mouse enters any Council card:
- Card scales to **1.02x** (200ms ease-out)
- Accent-color left-border **brightens** (e.g. `border-rune-gold` → `border-rune-gold/100` opacity bump)
- Background shifts from `bg-bg-raised` → `bg-bg-hover`
- Cursor becomes `pointer`
- Status dot **pulses gently** (2s ease-in-out, 0.7 → 1.0 opacity loop) while hovered

All transitions on `transition-all duration-200 ease-out`.

### A6. Active state (current route's card)

When `pathname` matches the card's `href`:
- Left-border thickens from 2px → 4px solid
- Background sits at `bg-bg-hover` (matches hover state)
- Status dot fully saturated (no opacity dimming) AND pulses gently with the 2s loop
- Codename text shifts from accent color to `text-text-primary` (slightly brighter)

### A7. Click feedback

On `mousedown` of a card:
- Scale momentarily to **0.98x** (~80ms)
- Brief accent-color flash on the card edge (a one-frame box-shadow burst)
- Route changes via Next.js `<Link>`
- Total click-to-route-start latency: ~150ms

### A8. Sidebar footer — Connections strip + localhost

**Locked new structure:**
- Replace the current single `localhost:3737` indicator with a **2-row footer block**:
  - **Row 1 (Connections):** 8 small MCP icons in a 2×4 grid (16px each, 8px gap)
  - **Row 2 (Localhost):** keep the existing `● localhost:3737` indicator below the grid

**The 8 MCPs to show (locked, in this order):**
1. GitHub
2. Playwright
3. ExA
4. Firecrawl
5. Context7
6. fal.ai
7. Obsidian
8. TradingView

**Per-icon:**
- 16×16px monochrome icon (use simple inline SVGs — happy to spec each in a follow-up)
- Hover shows MCP name as a tooltip
- Click is **inert** for v1 (no dedicated MCP panel yet) — just visual confirmation of what's wired up
- Subtle hover brightness shift only

---

## Part B — Home page polish

### B1. HeroBand background wired to Midjourney scenes

**Current state:** Gradient placeholders per mode (`from-rune-gold/18 via-bg-panel to-bg-deep` etc.)

**Locked new state:** Wire to actual Midjourney scene images when they exist; fall back to gradients when not.

**Implementation:**
```tsx
// pseudocode for HeroBand.tsx
const sceneMap = {
  dawn: '/art/scenes/dawn-asgard.webp',
  day: '/art/scenes/day-olympus.webp',
  dusk: '/art/scenes/dusk-mordor.webp',
  night: '/art/scenes/night-norse-stars.webp',
};

const sceneSrc = sceneMap[mode];
const sceneExists = await fileExists(`public${sceneSrc}`);

// In render:
{sceneExists ? (
  <Image
    src={sceneSrc}
    fill
    priority
    sizes="100vw"
    quality={85}
    className="object-cover opacity-90"
    alt=""
  />
) : (
  <div className={`absolute inset-0 bg-gradient-to-br ${modeGradient(mode)}`} />
)}
<div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-deep/30 to-bg-deep" />
{/* existing content */}
```

**Image processing:**
- Optimize each scene to WebP at quality 85
- Target file size: 200-400 KB each
- Total disk: ~1.2 MB for all 4 scenes
- Use `next/image` with `priority` flag on hero (it's above-the-fold)
- Add a dark gradient overlay (`bg-gradient-to-b from-transparent via-bg-deep/30 to-bg-deep`) so the hero text stays legible regardless of scene

**Storage location:** `dashboard/public/art/scenes/{slug}.webp`

### B2. Drifting warm embers across the home page

**New component:** `components/AmbientEmbers.tsx` — client component, renders a CSS-keyframe-animated div with ~20 small warm-orange dots drifting upward across the viewport in slow loops.

**Spec:**
- ~20 ember particles (each is a `div` with `position: absolute`, `width: 2-4px`, `border-radius: 50%`, background `bg-ember/40`)
- Each ember has a randomized starting x position, animation duration (15-25s), delay (0-10s)
- Animation: `translateY(100vh) → translateY(-20vh)` linear infinite loop, with slight horizontal drift (`translateX(±10px)` ease-in-out)
- `position: fixed; inset: 0; pointer-events: none; z-index: 1;` so embers float across the entire viewport but don't intercept clicks
- Respects `prefers-reduced-motion` — embers disappear when motion is reduced

**Where to mount:** in `app/layout.tsx` as a fixed overlay, OR only on `/` if we want them home-exclusive. Recommend: home-only for v1 (less ambient noise on the other pages).

### B3. SessionGlyph atmospheric upgrade

**Current state:** Vegvísir SVG with 12s outer-ring rotation + rune-glow.

**Locked additions:**
- Add a radial-gradient backdrop *inside* the SessionGlyph panel: `bg-[radial-gradient(circle_at_center,rgba(214,184,104,0.12),transparent_60%)]` (warm gold fading to void)
- Add a slow breath animation on the entire SVG: scale 1.0 → 1.02 → 1.0, 4s ease-in-out infinite
- Both effects respect `prefers-reduced-motion`

**Diff for `SessionGlyph.tsx`:**
- Add radial gradient div absolute-positioned beneath the SVG
- Wrap the existing SVG `<g>` in a parent with `motion-safe:animate-[breath_4s_ease-in-out_infinite]`
- Add `breath` keyframe to `tailwind.config.ts`

### B4. Page entrance — staggered fade-in

**On home page load** (`app/page.tsx`):
- HeroBand fades in first (opacity 0 → 1, 600ms ease-out, slides up 8px → 0)
- After 200ms delay, PulseStrip fades in (300ms, same slide)
- After 400ms delay, NextActionCard + SessionGlyph row fades in (300ms)
- After 600ms delay, TodaysWyrd fades in (300ms)
- After 800ms delay, DomainRow fades in (300ms)
- After 1000ms delay, ActivityStream fades in (300ms)
- Total entrance: ~1.4s

**Implementation hint:** add a `staggered-entry` utility class that uses `animation-delay` per section. Each section gets a `data-stagger-order` prop (1-6) that maps to the delay. CSS does the rest.

**Respects `prefers-reduced-motion`** — entrance is instant when motion is reduced.

### B5. Mode-shift transition

**Locked:** **Instant swap on refresh only.** No live cross-fade.

Implementation: `mode` is computed server-side at request time. When the user reloads the page, the new scene image renders. No JS-driven animation between modes during the session.

This is simpler than a live cross-fade AND it's correct UX — most operators don't keep the dashboard open across mode boundaries (you open it in the morning, close it, reopen in the evening). The cross-fade adds dev complexity for a moment users rarely see.

### B6. Welcome quote treatment

**Locked:** Stays as-is. Small italic Inter, `text-text-secondary`, beneath the date. Don't over-design.

---

## Part C — `/skills` Yggdrasil page (simple hotspot approach)

### C1. Architecture

**Background:** the NIGHT scene image (Yggdrasil under Norse stars, already in the Midjourney prompt bank as scene #9). Reuse the SAME image that drives the HeroBand at night mode.

**Overlay:** 9 absolutely-positioned `<Link>` hotspots over each branch of the Yggdrasil image. Each is a transparent rectangle/circle hit-region that:
- Hovers → shows a small floating preview card (realm name + 1-line status)
- Clicks → navigates to the realm's dedicated route

### C2. 9 Realm hotspots

For now, **placeholder coordinates** (Codex tweaks these once the Midjourney image lands and the actual tree shape is visible):

| Realm | Route | Approx position on image | Accent color |
|---|---|---|---|
| Asgard | `/asgard` (placeholder route — links back to `/` for now) | top center, branch tip | rune-gold |
| Vanaheim | `/vanaheim` (placeholder) | upper east | jade green |
| Midgard | `/midgard` (placeholder) | center | earthen amber |
| Niflheim | `/niflheim` (placeholder) | upper north | icy blue |
| Muspelheim | `/muspelheim` (placeholder) | south center | ember orange |
| Álfheim | `/alfheim` (placeholder) | high east | silver-white |
| Jötunheim | `/jotunheim` (placeholder) | west | slate red-grey |
| Svartálfaheim | `/svartalfaheim` (placeholder) | lower east | dim copper |
| Helheim | `/helheim` (placeholder) | far north | dim violet |

**For v1:** all realm routes can be 404 placeholder pages, OR can redirect to `/` with a `?realm=X` query. They become real pages in v2.

### C3. Hover preview card

Hover on hotspot → small floating div appears near cursor, showing:
- Realm name (Cinzel small, accent color)
- One-line status (Inter small, text-muted) — e.g. *"AIOS Doctor: healthy"* / *"Lucky Dog: paused"*

Card disappears on mouse-out. Standard tooltip pattern.

### C4. Small glowing health indicator dots

At each branch tip, a tiny 12px circle glows in the realm's accent color. Intensity (opacity) ties to that realm's health:
- Asgard glow intensity ∝ Doctor health (bright when ok, dim when crit)
- Midgard glow intensity ∝ trading freshness (bright when slate is fresh, dim when stale)
- etc.

For v1, these can all be static at 0.8 opacity (no live data wiring) — just decorative. Wire them up to real data in v2 if/when those realm pages are real.

### C5. Falback for when night scene isn't generated yet

When `dashboard/public/art/scenes/night-norse-stars.webp` doesn't exist, render a fallback layout: the 9 realms as a vertical list of clickable cards (similar to Sidebar Option C — grouped by lane). Codex can decide whether to ship this fallback or just leave `/skills` as a placeholder until the image arrives.

---

## Part D — Implementation tasks (rolled up)

### D1. Files to create

| File | Purpose |
|---|---|
| `components/VegvisirSigil.tsx` | Reusable Vegvísir SVG (32px sidebar, large in SessionGlyph) |
| `components/AmbientEmbers.tsx` | Drifting warm ember particles overlay |
| `components/AgentCard.tsx` | Single Council card (portrait + codename + persona + status dot) |
| `components/ConnectionsStrip.tsx` | 8 MCP icons in 2×4 grid + tooltip |
| `lib/agent-status.ts` | Per-agent status logic (returns dot color + active state) |
| `lib/scenes.ts` | Scene path resolver + file-exists check for mode-based image lookup |

### D2. Files to modify

| File | Change |
|---|---|
| `components/Sidebar.tsx` | Brand block upgrade, expand Council to 5 agents, footer with Connections strip |
| `components/HeroBand.tsx` | Wire to Midjourney scene images via `lib/scenes.ts`, add fallback to gradient |
| `components/SessionGlyph.tsx` | Add radial gradient backdrop + breath animation |
| `app/page.tsx` | Add staggered fade-in entrance animation, mount AmbientEmbers |
| `app/skills/page.tsx` | Replace placeholder with Yggdrasil image + hotspot overlay |
| `tailwind.config.ts` | Add `perseus-emerald` + `sauron-fire` color tokens, add `breath` keyframe |
| `app/globals.css` | Add staggered entrance utility classes, ember keyframe |

### D3. Files NOT to touch

- `dashboard/data/quotes.json` — Claude's curation, finalized
- `dashboard/personas/*.md` — Claude's persona specs, finalized
- `dashboard/DESIGN-LANGUAGE.md` — Claude updates this alongside this slice
- `dashboard/docs/RAVENS-DRAWER-SPEC.md` — Slice 4 spec, untouched

---

## Part E — Exit criteria

When Slice 3.6 ships, verify all of these:

- [ ] `npx tsc --noEmit` clean
- [ ] All 7 routes return 200 (`/`, `/lebot-james`, `/trading`, `/fenrir`, `/skills`, `/memory`, `/activity`)
- [ ] **Sidebar shows 5 agent cards** in order: Lebot, Thor, Perseus, Fenrir, Sauron
- [ ] Sidebar brand block reads `WOODY'S REALM` with Vegvísir sigil + live date
- [ ] Sidebar footer shows 8 MCP icons in 2×4 grid + localhost indicator below
- [ ] Section header reads `COUNCIL` (not `AGENTS`)
- [ ] Each agent card has portrait slot (emoji placeholder) + codename + persona + status dot
- [ ] Hovering an agent card scales it to 1.02x with accent glow
- [ ] Clicking an agent card briefly scales to 0.98x then navigates
- [ ] Active-route card has 4px border + bg-hover + pulsing dot
- [ ] HeroBand uses Midjourney scene image when present, gradient fallback when not
- [ ] Drifting embers float across the home page (respects reduced-motion)
- [ ] SessionGlyph has radial glow + 4s breath animation
- [ ] Home page entrance is staggered (HeroBand → PulseStrip → ... over ~1.4s)
- [ ] `/skills` renders the night scene + 9 hotspots (or the vertical-list fallback)
- [ ] Reduced-motion preference disables all keyframe animations cleanly
- [ ] No new console errors or warnings on any route

---

## Part F — Handoff protocol

When Slice 3.6 lands:
1. **Land one PR** (atomic, reviewable, ~10-15 files changed)
2. **Write `dashboard/docs/codex-slice-3-6-home-polish.md`** with:
   - What shipped
   - Screenshots (sidebar Council expanded, home with embers, SessionGlyph breathing, `/skills` with hotspots if image exists)
   - What's still mocked / falling back to placeholders (e.g. if Midjourney scenes aren't all rendered yet)
   - Any open questions for Claude
3. **Ping Woody to surface Claude back.** I'll critique at `dashboard/docs/claude-critique-slice-3-6.md` and direct Slice 4 (Ravens).

---

## Part G — What's deferred to Slice 4 (Ravens)

Don't build any of these in 3.6:
- Oracle Drawer (`⌘K`)
- Agent chat surfaces (`/lebot-james` etc. stay as stubs)
- Bell-icon notification history
- Telegram + Windows toast wiring
- Per-panel "Ask {agent}" buttons
- Per-agent click-signature animations (Thor → lightning, etc.) — v2 polish

---

## TL;DR for Codex

**Build:**
1. Sidebar Council expansion to 5 agents (Option B layout, brand block upgrade, footer Connections strip)
2. Home polish — Midjourney scene wiring, drifting embers, SessionGlyph breath, staggered entrance
3. `/skills` Yggdrasil image + 9 hotspots (or vertical-list fallback)

**Don't touch:**
- `data/quotes.json`, `personas/*.md`, `DESIGN-LANGUAGE.md`, `RAVENS-DRAWER-SPEC.md`

**Ship as one PR.** Slice 4 (Ravens) starts after.
