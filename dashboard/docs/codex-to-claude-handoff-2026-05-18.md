# Codex → Claude Handoff

Date: 2026-05-18
From: Codex (implementation lead)
To: Claude (design/UX/IA lead)
Purpose: review current implementation state, critique the next slice, and direct further implementation

---

## Executive summary

The dashboard foundation is now real and healthy.

We are building:

- a new dedicated dashboard project
- local-first
- web-first
- single-user
- no auth
- no cloud dependency in v1
- Hermes deferred
- premium hybrid Jarvis command center

The collaboration split remains:

- **Claude** = lead designer / UX / IA / product critic
- **Codex** = lead engineer / implementer / systems builder

This loop is working well and should continue.

---

## Locked decisions

Do not change these unless Woody explicitly overrides them.

1. **Project path**
   - `C:\Github Repos\everything-claude-code\dashboard`

2. **Runtime**
   - local-first web app on localhost

3. **User model**
   - single-user
   - no auth in v1

4. **Memory model**
   - repo = canonical build/spec/architecture truth
   - Obsidian = operator memory / broader life-system context
   - claude-mem = recall layer

5. **Hermes**
   - deferred
   - inspiration only, not a dependency

6. **Theme**
   - Norse vocabulary stays
   - visual treatment must remain premium and restrained, not over-themed

7. **Port**
   - `3737`

---

## What Codex has completed

### Environment / capability work

Codex was upgraded significantly before dashboard implementation began:

- broad portable Claude skill surface migrated into Codex
- `claude-mem` bridge wired into Codex
- `tradingview` + `obsidian` + `claude_mem` MCP entries present
- validation pass completed successfully

Relevant reports:

- `C:\Github Repos\everything-claude-code\codex-compat\generated\validation-summary.md`
- `C:\Github Repos\everything-claude-code\codex-compat\generated\sync-summary.md`
- `C:\Github Repos\everything-claude-code\codex-compat\generated\upstream-sync-summary.md`

### Dashboard implementation work completed

#### Foundation audit and planning

- `dashboard/HANDOFF-TO-CODEX.md`
- `dashboard/docs/codex-audit-2026-05-18.md`
- `dashboard/docs/claude-critique-2026-05-18.md`

#### Slice 1 — foundation hygiene

Implemented:

- `next/font` migration
- OKLCH tokens
- token extraction to `styles/tokens.css`
- root error boundary
- API hardening with try/catch
- nav demotion
- removed fake `Messages` stat
- renamed trading/tasks panels toward stronger language

Artifacts:

- `dashboard/docs/codex-slice-1-foundation-hygiene.md`
- `dashboard/docs/claude-critique-slice-1.md`

#### Slice 2 — trading signal contract

Implemented:

- typed panel contract
- real trading adapter
- real card freshness metadata
- card action structure
- card source metadata

Artifacts:

- `dashboard/docs/PANEL-CONTRACT.md`
- `dashboard/types/panel-card.ts`
- `dashboard/lib/adapters/trading.ts`
- `dashboard/docs/codex-slice-2-trading-signal.md`
- `dashboard/docs/claude-critique-slice-2.md`

#### Slice 2.5 — real trading destination

Implemented:

- real `/trading` route
- `Open slate` / `Open brief` now go to `/trading?...`
- adapter freshness computation moved server-side
- raw JSON route retained only as a dev/debug surface

Artifacts:

- `dashboard/app/trading/page.tsx`
- `dashboard/docs/codex-slice-2-5-trading-route.md`
- `dashboard/docs/claude-critique-slice-2-5.md`

---

## Verified current health

Latest verified state:

- `npm run typecheck` passes
- `/` returns 200
- `/trading` returns 200
- `/api/doctor` returns 200
- `/api/trading` returns 200
- `/api/tasks` returns 200

Current real data present:

- Doctor data from `~/.claude/logs/aios-doctor/last-run.json`
- Trading brief from `C:\Users\woody\TradingView Assistant\briefs\2026-05-15-premarket.md`
- ParlayBot latest slate from `C:\Github Repos\parlay-bot\data\parlay_bot.db`
- Tasks from `dashboard/data/tasks.db`

---

## Current product/architecture state

### What is strong

- local-first foundation is real
- codebase is still small and easy to reshape
- data sources are not fake anymore
- the dashboard now has at least one domain (`Trading`) that earns home-screen weight
- the collaboration loop between Claude and Codex is functioning correctly

### What is still incomplete

- home screen is still not the true command-center composition
- prompt bar is still a stub
- `/skills`, `/memory`, `/activity`, `/fenrir` remain placeholder routes
- `/trading` is functional but not yet elegant
- no activity stream yet
- no pulse strip yet
- no next-action card yet
- no session glyph hero pairing yet

---

## Current design/IA direction

The strongest agreed direction so far is:

- do **not** keep polishing `/trading`
- proceed into **Slice 3**
- build the true home-screen command-center composition next

Claude’s most recent accepted direction:

1. `/trading` is now sufficient as the real destination
2. Slice 3 should be next
3. `/trading` polish can wait

---

## What Codex wants from Claude now

Please act as lead designer / UX / IA critic for the next implementation phase.

Specifically, I want you to guide **Slice 3**:

### Slice 3 target

Build the command-center home composition:

- `PulseStrip`
- `NextActionCard`
- `SessionGlyph`
- asymmetric home layout
- `ActivityStream`

### I want your direction on:

1. The exact **home-screen composition hierarchy**
   - what should visually dominate
   - what should be subordinate
   - what should feel atmospheric vs operational

2. The exact **priority logic** for `NextActionCard`
   - especially how Doctor / Tasks / Trading should be ranked in practice

3. The exact **visual behavior** of the home hero area
   - how much motion
   - how much Norse treatment
   - how much asymmetry
   - where to be quiet vs dramatic

4. The exact **ActivityStream density**
   - should it be sparse and editorial
   - or dense and terminal-like

5. Whether the current **StatRow** should survive Slice 3 at all
   - keep it
   - compress it
   - or replace it with a stronger pulse/status structure

6. Whether there are any final **shell-level refinements** needed before Slice 3 implementation begins

---

## What Codex is likely to implement next

Unless Claude objects, Codex intends to proceed with:

1. `PulseStrip`
2. `NextActionCard`
3. `SessionGlyph`
4. home-grid asymmetry (`62/38`, then `2/1/1`)
5. `ActivityStream`

And carry these tiny cleanups inline:

- remove duplicate source reads in trading adapter
- move brief file reading fully into adapter/preload path

---

## Specific questions for Claude

Please answer clearly and decisively:

1. Is the current home `StatRow` still useful enough to preserve into Slice 3, or should it be replaced by the pulse/next-action structure?
2. What exact visual composition should the home page use after Slice 3:
   - order of sections
   - relative visual weight
   - which section gets the strongest contrast
3. Should Trading automatically hold the `2x` domain slot for now, or should that already be dynamic?
4. What should the home page intentionally **not** show yet, even if we technically could?
5. What are the top 3 design mistakes Codex should avoid while implementing Slice 3?

---

## Instructions for Claude

- Be concise
- Be decisive
- Be implementation-oriented
- Assume Codex will build whatever you recommend
- Do not rewrite the whole concept
- Critique the actual current implementation trajectory

---

## One-line current status

The dashboard foundation is healthy, Trading is now real, and Codex is ready to build the first true Jarvis-style command-center home screen — Claude should now direct Slice 3.
