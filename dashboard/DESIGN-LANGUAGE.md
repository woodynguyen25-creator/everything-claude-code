# AIOS Dashboard — Design Language v2 (Bifröst Release)

**Date locked:** 2026-05-18
**Status:** Authoritative spec. Codex implements against this. 18 ideation waves consolidated, ~72 decisions locked.
**Codename:** Bifröst (v1.0) — the bridge to your realm

---

## Product North Star

**Woody's Realm — a Norse-themed cognitive-theater AIOS dashboard that operates as Lord Woody's main morning + evening command center. It surfaces AI project health, trading, life (finances/health/habits/journal), and serves a council of 5 legendary agents who run his realm.**

### Three pillars
1. **Cinematic luxury** — TradingView density + Apple beauty + Iron Man HUD atmosphere
2. **Norse mythology spine** — every panel name, every status word reaches for the Old-Norse concept first; visual decoration is surgical
3. **Operator-first** — Lord Woody is the king of the realm. Everything personalizes around him.

---

## The Council of the Realm (5 Agents)

| Agent | Mythology | Lane | Sigil | Accent | Model |
|---|---|---|---|---|---|
| **LEBOT JAMES** · All-Father | Sports/AI cyborg | Overview, cross-project, default routing | Cyborg LeBron portrait | Gold + royal purple (red eye for crit) | Opus 4.7 |
| **THOR** · Thunder | Norse | Stocks, options, general markets | Mjölnir + lightning rune | Electric blue (bifrost) + gold | Opus 4.7 |
| **PERSEUS** · Prince of Parleys | Greek | ParlayBot / DFS specifically | Greek hero w/ crypto-Medusa head | Emerald + gold | Sonnet 4.6 |
| **FENRIR** · Wolf of the Forge | Norse | Web design / Lucky Dog / frontend craft | Wolf head, glowing eyes | Blood-red | Opus (design) / Sonnet (code) |
| **SAURON** · All-Seeing Eye | Tolkien | Deep research, surveillance, web | Eye of Sauron + Barad-dûr | Burning orange/red on black | Sonnet 4.6 |

**Deferred:** **ARISTOTLE** · Skald of Counsel (Greek) — writing/consulting agent, added when first AI consulting client lands.

### Agent system specifics
- **Every agent has full tool surface access** (21 MCPs + 270 skills) — Woody chose to not constrain
- **Persistent conversation history per agent**, indexed via claude-mem
- **Lebot James can silently delegate** to specialists mid-conversation (e.g., trading question routes to Thor invisibly)
- **Prompt bar (Odin's Ear)** defaults to Lebot James + per-agent override icons (👑 Lebot · ⚡ Thor · 💰 Perseus · 🐺 Fenrir · 👁 Sauron)
- **Per-panel "Ask {agent}" buttons** in every panel (Slate of Fates → "Ask Perseus", Lucky Dog → "Ask Fenrir", etc.)
- **Each agent has dedicated page** at `/`, `/thor`, `/perseus`, `/fenrir`, `/sauron` — Hermes-style cinematic hero + full chat below
- **Voice across all agents:** Norse-king + LeBron-swagger blend (varies in tone per agent)
- **Persona configs**: file-based at `dashboard/personas/*.md` for v1, in-dashboard UI editor for v2
- **System prompts locked** (no sliders) per agent
- **Per-agent stats** visible on sidebar card (conversation count + last active) + dedicated page (token usage)
- **Conversation export** to Obsidian markdown via "Export to Obsidian" button on every chat

---

## Visual Identity

### Brand mark + nameplate
- **Mark:** Vegvísir (Icelandic wayfinder stave — "that which shows the way through storms")
- **Position:** Top-left of sidebar
- **Nameplate:** `WOODY'S REALM` in Cinzel tracked 0.2em, followed by `Operator · {live date}` in Inter mono

### Palette (OKLCH, locked)
```css
:root {
  /* Surfaces — warm-black, never pure #000 */
  --color-bg-deep:     oklch(14% 0.005 250);
  --color-bg-panel:    oklch(17% 0.006 250);
  --color-bg-raised:   oklch(20% 0.008 250);
  --color-bg-hover:    oklch(23% 0.010 250);

  /* Text — parchment-tinted */
  --color-text-primary:   oklch(95% 0.005 90);
  --color-text-secondary: oklch(72% 0.010 90);
  --color-text-muted:     oklch(52% 0.008 90);

  /* Borders — barely-there */
  --color-border-subtle: oklch(28% 0.006 250);
  --color-border-strong: oklch(38% 0.008 250);

  /* Semantic accents */
  --color-rune-gold:  oklch(75% 0.13 80);   /* primary — Lebot, active */
  --color-bifrost:    oklch(68% 0.16 245);  /* Thor, healthy, synced */
  --color-blood:      oklch(58% 0.20 25);   /* Fenrir, critical */
  --color-ember:      oklch(72% 0.18 50);   /* warning */
  --color-iron:       oklch(60% 0 0);       /* neutral */

  /* Agent accents (NEW) */
  --color-lebot-purple:  oklch(48% 0.18 305);  /* Lebot's secondary */
  --color-perseus-emerald: oklch(60% 0.14 155); /* Perseus accent */
  --color-sauron-fire:   oklch(60% 0.22 35);   /* Sauron eye-glow */
}
```

### Typography
- **Display:** `Cinzel` — heroes, persona names, panel titles, rune labels. **≥24px only** (sweep codebase; anything smaller becomes Inter)
- **Body:** `Inter` — paragraphs, descriptions, UI text, labels
- **Mono:** `JetBrains Mono` — file paths, timestamps, IDs, code, all numeric data (stats, prices, counts)
- **All three loaded via `next/font/google` in `app/layout.tsx`** (no `@import`)

### Motion language
- `rune-glow` — 4s ease infinite on hero persona name + key sigils
- `ember-pulse` — 3s ease infinite on attention/status dots
- `scry` — 400ms ease-out-expo scale-in (0.96 → 1.0) + fade for newly-arrived content (Doctor refresh, Wyrd update)
- `sap-flow` — 8-12s slow vertical gradient sweep along Yggdrasil trunk (v2 only)
- **Click feedback:** 1.02x hover scale + soft gold border glow + cursor pointer · click ripple at 0.98x with brief flash
- **Respect `prefers-reduced-motion`** — all keyframes disable when OS prefers reduced motion

### Loading states
- **Apple-shimmer skeletons** — gray boxes where content will go, soft light-wave sweeps L→R every 1.2s
- Never show "—" placeholders for missing data — remove the slot or show mythic empty-state copy

### Rune iconography system
- **Hybrid:** Real Elder Futhark runes where they fit naturally (agent identity, version names, panel signatures) + custom geometric stylized runes for UI ornament (status indicators, decorative panel borders)
- **Per-agent rune sigils:** to be commissioned via Midjourney with each agent's distinct visual lane
- **Goal:** "good-looking, on-brand with the agent" — no academic rigidity, but no generic geometry either

---

## Norse Vocabulary (locked glossary)

| English concept | Norse / dashboard term |
|---|---|
| Operator / You | **Realm Lord** / Lord Woody |
| Goals / North star | **Wyrd** (the Three Norns' weaving) |
| Net worth / Finances | **Hoard** |
| Health / Body | **Forge** |
| Habits / Routines | **Daily Rites** |
| Journal / Reflection | **Saga** |
| Skills library | **Yggdrasil** |
| Memory / Recall | **Mímir's Well** |
| Activity log | **Heimdall's Watch** |
| System health | "AIOS Doctor" (kept operational, not mythic) |
| Trading | **Slate of Fates** |
| Prompt bar | **Odin's Ear** |
| Memory search drawer | **The Ravens** (Oracle Drawer) |
| The dashboard itself | **Woody's Realm** |
| Lock screen | "Realm sealed" / "Realm open" |
| Realm status states | 🟢 Realm at peace · 🟡 Realm under watch · 🔴 Storm in the realm |

**Rule:** Codex must not invent new Norse vocabulary without ping. Vocabulary stays everywhere (semantic naming). Decoration stays surgical (one rune moment per surface, primarily the SessionGlyph).

---

## Information Architecture

### Sidebar (256px, dark, left)
```
[Vegvísir sigil]
WOODY'S REALM
Operator · 2026-05-18

NAV
▸ Home

REALM
▸ Yggdrasil          (was /skills)
▸ Mímir's Well       (was /memory)
▸ Heimdall's Watch   (was /activity)

AGENTS
▸ LEBOT JAMES · All-Father (gold/purple)
▸ THOR · Thunder (electric blue) [v1.5]
▸ PERSEUS · Prince of Parleys (emerald) [v1.5]
▸ FENRIR · Wolf of the Forge (blood-red) [v2]
▸ SAURON · The All-Seeing Eye (orange) [v1.5]

[bell icon top-right — notification history]
● localhost:3737
```

### Routes
- `/` — Home (Lebot James's domain)
- `/thor` — Thor's chat surface
- `/perseus` — Perseus's chat surface
- `/fenrir` — Fenrir's chat surface
- `/sauron` — Sauron's chat surface
- `/trading` — full trading view (already built by Codex)
- `/skills` — Yggdrasil page (v2 hero viz here)
- `/memory` — Mímir's Well browser
- `/activity` — Heimdall's Watch archive

### Home composition (Slice 3 target)
```
┌──────────────────────────────────────────────────────────────┐
│ HERO BANDS (cinematic welcome)                               │
│   [4-scene background by time of day]                        │
│   Good morning, Lord Woody                                   │
│   Tuesday · 7:14am · Realm at peace                          │
├──────────────────────────────────────────────────────────────┤
│ PULSE STRIP (64px)                                           │
│ 🟢 Realm at peace · Tue 7:14am CDT (NYSE 8:14am ET) · ⚜    │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────┐  ┌──────────────────┐         │
│ │ NEXT ACTION CARD (62%)     │  │ SESSION GLYPH    │         │
│ │ Cinzel ≥24px               │  │ (38%)            │         │
│ │ Generous padding           │  │ Lebot James      │         │
│ │ ONE action button          │  │ sigil animated   │         │
│ └────────────────────────────┘  └──────────────────┘         │
├──────────────────────────────────────────────────────────────┤
│ TODAY'S WYRD strip                                           │
│ ⚲ AIOS power-up · on track                                  │
│ ◆ Lucky Dog launch · paused                                  │
│ ✷ AI consulting · next: outreach                             │
├──────────────────────────────────────────────────────────────┤
│ DOMAIN ROW (2/1/1 grid)                                      │
│ ┌──────────────────┐  ┌────────┐  ┌────────┐                 │
│ │ Slate of Fates 2x│  │ Doctor │  │ Today's│                 │
│ │ (Trading)        │  │        │  │ Rites  │                 │
│ └──────────────────┘  └────────┘  └────────┘                 │
├──────────────────────────────────────────────────────────────┤
│ HEIMDALL'S WATCH (Activity Stream — dense terminal style)    │
│ [21:14] doctor   NPX cache healed                            │
│ [21:08] trading  morning brief refreshed                     │
│ [21:02] task     created 'review slate'                      │
│ [20:55] forge    apple health synced                         │
│ ...                                                          │
└──────────────────────────────────────────────────────────────┘
```

### NextActionCard priority logic (locked, 5-level)
1. **Doctor CRITICAL** (status=crit OR deferred>0) → `{verb: "Open Doctor log", href: "/api/doctor", hotness: 3}`
2. **Open critical task** (priority=3, status≠done) → `{verb: "Open task", href: "/", hotness: 3}`
3. **Trading slate ready + market open** (within 15min lock) → `{verb: "Open slate", href: "/trading", hotness: 2}`
4. **Open position move >3% intraday** → `{verb: "Review position", href: "/trading", hotness: 2}`
5. **Doctor WARN with staleness >24h** → `{verb: "Run Doctor", hotness: 1}`
6. **All-clear / empty state** → rune sigil + atmospheric copy ("Realm at peace. Move with the day.") — hotness 0

### Activity Stream
- Dense terminal-like (12-15 rows, monospaced timestamps, tight leading)
- Reads unified event log: Doctor `fixedItems` (last 4) + Tasks creates/completes + Trading file mtimes + Forge syncs
- Newest first, JetBrains Mono font, deep-bg panel
- Empty state: *"The realm is quiet. Heimdall watches."*

### PulseStrip (replaces StatRow entirely)
- 64px tall, full-width
- Left: Realm Status state (🟢/🟡/🔴 + label)
- Center: Live clock (local time, refresh every 60s)
- Right-center: Market state (`market closed` / `regular hours` / `extended hours`) — both your local + NYSE Eastern (dual display)
- Far right: small ornament (⚜ or stylized rune)

### Mode shifts (4 modes, layout-CONSISTENT)
Layout never changes. Only **background image + mood-shift hue + greeting copy** change per mode:

| Mode | Hours | Background | Hue shift | Greeting |
|---|---|---|---|---|
| **DAWN** | 5-9am | Asgard golden hall | Warm gold | "Good morning, Lord Woody" |
| **DAY** | 9am-5pm | Mount Olympus | Cool gold/white | "Strength to you, Lord Woody" |
| **DUSK** | 5-9pm | Mordor distance (Sauron's tower visible) | Amber/red | "Welcome back, Lord Woody" |
| **NIGHT** | 9pm-5am | Norse stars (Yggdrasil under cosmos) | Deep blue/silver | "Evening, Realm Lord" |

**Mood-shift only** — no panel rearrangement, no layout drama. Smooth cross-dissolve on background image (~1s).

### Welcome variations (special days)
- **Birthday**: "A new year of conquest, Lord Woody."
- **Monday morning**: "The week begins. Fenrir stirs."
- **Friday evening**: "The week's hunt is done. Rest well."
- **Market crash day (-3%+ S&P)**: "Storm in Midgard."
- **Win-streak day (trading wins)**: "The Wyrd favors you."

---

## Data Layer

### PanelCard contract (locked, every domain inherits)
```ts
export type PanelCard = {
  freshness: { iso: string; staleAfterMs: number };
  headline: string;          // ≤80 chars
  detail?: string;
  nextAction: { verb: string; href: string; hotness: 0|1|2|3 } | null;
  source: 'parlay-bot' | 'morning-brief' | 'aios-doctor' | 'apple-health' | 'plaid' | 'manual';
};
```
**Universal rule:** If a domain can't fill `{freshness, headline, nextAction}` honestly, it doesn't get a home-screen card.

### Refresh cadence
- **Background auto-refresh every 60s** (Doctor, Trading, Tasks, Forge, Daily Rites)
- **Live clock** in PulseStrip — 60s tick
- Stale-data thresholds per-domain tuned: Doctor 12h, Trading slate 4h, Tasks 7d, Forge 2d

### Data sources locked
| Domain | v1 source | v2 source |
|---|---|---|
| Doctor | `~/.claude/logs/aios-doctor/last-run.json` | unchanged |
| Trading | ParlayBot SQLite (`parlay-bot/data/parlay_bot.db`) + Morning Brief markdown | unchanged + Robinhood/TradingView later |
| Tasks | `dashboard/data/tasks.db` (SQLite WAL) | unchanged |
| Hoard | "Plaid not yet linked" placeholder | **Plaid + Gusto** integration |
| Forge | "Bind to Apple Health" placeholder | Weekly XML export from iPhone → parsed into SQLite |
| Daily Rites | manual toggle per habit | Apple Health auto-detect for workouts |
| Saga | Voice-first via Whisper-Dictate → Obsidian Daily Notes (`Obsidian Vault/Daily Notes/YYYY-MM-DD.md`) | unchanged |
| Calendar | Google Calendar via CalDAV/API | unchanged |
| Weather | OpenWeather free tier (1000 calls/day) | unchanged |
| Quotes | `dashboard/data/quotes.json` (100 curated) | unchanged, add more |

### Tasks → Obsidian mirror
- SQLite stays canonical
- Nightly job at midnight exports today's tasks + status to `Obsidian Vault/Daily/YYYY-MM-DD.md` (read-only mirror)

### Backups
- Auto-backup daily at 3am to `dashboard/data/backups/`
- Retention: last 30 days
- Files: tasks.db, saga (if SQLite), health imports

---

## Life-Dashboard Panels (v2 scope)

### Hoard (Finances)
- **v1:** Single elegant "Plaid not yet linked" card. Norse copy: *"The Hoard waits. Bind your treasury to view."*
- **v2:** Plaid integration (Chase + bank accounts) + Gusto (salary). Shows: month income, month spend, net worth trend (12mo sparkline), treasure-goal progress bar
- **Privacy:** Blurred by default (per-panel toggle to reveal)

### Forge (Health)
- **Source:** Weekly Apple Health XML export → parsed to SQLite
- **Visualization:** Apple-style **3 Activity Rings** as hero — 🏋️ Forge (movement) · ✍️ Saga (write/journal) · ⚔️ Trade (market review)
- **Stats below rings:** weight today + 30d trend, sleep last night + avg, workouts this week
- **Fallback:** If Apple Health stale >2d, manual entry form appears in the panel
- **Privacy:** Blurred by default

### Daily Rites (Habits)
- **Visualization:** Apple Activity Rings (3 rings, glanceable)
- Each habit closes its ring when done today; streak counter underneath (⚡ 12-day streak)
- **Norse touch:** Each habit gets a rune assignment

### Saga (Journal)
- **Voice-first:** Click "Speak the Saga" → Whisper-Dictate captures → transcribed text appears → confirm/edit → saves to `Obsidian Vault/Daily Notes/YYYY-MM-DD.md`
- Today's entry visible + last 7 days as small cards below
- **Norse touch:** Saga entries get yearly "chapter" headers
- **Privacy:** Blurred by default

---

## Yggdrasil — Cognitive Theater (v2 home centerpiece)

### Shape
**Organic curved, hand-tuned SVG.** Calligraphic branches. Roots flow like rivers. Most cinematic, most premium-feeling, most Apple. NOT a force-directed graph.

### Anatomy
- **Roots** (3-5 visible underground): Foundations — AIOS infra, Codex, Claude Max, MCP servers, Memory
- **Trunk:** Identity — `sap-flow` animation, Vegvísir sigil mid-trunk
- **Branches (9 Realms):**

| Realm | Domain | Branch direction |
|---|---|---|
| **Asgard** | AIOS | Highest, golden |
| **Vanaheim** | Lucky Dog (web design / craft) | Mid-east |
| **Midgard** | Trading (markets + commerce) | Mid-center |
| **Niflheim** | Personal / health / journal | North, cool blue |
| **Muspelheim** | AI Consulting (creation/output) | South, ember |
| **Álfheim** | Skills library | High-east, elven-silver |
| **Jötunheim** | Risks / threats / known issues | West, gray-red |
| **Svartálfaheim** | Infrastructure / tooling | Underground-adjacent |
| **Helheim** | Archive / completed | Far north, dim |

- **Crown:** Today's Wyrd as glowing star-nodes above branches
- **Per-realm health glow:** Each branch glows by domain health — Asgard glows gold when AIOS Doctor healthy, dims when degraded. Midgard pulses on trading active days. Vanaheim shows commit recency.

### Interactivity
- **Hover** a realm node → small floating preview card with realm summary (Obsidian-graph-style)
- **Click** → navigates to that realm's dedicated page
- Layout never drags — read-only

---

## Memory + Oracle Drawer (v1.5)

### The Ravens (Oracle Drawer)
- **Trigger:** `⌘K` hotkey OR click drawer icon top-right
- **Behavior:** Slide-from-right drawer (~420px), Linear/Raycast pattern
- **Search:** Hybrid — fuzzy match first, then claude-mem vector search for semantic
- **Results:** Top 5 memories, dense layout, dismiss with `Esc`
- **Escalate button:** "Ask Lebot" at bottom → spawns `claude --print` with project context for synthesis (~$0.10-$0.50 per query, your Max plan)

### Future Sauron tab (v1.6)
- Same drawer, second tab for Sauron's web research (Exa + Firecrawl)
- "Look upon the realm..." prompt placeholder

---

## Welcome Ritual + Startup

### Startup (locked)
- **Skip heavy intro.** Asgard background fade-in + "Good morning, Lord Woody" fade-in. 1 second total.
- Mode-detected at boot → background image matches time of day
- PC autostart: configure Windows Task Scheduler to launch browser → `localhost:3737` at logon

### Daily quote system
- **Source:** `dashboard/data/quotes.json` — 100 quotes curated initially (I write v1), Woody refines
- **Mix:** Hávamál (Norse) + Stoic (Marcus Aurelius, Seneca) + biblical proverbs ("eye for eye") + LeBron quotes + Sun Tzu + curated riddles
- **Themes:** family, work ethic, justice, patience, leadership, mortality
- **Random pick** daily, rotates through 100. No API cost.

---

## Notifications

### Triggers (Telegram + desktop on critical)
- AIOS Doctor goes CRITICAL (deferred>0)
- ParlayBot slate ready + market open (within 15min lock)
- Open trading position moves >3% intraday
- Daily Rites not started by 10am

### UI: Bell icon top-right + slide-out history
- Apple pattern. Bell shows unread badge.
- Click → slide-out shows last 50 notifications with timestamps + snooze + dismiss per item

---

## Privacy

- **Blur-by-default** per-panel for Hoard, Forge, Saga
- Click panel → reveal that panel only
- Global toggle: "Realm sealed/open" in top-right
- **Auto-lock after 15min idle** (mouse + keyboard) → all sensitive panels blur
- No cloud, localhost-only, never exposed externally
- **No client-mode/showcase view** — personal dashboard only, never shown to clients

---

## Performance

- **<1s to interactive** target (Lighthouse FCP <1.5s, TTI <1s)
- `next/font` for fonts (no render-blocking @import)
- Server components by default; client only where needed (interactive forms, polling)
- Respect `prefers-reduced-motion`
- Initial paint shows shell + shimmer skeletons → real data hydrates

---

## Profile (Lord Woody)

Captured in `dashboard/data/profile.json` (read-only canonical):
```json
{
  "name": "Woody Nguyễn",
  "title": "Realm Lord",
  "timezone": "America/Chicago",
  "marketTimezone": "America/New_York",
  "birthday": "TBD",
  "northStars": [
    { "id": "aios", "label": "AIOS power-up", "sigil": "⚲" },
    { "id": "lucky-dog", "label": "Lucky Dog launch", "sigil": "◆" },
    { "id": "consulting", "label": "AI consulting", "sigil": "✷" }
  ],
  "schedule": {
    "work": { "days": ["mon","tue","wed","thu","fri"], "start": "15:00", "end": "19:00" },
    "gym":  { "preferred": "morning", "target": "daily" }
  }
}
```

---

## Roadmap

| Version | Codename | Scope |
|---|---|---|
| **v1.0** | **Bifröst** | Slice 3 ships: PulseStrip + NextActionCard + SessionGlyph + DomainRow + ActivityStream + Today's Wyrd strip + welcome ritual. Foundation hygiene from Slices 1-2.5 already in. |
| **v1.5** | **Ravens** | Oracle Drawer (⌘K, hybrid search) + Claude escalation + bell-icon notification history + remaining keyboard shortcuts + life-panel placeholders (Hoard/Forge/Daily Rites/Saga with real-data stubs) |
| **v2.0** | **Yggdrasil** | Cognitive theater hero on `/skills` route — full Yggdrasil viz with 9 realms, hover-preview, click-navigate, per-realm health glow. Life-panel real-data wiring (Apple Health + manual entry). Persona editor UI. |
| **v3.0** | **Asgard** | PWA manifest (installable on phone home screen). Tauri wrap for desktop (autostart, system tray, global hotkeys, frameless window, pop-out companion windows for second monitor). |
| **v4.0** | **Mjölnir** | (Optional) React Native / Expo mobile app — direct Apple Health integration, native push notifications. Apple Developer ($99/yr) only if shipping to App Store. |

---

## Keyboard Shortcuts (v1.5)

**Minimal set:**
- `⌘K` — Oracle Drawer (The Ravens)
- `⌘L` — Lock Realm (seal Hoard/Forge/Saga)

Other actions via mouse/UI for v1. Add more later if usage demands.

---

## Codex Implementation Rules

1. **Locked decisions in this doc are not up for debate** without Woody approving. Norse vocabulary, palette, typography, layout structure, panel split, pantheon — all locked.
2. **Codex chooses implementation tactics** (RSC vs CSC, libraries, animation lib) — but proposes major choices before committing.
3. **One PR per slice.** Atomic, reviewable, with a `docs/codex-slice-N-<name>.md` handoff.
4. **Visual changes that don't match this spec** ping Claude for review BEFORE merge.
5. **New Norse vocabulary** ping Claude before adding.
6. **Cinzel ≥24px only.** Sweep enforced.
7. **No gradients on cards.** Glow/gradient lives only in SessionGlyph + per-agent hero pages.
8. **Pure-black is banned.** Use `oklch(14% 0.005 250)` warm-black.
9. **Asymmetric layouts only.** No 50/50, no equal `grid-cols-3`.
10. **`PanelCard` contract** is universal. Any new panel that can't fill `{freshness, headline, nextAction}` honestly doesn't get home-screen real estate.

---

## What's deferred / decided NOT to build

- Sound design (deferred to post-v2 — note it, don't build it)
- Easter eggs (decided NO — serious dashboard)
- Persona sliders (decided NO — system prompts locked)
- Right-rail inspectors (decided NO — drawers + ⌘K instead)
- Client/Demo mode (decided NO — personal only)
- Drag-reorder panels (decided NO — muscle memory matters)
- Setup wizard (decided NO — solo user)
- Generic admin shadcn card grid (banned)

---

**End of design language v2. Authoritative spec. Source of truth for Codex implementation through v2.**
