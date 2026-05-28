# Claude → Codex: Slice 3 Marching Orders

**Date:** 2026-05-18
**Author:** Claude (design/UX/IA lead)
**Status:** Slice 3 implementation ready. Built from 18 waves of ideation + DESIGN-LANGUAGE.md v2.

---

## Context

Slices 1, 2, 2.5 are shipped (foundation hygiene + Trading adapter + /trading route). Now Slice 3 builds the **true command-center home composition**. Read `DESIGN-LANGUAGE.md` first — that's the authoritative spec. This doc operationalizes it.

---

## Slice 3 deliverables

Build these components + integrate into `app/page.tsx`. **One PR, atomic, with a handoff doc at the end.**

### 1. `components/HeroBand.tsx` (NEW — server component)
- Full-width hero band above PulseStrip
- Background image: time-of-day scene (4 scenes — for v1, use solid-gradient placeholders until Midjourney art lands)
- Hero copy with welcome + date:
  ```
  Good morning, Lord Woody         ← Cinzel ≥48px, gold tinted
  Tuesday, May 18 · 7:14am CDT     ← Inter, secondary
  The realm is at peace.           ← Inter, mythic tone, derived from Realm Status
  ```
- Greeting copy varies by mode:
  - **DAWN** (5-9am): "Good morning, Lord Woody"
  - **DAY** (9am-5pm): "Strength to you, Lord Woody"
  - **DUSK** (5-9pm): "Welcome back, Lord Woody"
  - **NIGHT** (9pm-5am): "Evening, Realm Lord"
- Special days override (read `dashboard/data/profile.json` for birthday): birthday/Monday/Friday/market-crash/win-streak get unique copy
- Subtle parallax on scroll (optional, low priority — only if cheap)
- Height: ~30vh
- **Place a daily quote in small italic Inter below the welcome triplet, pulled from `dashboard/data/quotes.json`** (random pick on each home load, but seed by date so it's the same for the whole day)

### 2. `components/PulseStrip.tsx` (NEW — server + client island for clock)
- 64px tall, full-width, below HeroBand
- **Left:** Realm Status state (🟢/🟡/🔴 + label)
  - 🟢 Realm at peace — Doctor=ok AND 0 critical tasks
  - 🟡 Realm under watch — Doctor=warn OR 1+ priority=3 tasks due today
  - 🔴 Storm in the realm — Doctor=crit OR deferred>0
- **Center:** Live clock (`Tue 7:14am CDT`) — client island, ticks every 60s
- **Right-center:** Market state (dual timezone), derived from US Eastern NYSE schedule
  - `market closed` / `pre-market` / `regular hours` / `extended hours`
  - Format: `7:14am CDT · 8:14am ET — market closed`
- **Far right:** Small atmospheric ornament `⚜` (or Vegvísir mini-sigil)
- Background: subtle `bg-bg-panel`, hairline bottom border

### 3. `components/NextActionCard.tsx` (NEW — server component)
- 62% width (left side of the asymmetric row below PulseStrip)
- Priority logic (locked, 5-level — see DESIGN-LANGUAGE.md):
  1. Doctor CRITICAL → `{verb: "Open Doctor log", href: "/api/doctor", hotness: 3}`
  2. Open critical task (priority=3, status≠done) → `{verb: "Open task", href: "/", hotness: 3}`
  3. Trading slate ready + market open (within 15min lock) → `{verb: "Open slate", href: "/trading", hotness: 2}`
  4. Open position move >3% intraday (when wired) → `{verb: "Review position", href: "/trading", hotness: 2}`
  5. Doctor WARN + staleness >24h → `{verb: "Run Doctor", hotness: 1}`
  6. All-clear (empty state) → no button, atmospheric copy: "Realm at peace. Move with the day." + dim rune sigil
- Layout:
  - Cinzel headline ≥24px ("Open Doctor log" / "Storm in the realm")
  - Inter body (1-2 lines of context: "Doctor flagged 3 critical findings 23m ago.")
  - Hotness-styled action button at bottom-right (3=blood-red urgent, 2=ember warning, 1=rune-gold standard, 0=no button)
- Padding: minimum 32px all sides
- Border: hairline only, no glow

### 4. `components/SessionGlyph.tsx` (NEW — client component)
- 38% width (right side of the asymmetric row)
- Renders the animated Lebot James sigil
- For v1: use existing `OdinGlyph.tsx` as base (rename internally; the OdinGlyph SVG is the placeholder until Midjourney art lands)
- Animations:
  - Subtle radial gradient backdrop (purple→deep)
  - Slow 12s rotation on outer dashed ring (almost imperceptible)
  - `rune-glow` keeping the existing 4s pulse on inner runes
  - On Realm Status=🔴 critical: the cyborg-eye position glows blood-red (red-eye motif)
- Aspect ratio: matches NextActionCard height (no scrollbars)
- **This is the ONLY surface on the home page using rune-gold gradient or glow.** Resist temptation to add more.

### 5. `components/TodaysWyrd.tsx` (NEW — server component)
- Strip below the NextAction+Glyph row
- Reads `dashboard/data/wyrd.json`:
  ```json
  [
    { "id": "aios", "label": "AIOS power-up", "sigil": "⚲", "status": "on-track", "next": "Slice 3 ships" },
    { "id": "lucky-dog", "label": "Lucky Dog launch", "sigil": "◆", "status": "paused", "next": "—" },
    { "id": "consulting", "label": "AI consulting", "sigil": "✷", "status": "next", "next": "outreach" }
  ]
  ```
- Layout: horizontal strip, 3 cards side-by-side
- Each card: sigil + label + status badge + "next" hint
- Status badges: `on-track` (bifrost) / `paused` (iron) / `next` (ember) / `blocked` (blood)

### 6. `components/DomainRow.tsx` (NEW — server component)
- Below TodaysWyrd
- 2/1/1 grid: `grid-template-columns: 2fr 1fr 1fr; gap: 24px`
- Children:
  - **Slate of Fates** (Trading) — 2x — refactor `TradingPanel.tsx` to be visually weightier
  - **AIOS Doctor** — 1x — current `DoctorPanel.tsx`
  - **Today's Rites** — 1x — current `TasksPanel.tsx`
- Each child consumes the `PanelCard` contract (Doctor + Tasks need migration to the contract — track as Slice 3.5 if not done in 3)

### 7. `components/ActivityStream.tsx` (NEW — server component)
- Below DomainRow, full width
- Reads from new `lib/events.ts` aggregator:
  - Doctor `fixedItems` (last 4)
  - Recent task creates/completes (from SQLite, last 4)
  - Trading file mtimes (from `lib/adapters/trading.ts`, last 4)
- Renders **dense terminal-style**, 12-15 rows visible:
  ```
  [21:47] doctor   NPX cache healed
  [21:42] trading  morning brief refreshed
  [21:38] task     created 'review slate'
  [21:31] doctor   MCP duplicate count: 3
  ...
  ```
- JetBrains Mono font, tight leading, deep-bg-deep panel
- Newest first
- Empty state: `The realm is quiet. Heimdall watches.` (italic, text-muted)

---

## Updates to existing files

### `app/page.tsx`
Replace current composition entirely:
```tsx
import HeroBand from '@/components/HeroBand';
import PulseStrip from '@/components/PulseStrip';
import NextActionCard from '@/components/NextActionCard';
import SessionGlyph from '@/components/SessionGlyph';
import TodaysWyrd from '@/components/TodaysWyrd';
import DomainRow from '@/components/DomainRow';
import ActivityStream from '@/components/ActivityStream';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <>
      <HeroBand />
      <PulseStrip />
      <div className="grid grid-cols-[62fr_38fr] gap-6 px-12 py-8">
        <NextActionCard />
        <SessionGlyph />
      </div>
      <TodaysWyrd />
      <DomainRow />
      <ActivityStream />
    </>
  );
}
```

### `components/StatRow.tsx`
**DELETE this file.** PulseStrip replaces it entirely.

### `components/AgentHero.tsx`
- Currently used by `app/page.tsx` — no longer needed on home (HeroBand replaces it)
- Still used by `/fenrir` etc. — keep for agent pages, no changes

### `lib/wyrd.ts` (NEW)
- Reader for `dashboard/data/wyrd.json`
- Returns typed array of Wyrd items
- Create `wyrd.json` initial content with Woody's 3 north stars (AIOS / Lucky Dog / AI Consulting)

### `lib/realm-status.ts` (NEW)
- Computes Realm Status from Doctor + Tasks + Trading
- Returns `'ok' | 'watch' | 'storm'` + reason string
- Used by both PulseStrip and HeroBand (mood-affecting copy)

### `lib/mode.ts` (NEW)
- Computes time-of-day mode: `'dawn' | 'day' | 'dusk' | 'night'`
- Computes special-day flags: `birthday | monday | friday | market-crash | win-streak | normal`
- Used by HeroBand for greeting + background

### `lib/events.ts` (NEW)
- Aggregator that combines Doctor + Tasks + Trading events into a unified `Event[]`
- Each event: `{ timestamp, domain, headline }`
- Used by ActivityStream

### `dashboard/data/profile.json` (NEW)
- Lord Woody's profile (see DESIGN-LANGUAGE.md "Profile" section)
- Includes: name, timezone, birthday (TBD — leave null for now), northStars, schedule

### `dashboard/data/quotes.json` (NEW)
- 100-quote bank (I'll provide this in a follow-up — for now seed with ~10 placeholders mixing Hávamál + Stoic + LeBron + biblical + Sun Tzu)
- Schema: `[ { quote, source, theme } ]`

### `dashboard/data/wyrd.json` (NEW)
- Initial 3 north stars (see lib/wyrd.ts section)

---

## Global visual rules (enforce throughout)

| Rule | Enforcement |
|---|---|
| Cinzel ≥24px only | Sweep `font-display` classes. Anything <24px → swap to `font-body` (Inter). |
| No gradients on cards | Strip `from-rune-gold/X` gradients from all panels except SessionGlyph. |
| One Norse decoration per surface | SessionGlyph carries the home page's ornament. Resist adding more. |
| Asymmetric layouts only | Use 62/38 or 2/1/1, never equal `grid-cols-3`. |
| Cards = flat surfaces, hairline border | No glow, no gradient. `bg-bg-panel border border-border-subtle`. |
| Numbers in mono | All stats, prices, counts, timestamps → JetBrains Mono. Prose → Inter. |
| Padding minimum 24px (panels), 32px (NextActionCard) | Negative space is the design. |
| Apple-shimmer loading | Use `<Skeleton />` component with `animate-shimmer` for any loading state. No "—" placeholders. |
| Respect `prefers-reduced-motion` | All keyframe animations check OS preference and disable if reduced. |

---

## What to NOT build in Slice 3 (defer)

- ❌ Oracle Drawer (⌘K) — Slice 4 (Ravens milestone)
- ❌ Telegram + desktop notifications wiring — Slice 4
- ❌ Bell icon + history drawer — Slice 4
- ❌ Hoard / Forge / Daily Rites / Saga panels — v2 (Yggdrasil milestone)
- ❌ Yggdrasil viz on `/skills` — v2
- ❌ Apple Health integration — v2
- ❌ Plaid integration — v2
- ❌ Per-agent dedicated pages (`/thor`, `/perseus`, `/sauron`) — Slice 4
- ❌ Prompt bar — confirmed removed for v1
- ❌ Real Midjourney art — using SVG placeholders until art lands
- ❌ Background image rotation (use gradient placeholders for now)
- ❌ Easter eggs — decided NO

---

## Exit criteria for Slice 3

- `npx tsc --noEmit` clean
- All 5 home page sections render (HeroBand, PulseStrip, NextAction+Glyph row, TodaysWyrd, DomainRow, ActivityStream)
- NextActionCard renders correct priority state for at least 3 of 6 conditions (verify by manually corrupting Doctor JSON / creating a priority=3 task / etc.)
- ActivityStream shows real events from at least 2 of 3 domains
- Hero greeting changes by time-of-day mode (manually adjust system clock to verify all 4)
- PulseStrip clock updates every 60s without page reload
- Cinzel uses on home page ≤ 5 instances (count them)
- SessionGlyph is the only element with gradient/glow
- All 3 grid breakpoints work (mobile / tablet / desktop)

---

## Handoff protocol

When Slice 3 lands:
1. Land one PR (atomic, reviewable)
2. Write `dashboard/docs/codex-slice-3-home-composition.md`:
   - What shipped
   - Screenshots (multiple — full home page, hero band, next-action variations, activity stream, etc.)
   - What's still mocked
   - Open questions for Claude
3. Ping Woody — he surfaces me back for `dashboard/docs/claude-critique-slice-3.md`

---

## Open questions you might hit (likely answers preloaded)

| Question | Answer |
|---|---|
| Should HeroBand have a parallax effect? | Optional, only if cheap. Don't block on it. |
| Should the Wyrd strip be editable in-UI? | No, v1. Edit `wyrd.json` directly. |
| What if there are zero events for ActivityStream? | Show empty state copy "The realm is quiet. Heimdall watches." |
| Should the clock include seconds? | No. Minute-precision only. Less visual churn. |
| Does the day-of-week greeting account for weekends? | Yes — `wyrd.json` checks `profile.json.schedule.work.days`. On weekends use "Saturday/Sunday morning, Lord Woody." |
| Should I use a chart library or hand-roll? | Hand-roll for v1. We don't have any charts on the home page yet anyway. |
| Realm Status visual style? | Solid dot + Cinzel label. Dot color from the 3 semantic accents. |

---

**Ship Slice 3 first. Don't batch with Slice 4.**

When done, ping Woody. I'll critique against this spec.
