# Codex Slice 3.5 — Migration + Polish

Date: 2026-05-18
Author: Codex
Status: implemented, route-healthy, ready for Claude critique

## What shipped

### 1. Home and Lebot separation

Implemented the architectural split Claude requested:

- `/` remains the operator home
- added a new dedicated route:
  - [app/lebot-james/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/lebot-james/page.tsx>)

Sidebar now points:

- `AIOS-AGENT` → `/lebot-james`
- `FENRIR-AGENT` → `/fenrir`

And the primary agent label is now:

- `Lebot James · All-Father`

### 2. SessionGlyph swap

Replaced the home glyph treatment with a Vegvisir-style realm mark in:

- [components/SessionGlyph.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/SessionGlyph.tsx>)

It keeps:

- slow 12s outer rotation
- rune glow
- critical-state red center

### 3. Doctor and Tasks panel migration

Doctor and Tasks are now closer to the same home-card signal pattern as Trading.

Added:

- [lib/doctor-signal.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/doctor-signal.ts)

Updated:

- [components/DoctorPanel.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/DoctorPanel.tsx)
- [components/TasksPanel.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/TasksPanel.tsx)
- [lib/tasks.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/tasks.ts)

Tasks now expose:

- `updatedAt`
- recent task events
- open critical task lookup
- `getTasksSignal()`

### 4. Hero / mode / profile polish

Updated:

- [components/HeroBand.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/HeroBand.tsx)
- [components/PulseClock.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/PulseClock.tsx)
- [lib/mode.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/mode.ts)
- [data/profile.json](</C:/Github Repos/everything-claude-code/dashboard/data/profile.json)

Applied:

- removed duplicated realm-status text from HeroBand
- fixed weekend greeting logic
- changed PulseClock separator to `·`
- filled in work hours + gym schedule

### 5. Layout polish

Updated:

- [components/DomainRow.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/DomainRow.tsx)
- [components/NextActionCard.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/NextActionCard.tsx)

Applied:

- tablet fallback on DomainRow (`md:grid-cols-2`)
- NextAction body bumped to `text-base`
- cleaned hotness helper typing

### 6. Persona reader

Added:

- [lib/personas.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/personas.ts)

This allows the dashboard to read locked persona metadata without editing the persona files themselves.

## Verified health

### Typecheck

Ran:

```bash
npm run typecheck
```

Result:

- pass

### Route / API health

Confirmed healthy:

```bash
GET /               -> 200
GET /lebot-james    -> 200
GET /fenrir         -> 200
GET /trading        -> 200
GET /api/doctor     -> 200
GET /api/trading    -> 200
GET /api/tasks      -> 200
```

Note:

- `Invoke-WebRequest` from PowerShell was misleading during verification and appeared to stall on page routes
- plain HTTP probing via `curl.exe -I` and route-specific checks showed the pages are in fact serving
- `next build` also succeeded cleanly, which strongly supports that the app state is healthy

## Visible outcomes

Confirmed:

- sidebar agent route now points to `/lebot-james`
- `/lebot-james` renders the correct stub
- home page still shows:
  - `Slate of Fates`
  - `Today's Watch`
  - `Activity`
  - `AIOS power-up`

## What is still rough / deferred

1. Doctor and Tasks are closer to the Trading signal model, but not yet fully using a single shared visual panel renderer
2. `/lebot-james` is intentionally just a stub until Slice 4
3. The 100-quote bank is present and read, but I did not do a day-to-day visual verification sweep
4. The "realm label appears once" check is visually correct, but raw HTML source still shows duplicated server-component transport data for that phrase. This appears to be serialization noise, not a visible UI duplication.

## Important debugging note

The main slowdown during this slice was not implementation complexity — it was runtime verification noise:

- dev-server page-route checks were misleading under PowerShell
- APIs stayed healthy throughout
- `next build` succeeded
- the final route health looks good under direct HTTP probing

This is worth noting so nobody overreacts to the earlier false-negative route checks.

## What Codex thinks next

The dashboard is now in a good place for Claude to answer:

1. Is Slice 3.5 accepted as the new baseline?
2. Should the next step be:
   - Slice 3.5 visual/IA polish
   - full Doctor/Tasks visual unification
   - Slice 4 / Hugin planning
3. Does `/lebot-james` need any stronger stub treatment before Slice 4?
4. Is the home page now compositionally right enough to stabilize for a bit?

## Questions for Claude

1. Is Slice 3.5 accepted as the new baseline?
2. Do Doctor and Tasks need another immediate pass to visually match Trading more tightly, or is this enough for now?
3. Should `/lebot-james` stay as-is until Slice 4, or should the stub become more cinematic before the chat surface lands?
4. Is the Vegvisir glyph the right permanent home mark, or does it need any visual restraint/tuning before we leave it alone?
5. What are the exact next 3 implementation priorities from here?
