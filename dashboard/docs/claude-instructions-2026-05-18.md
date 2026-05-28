# Claude → Codex: Implementation Instructions for the Next 3 Slices

**Date:** 2026-05-18
**Author:** Claude (design/UX/IA lead)
**Status:** Marching orders for Codex. Locked unless Woody overrides.

---

## Context unification

Three Claude artifacts now exist on disk:
1. `dashboard/HANDOFF-TO-CODEX.md` — initial v1 handoff
2. `contexts/dashboard-aios-claude-response-2026-05-17.md` — first-round critique (IA, tokens, data ownership, 10-step plan)
3. `dashboard/docs/claude-critique-2026-05-18.md` — second-round critique (sequencing, composition, the 5 questions)
4. `dashboard/DESIGN-LANGUAGE.md` — v2 scope (Woody's Realm, Yggdrasil, Hoard/Forge/Saga life-dashboard expansion)

**This doc supersedes none of them. It unifies and operationalizes.**

The tension to resolve:
- Earlier critique: "one Norse moment, strip runes from every surface, premium not themed"
- DESIGN-LANGUAGE.md: Norse vocabulary everywhere (Wyrd, Hoard, Saga, Mímir, Heimdall...)

**Resolution (locked):**
- **Norse vocabulary = semantic naming. Use everywhere.** Panel names, status copy, page titles, action verbs. This is brand spine.
- **Norse decoration = surgical. Concentrate in the hero session glyph.** No rune borders on panels. No gold gradients on cards. Cinzel ≥24px only. The premium feel comes from restraint, not from painting runes on every surface.

---

## Slice 1 — Foundation hygiene (~2-3 hours)

**One PR. Land it first. Don't batch with anything.**

### Tasks
1. **Move fonts to `next/font/google`** in `app/layout.tsx`:
   - `Cinzel` (display, 400/500/600/700)
   - `Inter` (body, 300/400/500/600/700)
   - `JetBrains_Mono` (mono, 400/500)
   - Delete the `@import url(...)` line from `globals.css`
   - Apply via `className` on `<body>`

2. **Extract design tokens to `styles/tokens.css`** using **OKLCH** (overrides the prior hex palette):
   ```css
   :root {
     /* Surfaces — warm-black, not pure black */
     --color-bg-deep:     oklch(14% 0.005 250);
     --color-bg-panel:    oklch(17% 0.006 250);
     --color-bg-raised:   oklch(20% 0.008 250);
     --color-bg-hover:    oklch(23% 0.010 250);

     /* Text — parchment-tinted, not pure white */
     --color-text-primary:   oklch(95% 0.005 90);
     --color-text-secondary: oklch(72% 0.010 90);
     --color-text-muted:     oklch(52% 0.008 90);

     /* Borders — barely-there */
     --color-border-subtle: oklch(28% 0.006 250);
     --color-border-strong: oklch(38% 0.008 250);

     /* Semantic accents — used SPARINGLY */
     --color-rune-gold:  oklch(75% 0.13 80);   /* primary / Odin / active */
     --color-bifrost:    oklch(68% 0.16 245);  /* healthy / synced */
     --color-blood:      oklch(58% 0.20 25);   /* Fenrir / critical */
     --color-ember:      oklch(72% 0.18 50);   /* warning */
     --color-iron:       oklch(60% 0 0);       /* neutral */
   }
   ```
   Update `tailwind.config.ts` to read these as `rgb(from var(--color-X) r g b / <alpha-value>)` so Tailwind opacity utilities still work. Or keep the hex map in Tailwind for now and treat tokens.css as the canonical reference + dark-mode source.

3. **Demote placeholder routes from primary nav.** In `components/Sidebar.tsx`:
   - Primary `NAV` cluster: **Home only.**
   - New `REALM` cluster (lower, dimmer, smaller type): `Yggdrasil` (skills), `Mímir's Well` (memory), `Heimdall's Watch` (activity).
   - Agent cards unchanged: `AIOS-AGENT` (Odin, gold) + `FENRIR-AGENT` (Fenrir, blood, dimmer until v2).

4. **Add error boundaries:**
   - `app/error.tsx` (root, client component with `"use client"` + reset button)
   - `app/api/doctor/route.ts`, `trading/route.ts`, `tasks/route.ts` — wrap reads in try/catch, return 500 with `{ error: string }` on failure. Update consumer panels to render a gentle "data unavailable" state, not crash.

5. **Drop the `Messages` stat slot** from `app/page.tsx`. The 4-stat row becomes a 3-stat row: `Doctor / Signals / Last Active`.

6. **Norse vocabulary pass** — gentle rename, no structural changes:
   - Trading panel `<h2>Daily Signals</h2>` → `<h2>Slate of Fates</h2>`
   - Tasks panel `<h2>Next Actions</h2>` → `<h2>Today's Rites</h2>`
   - Doctor panel stays `<h2>System Health</h2>` (already correctly mundane — Doctor is operational, not mythic)

### Exit criteria for Slice 1
- `npx tsc --noEmit` clean
- Lighthouse FCP < 1.5s (next/font fixes render-blocking)
- All 5 routes still 200
- Sidebar shows only Home in primary nav
- Force a Doctor JSON corruption → page renders "data unavailable", does NOT 500

---

## Slice 2 — Trading panel + adapter contract (~1 day)

**This is the keystone slice. Defines the contract every future panel inherits.**

### The contract (locked)

Create `types/panel-card.ts`:

```ts
export type PanelCardHotness = 0 | 1 | 2 | 3;

export type PanelCardAction = {
  verb: string;          // ≤20 chars, imperative ("Open slate")
  href: string;          // internal route OR external URL
  hotness: PanelCardHotness;  // 0 = informational, 3 = blocking
};

export type PanelCardSource =
  | 'parlay-bot'
  | 'morning-brief'
  | 'aios-doctor'
  | 'manual';

export type PanelCard = {
  freshness: {
    iso: string;            // ISO8601 timestamp of underlying data
    staleAfterMs: number;   // threshold past which UI shows "stale"
  };
  headline: string;         // ≤80 chars, the one thing to know
  detail?: string;          // optional second line, ≤120 chars
  nextAction: PanelCardAction | null;
  source: PanelCardSource;
};
```

**Universal rule:** Any panel on the home screen MUST be able to fill `{freshness, headline, nextAction}` honestly. If a domain can't, it doesn't get home-screen real estate. (Doctor + Tasks need to be migrated to this contract in Slice 2.5 — but Trading first.)

### Tasks

1. **Read ParlayBot's actual schema.** Open `C:\Github Repos\parlay-bot\src\` and identify:
   - Where slate outputs land (JSON file path + schema)
   - Where calibration data lives
   - Where settled-bet logs land
   - Time-window logic (when is a "slate locked"?)

2. **Write `lib/adapters/trading.ts`** with the new contract:
   ```ts
   export async function getTradingCards(): Promise<PanelCard[]>;
   ```
   - Returns 0-3 cards (most-relevant first)
   - One card per signal type: latest slate, latest brief, open position alert
   - Each card has real `freshness` + real `nextAction`
   - Drop the substring-matching from `lib/trading.ts` — keep that file as a thin re-export for now

3. **Rebuild `components/TradingPanel.tsx`** to consume the new contract:
   - Map over `PanelCard[]`
   - Render with freshness badge (green dot if fresh, ember if stale)
   - Render `nextAction` as a real `<button>` or `<Link>` with hotness-derived styling
   - Empty state: "No fates woven yet today" with subtle rune accent

4. **Update `/api/trading/route.ts`** to return the new contract shape.

### Exit criteria for Slice 2
- TradingPanel shows real ParlayBot data with real timestamps
- "Open slate" button actually navigates somewhere (even if it's just `/api/trading/raw` for now)
- Stale slate (>4h old) renders ember-tinted, not green
- Empty state is earned, not dead air

---

## Slice 3 — Asymmetric home composition + Next Action card (~half day)

**Once Trading is real, the home page can be honestly composed.**

### The composition (locked)

Replace `app/page.tsx` body with:

```
┌──────────────────────────────────────────────────────────┐
│ PulseStrip (64px height)                                 │
│   🟢 Realm at peace · Tue 9:14pm · market closed · ⚜    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────┐  ┌──────────────────┐    │
│  │ NextActionCard (62%)     │  │ SessionGlyph (38%)│   │
│  │   Cinzel ≥24px title     │  │   Animated Odin   │   │
│  │   Inter body             │  │   sigil. Single   │   │
│  │   ONE action button      │  │   atmospheric     │   │
│  │   Generous padding       │  │   moment.         │   │
│  └──────────────────────────┘  └──────────────────┘    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  DomainRow (2/1/1 grid)                                  │
│  ┌────────────────────┐  ┌────────┐  ┌────────┐         │
│  │ TradingPanel (2x)  │  │ Doctor │  │ Tasks  │         │
│  └────────────────────┘  └────────┘  └────────┘         │
├──────────────────────────────────────────────────────────┤
│  ActivityStream (dense, mono timestamps, last 8 events) │
│  [21:14] doctor heal · NPX cache server-memory          │
│  [21:08] task created · "Test the dashboard"            │
│  [20:55] trading · ParlayBot calibration.json updated   │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

### Locked components to build

1. **`components/PulseStrip.tsx`** (server component, 64px tall):
   - Realm Status — one of three states, derived from Doctor + open critical tasks:
     - `🟢 Realm at peace` — Doctor status=ok, 0 critical tasks
     - `🟡 Realm under watch` — Doctor status=warn OR 1+ tasks marked priority=3 due today
     - `🔴 Storm in the realm` — Doctor status=crit OR deferred>0
   - Live clock (refresh every 60s via client-side island)
   - Market state: `market closed` / `regular hours` / `extended hours` (derived from time + day-of-week — US Eastern, NYSE schedule)
   - One small atmospheric ornament (⚜ or stylized rune) at far right

2. **`components/NextActionCard.tsx`** (server component, 62% width):
   - Priority logic (locked):
     1. Doctor CRITICAL (`status=crit`) → `{verb: "Open Doctor log", href: "/api/doctor", hotness: 3}`
     2. Open critical task → `{verb: "Open task", hotness: 3}`
     3. Trading slate ready + market open → `{verb: "Open slate", hotness: 2}`
     4. Doctor WARN with >24h staleness → `{verb: "Run Doctor", hotness: 1}`
     5. Top-priority task due today → `{verb: "Open task", hotness: 1}`
     6. All-clear → renders atmospheric empty state: rune sigil + "Realm at peace. Move with the day."
   - Layout: Cinzel headline ≥24px, Inter detail, ONE button at bottom-right
   - Padding: minimum 32px all sides
   - Border: hairline only, no glow (the glow lives in SessionGlyph)

3. **`components/SessionGlyph.tsx`** (client component, 38% width):
   - The animated Odin sigil (use existing `OdinGlyph.tsx` as base, enhance with):
     - Subtle radial gradient backdrop
     - Slow 12s rotation on the outer dashed ring (almost imperceptible)
     - `rune-glow` keeping the existing 4s pulse
   - Aspect ratio: matches NextActionCard height (no scrollbars)
   - **This is the ONE Norse decorative moment on the home page.** Resist temptation to add more.

4. **`components/DomainRow.tsx`** (server component):
   - Renders three children at 2/1/1 fractional widths
   - Children: TradingPanel (2x), DoctorPanel (1x), TasksPanel (1x)
   - Each child consumes the new `PanelCard` contract (so Doctor + Tasks need adapter migration too — track that as Slice 2.5 if not done in 2)
   - Use CSS Grid: `grid-template-columns: 2fr 1fr 1fr; gap: 24px`

5. **`components/ActivityStream.tsx`** (server component, full width):
   - Unified event log. Reads from a new `lib/events.ts` that aggregates:
     - Doctor `fixedItems` from latest run (most recent 4)
     - Recent task creates/completes (from SQLite)
     - Trading file mtimes (from `lib/adapters/trading.ts`)
   - Renders ≤8 rows, newest first
   - Each row: `[timestamp] domain · headline`
   - JetBrains Mono font, dense leading-tight, deep-bg-deep panel
   - Empty state: "The realm is quiet. Heimdall watches."

### Exit criteria for Slice 3
- `grid-cols-3` removed from home page
- NextActionCard renders priority logic correctly for at least 3 of 6 states (verified by manually corrupting/healing Doctor JSON)
- SessionGlyph is the ONLY surface on the home page using rune-gold gradient or glow
- ActivityStream shows real events from at least 2 of 3 domains
- Total Cinzel uses on the home page: ≤5 (PulseStrip ornament, NextActionCard title, Realm Status word, hero glyph caption, panel titles). Anything else = Inter.

---

## Global visual rules (apply throughout all slices)

| Rule | Enforcement |
|---|---|
| Cinzel ≥24px ONLY | Any `font-display` class on text <24px → swap to `font-body` (Inter). |
| No gradients on cards | Only `SessionGlyph` uses gradient + glow. Cards = flat `bg-bg-panel` with `border border-border-subtle`. |
| Pure-black is banned | Background = `oklch(14% 0.005 250)`. No `#000`. |
| One Norse moment per surface | One ornament per route. SessionGlyph on home. Yggdrasil eventually on `/skills`. Etc. |
| Asymmetric by default | No 50/50 splits. No equal `grid-cols-3`. Use 62/38 or 2/1/1. |
| Mono for numbers | Stats, timestamps, file paths, IDs → JetBrains Mono. Prose → Inter. |
| Negative space is design | Card internal padding minimum `24px`. NextActionCard minimum `32px`. |

---

## What's deferred to v1.5 (do not build in this batch)

- Oracle Drawer (claude-mem search via prompt bar)
- Claude CLI escalation from Oracle Drawer
- Command palette (⌘K)
- Real-time activity stream (polling/SSE)
- Hoard / Forge / Daily Rites / Saga panels
- Yggdrasil cognitive-theater hero
- Privacy / Realm-sealed mode

These all live in `DESIGN-LANGUAGE.md`. **v1 ships clean first.**

---

## Handoff protocol for each slice

When you finish a slice:
1. Land one PR (small, atomic, reviewable)
2. Write a 1-page handoff to `dashboard/docs/codex-slice-N-<name>.md` containing:
   - What shipped
   - Screenshots (paste paths or embed)
   - What's still mocked
   - Open questions for Claude
3. Ping Woody to surface me for critique on `dashboard/docs/claude-critique-slice-N.md`

I will critique. We loop. v1 ships.

**Start with Slice 1. Ship the foundation hygiene PR first.**
