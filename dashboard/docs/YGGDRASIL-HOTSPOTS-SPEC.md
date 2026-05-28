# Yggdrasil Hotspots — `/skills` Page Spec

**Status:** Supersedes `YGGDRASIL-ILLUSTRATOR-BRIEF.md` (deleted). NO commission. Pure Midjourney image + CSS overlay approach.
**Date:** 2026-05-18
**Author:** Claude (design lead)
**Cost:** $0 (reuses existing Midjourney night scene)

---

## What changed from the original brief

The original plan was a $500+ commissioned vector SVG. That was overkill for a personal localhost dashboard.

**New approach:** reuse the NIGHT scene Midjourney image (Yggdrasil under Norse stars — already in the prompt bank as scene #9) as a static background, then overlay 9 transparent clickable hotspots over each branch via CSS.

Same visual impact at 95%. Zero marginal cost. ~2 hours of Codex work.

---

## How it works

```
┌─────────────────────────────────────────────┐
│ /skills page — Yggdrasil                    │
│                                             │
│   ┌─── Midjourney night scene image ────┐  │
│   │                                       │  │
│   │       ⚜ Asgard                       │  │
│   │      [hotspot — invisible]           │  │
│   │   /          \                       │  │
│   │  ◆ Vanaheim   ❄ Niflheim            │  │
│   │  [hotspot]    [hotspot]              │  │
│   │  |              |                    │  │
│   │  ✦ Midgard   🔥 Muspelheim          │  │
│   │       \   /                          │  │
│   │     [trunk]                          │  │
│   │                                      │  │
│   │   Hover branch → preview card        │  │
│   │   Click → navigate to realm          │  │
│   └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

- 1 background image (the night scene, `dashboard/public/art/scenes/night-norse-stars.webp`)
- 9 absolutely-positioned `<Link>` elements with transparent fill, sized + placed over each branch tip
- 9 small SVG circles (12px) at branch tips with realm accent colors — these are the visible "click here" indicators
- 1 floating preview card that slides in on hotspot hover
- Done

---

## The 9 realms

| # | Realm | Domain | Route (v1) | Accent color | Branch position (approx) |
|---|---|---|---|---|---|
| 1 | **Asgard** | AIOS | `/` (Lebot's territory) | `rune-gold` | top center |
| 2 | **Vanaheim** | Lucky Dog Landing | `/fenrir` (Fenrir's domain) | jade green | upper east |
| 3 | **Midgard** | Trading | `/trading` | earthen amber | center east |
| 4 | **Niflheim** | Personal / health / journal | `/` (with `?realm=niflheim` query) | icy blue | upper north |
| 5 | **Muspelheim** | AI Consulting | `/` (with `?realm=muspelheim` query) | ember orange | south center |
| 6 | **Álfheim** | Skills library | (placeholder — stays on `/skills`) | silver-white | high east |
| 7 | **Jötunheim** | Risks / threats | `/` (with `?realm=jotunheim` query) | slate red-grey | west |
| 8 | **Svartálfaheim** | Infrastructure / tooling | `/` (with `?realm=svartalfaheim` query) | dim copper | lower east |
| 9 | **Helheim** | Archive / completed | `/activity` (Heimdall's Watch) | dim violet | far north |

**Note:** For v1, most realm routes redirect to `/` with a query param. Real dedicated pages land in v2 when the life-dashboard panels (Hoard, Forge, etc.) get their own surfaces.

---

## Per-hotspot anatomy

For each of the 9 realms:

```tsx
<Link
  href={realm.route}
  className="absolute group"
  style={{ left: realm.x, top: realm.y, width: realm.w, height: realm.h }}
>
  {/* Invisible hit region */}
  <span className="absolute inset-0" aria-label={realm.name} />

  {/* Visible glow dot at branch tip */}
  <span
    className={`absolute h-3 w-3 rounded-full ${realm.glowClass} group-hover:scale-150 transition-transform`}
    style={{ left: realm.dotX, top: realm.dotY, opacity: realm.healthOpacity }}
  />

  {/* Floating preview card on hover */}
  <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity ...">
    <div className="text-rune text-xs">{realm.name.toUpperCase()}</div>
    <div className="text-[11px] text-text-muted">{realm.status}</div>
  </div>
</Link>
```

---

## Visible glow dots (the only NON-transparent visual addition)

At each branch tip, render a small 12px circle in the realm's accent color. These are what tell the user "this branch is clickable."

- **Opacity reflects realm health** (for v1, all static at 0.8; in v2 wire to live data)
- **Hover scales them up** to 1.5x with a brighter glow
- **They sit on top of the image** at z-index 10

This is the only visual addition on top of the Midjourney image — everything else is invisible hit-regions.

---

## Hover preview card

When mouse enters a hotspot, a small card slides in (200ms ease-out) near the cursor showing:

```
┌─────────────────────────┐
│ ASGARD                  │  ← Cinzel small, accent gold
│ AIOS · Doctor healthy   │  ← Inter small, text-muted
└─────────────────────────┘
```

Card position: absolute, anchored to the branch tip, offset 20px up-right.

Card content (v1, hard-coded per realm):
- Asgard: `"AIOS · Doctor {status}"` — pulls live from doctor signal
- Vanaheim: `"Lucky Dog · {status}"` — pulls from `wyrd.json` lucky-dog status
- Midgard: `"Trading · {open positions count}"` — pulls from trading signal
- Niflheim: `"Personal · v2"` — static for now
- Muspelheim: `"AI Consulting · v2"` — static
- Álfheim: `"Skills · 270+ indexed"` — static
- Jötunheim: `"Risks · 0 flagged"` — static (could read Doctor's deferred items in v2)
- Svartálfaheim: `"Infra · MCP healthy"` — could pull from Doctor's MCP duplicate count
- Helheim: `"Archive · {N completed tasks}"` — pulls from tasks SQLite

---

## Fallback when the Midjourney image doesn't exist yet

When `dashboard/public/art/scenes/night-norse-stars.webp` is missing, render a vertical list of the 9 realms as clickable cards instead:

```
┌────────────────────────────────────┐
│ YGGDRASIL                          │
│ (image not yet generated)          │
├────────────────────────────────────┤
│ ⚜ Asgard       AIOS · healthy    │
│ ◆ Vanaheim     Lucky Dog · paused │
│ ✦ Midgard      Trading · ready    │
│ ❄ Niflheim     Personal · v2      │
│ 🔥 Muspelheim  AI Consulting · v2 │
│ ⟁ Álfheim     Skills · indexed   │
│ ⚔ Jötunheim   Risks · 0 flagged  │
│ ⚒ Svartálfaheim Infra · healthy  │
│ ☾ Helheim     Archive · N done   │
└────────────────────────────────────┘
```

This is the "graceful degradation" mode. Functional, ships immediately, gets replaced by the hotspot overlay when the image arrives.

---

## Implementation effort

| Phase | Time |
|---|---|
| Build the page scaffold + fallback vertical list | ~30 min |
| Add the 9 hotspot Link elements with placeholder coordinates | ~20 min |
| Position-tune the coordinates once the Midjourney image lands | ~30 min |
| Add hover preview cards | ~20 min |
| Wire the live-data status strings (Asgard → Doctor, Midgard → Trading, Helheim → Tasks) | ~30 min |
| **Total** | **~2 hours** |

---

## Out of scope

- Animated "sap-flow" up the trunk — would require either the image to be split into layered PNGs or a vector overlay. Skip for v1.
- Per-realm health-driven dot animations (pulse on alert) — v2 if useful.
- Tap-and-hold to expand realm preview inline — v2.
- Mobile responsive behavior — desktop-only for v1.

---

## TL;DR

`/skills` = Midjourney night scene image (Yggdrasil + stars) with 9 invisible hotspot Links overlaid. Small glow dots at branch tips for "click here" affordance. Hover preview card. Click → navigate to realm route. Fallback to vertical card list when image is absent. ~2 hours of Codex work. $0 cost.
