# Codex Audit — AIOS Dashboard v1 Foundation

Date: 2026-05-18
Author: Codex
Status: Foundation accepted as a good starting point, but not yet the final architecture

## Verified live

Commands and results:

```bash
npm run typecheck
# pass

GET http://127.0.0.1:3737/
# 200

GET /api/doctor
# 200 with real AIOS Doctor JSON

GET /api/trading
# 200 with real trading/parlay-derived payload

GET /api/tasks
# 200 with persisted SQLite task row
```

## What is already strong

### Foundation

- New dedicated project exists and runs on localhost
- Stack is simple and durable: Next.js App Router + TypeScript + Tailwind + SQLite
- Filesystem path registry is centralized in `lib/paths.ts`
- Real local data is already being read from:
  - AIOS Doctor
  - ParlayBot artifacts
  - SQLite task store

### Product direction

- Norse theme is coherent and distinct
- The app is already closer to a "personal command dashboard" than a generic admin shell
- The codebase is small enough to refactor cleanly now before complexity compounds

## Main architectural concerns

### 1. Home screen is still panel-first, not command-center-first

Current home page:

- hero
- stat row
- 3 equal-width panels

This is serviceable, but not yet the right IA for the intended product.

Target should be:

- hero / pulse
- top-priority action zone
- domain pulse cards
- timeline / recent activity
- inspectors for memory and ops

The current layout is a good shell, but it still reads as "dashboard homepage" rather than "always-open command center."

### 2. Too much meaning is trapped in placeholders

Examples:

- `Messages` stat is hardcoded as `—`
- `PromptBar` is a stub
- `skills`, `memory`, and `activity` routes are placeholders
- `fenrir` is a placeholder

This is acceptable for foundation work, but it means the app does not yet earn the right to stay open all day.

### 3. Trading contract is too weak

`lib/trading.ts` currently finds the latest relevant files by loose filename heuristics.

That is fine for a bootstrap, but it is not durable enough for:

- richer signal cards
- summary metrics
- confidence in timestamps
- future automation

This should move toward an explicit adapter + typed normalized shape.

### 4. Error handling is too thin for a local command center

Current issue:

- server components directly read filesystem-backed data
- a malformed file or missing path can degrade whole route rendering behavior

Need:

- route-level `error.tsx`
- adapter-level safe fallbacks
- "data unavailable" states that still keep the shell stable

### 5. Fonts and tokens are not yet foundation-grade

Current issue:

- Google Fonts imported via CSS `@import`
- render-blocking and less controlled

Need:

- `next/font`
- explicit token file strategy
- final typography hierarchy locked before heavy component expansion

## What I want to try next

These are the concrete implementation experiments I want to run next.

### Track A — architecture refinement

1. Replace the current equal 3-panel home layout with a stronger hierarchy:
   - pulse hero
   - next actions
   - domain row
   - activity stream
2. Collapse top-level IA toward:
   - `/`
   - `/trading`
   - `/build`
   - `/parlay`
   and move Memory / Ops into drawers or inspectors
3. Add `docs/DATA-OWNERSHIP.md`
4. Add route-level error boundaries

### Track B — first truly useful panel

5. Make Trading the first "real" panel with stronger structure:
   - latest brief/slate source
   - recency
   - source health
   - one actionable next step
6. Replace loose file matching with a normalized trading adapter contract

### Track C — design hardening

7. Move fonts to `next/font`
8. Extract visual tokens more explicitly
9. Make panel hierarchy asymmetric and more command-room-like
10. Define the one true home-screen "priority card"

### Track D — collaboration surfaces

11. Turn `PromptBar` into a real bridge surface later, but do not wire it before the shell is worthy
12. Add explicit handoff docs so Claude and Codex can critique slices cleanly

## Recommended implementation order

1. Freeze current foundation as baseline
2. Write `PRD.md`
3. Write `DATA-OWNERSHIP.md`
4. Refactor home IA
5. Harden Trading adapter
6. Add error boundaries
7. Improve font/token layer
8. Then ask Claude for visual/UX critique on the new shell

## Questions for Claude

Please critique these specific points:

1. Should the home page move immediately to the tighter 4-route IA, or should that wait until after one stronger Trading slice?
2. What should the single most important "Next Action" card show on first open?
3. Which visual choice is the biggest risk right now:
   - Cinzel display type
   - equal-width panel grid
   - insufficient asymmetry
   - placeholder-heavy routes
4. Should Memory and Ops become right-rail inspectors now, or later?
5. What is the cleanest v1 home-screen composition that keeps the Norse atmosphere but feels premium rather than themed?

## Current verdict

Accept this codebase as the starting foundation.

Do not throw it away.

But do not treat the current IA as final.

The strongest move now is to keep the foundation and aggressively improve:

- home-screen hierarchy
- source-of-truth documentation
- trading adapter quality
- visual token discipline
- shell stability
