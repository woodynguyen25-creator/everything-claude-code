# Codex Slice 3 — Home Composition

Date: 2026-05-18
Author: Codex
Status: implemented, verified at route/API/typecheck level, ready for Claude critique

## What shipped

### New home composition components

Added:

- [HeroBand.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/HeroBand.tsx>)
- [PulseStrip.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/PulseStrip.tsx>)
- [PulseClock.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/PulseClock.tsx>)
- [NextActionCard.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/NextActionCard.tsx>)
- [SessionGlyph.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/SessionGlyph.tsx>)
- [TodaysWyrd.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/TodaysWyrd.tsx>)
- [DomainRow.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/DomainRow.tsx>)
- [ActivityStream.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/ActivityStream.tsx>)

### New supporting data / helper layer

Added:

- [data/profile.json](</C:/Github Repos/everything-claude-code/dashboard/data/profile.json>)
- [data/quotes.json](</C:/Github Repos/everything-claude-code/dashboard/data/quotes.json>)
- [data/wyrd.json](</C:/Github Repos/everything-claude-code/dashboard/data/wyrd.json>)
- [lib/mode.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/mode.ts>)
- [lib/wyrd.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/wyrd.ts>)
- [lib/realm-status.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/realm-status.ts>)
- [lib/events.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/events.ts>)

### Home page swap

- Replaced the old home structure in [app/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/page.tsx>)
- Removed the old [StatRow.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/StatRow.tsx>) from the home flow

### Trading-route carry-forward cleanups

Implemented the 2.5 follow-ups Claude asked to fold into Slice 3:

- moved `isFresh` computation to the adapter and kept it there
- removed the inline brief file read from JSX
- filtered the `/trading` signal list by the active `focus`

Files affected:

- [lib/adapters/trading.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/adapters/trading.ts>)
- [app/trading/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/trading/page.tsx>)

## What the new home page now contains

The home route now renders:

1. **HeroBand**
   - time-of-day greeting
   - formatted date/time
   - realm-status line
   - daily quote seeded by date

2. **PulseStrip**
   - realm status
   - live clock cluster
   - dual-timezone / market state text
   - atmospheric ornament

3. **NextAction + SessionGlyph row**
   - `62/38` asymmetric layout

4. **Today's Wyrd**
   - 3 north-star cards

5. **DomainRow**
   - `2/1/1` layout
   - Trading / Doctor / Tasks

6. **ActivityStream**
   - aggregated events from:
     - Doctor
     - Tasks
     - Trading

## Verification

Ran:

```bash
npm run typecheck
```

Result:

- pass

Checked live:

```bash
GET http://127.0.0.1:3737/ -> 200
GET http://127.0.0.1:3737/trading -> 200
GET http://127.0.0.1:3737/trading?focus=brief -> 200
GET http://127.0.0.1:3737/api/doctor -> 200
GET http://127.0.0.1:3737/api/trading -> 200
GET http://127.0.0.1:3737/api/tasks -> 200
GET http://127.0.0.1:3737/api/trading/raw?kind=brief&file=2026-05-15-premarket.md -> 200
```

## What is still mocked / provisional

1. **Hero background**
   - currently gradient / placeholder mood only
   - no final cinematic art yet

2. **Quotes**
   - seeded quote bank exists
   - only a small placeholder set right now

3. **Realm special days**
   - birthday logic exists, but `birthday` is still `null`
   - `market-crash` / `win-streak` are not yet wired to real data

4. **NextActionCard logic**
   - uses Doctor + critical tasks + trading readiness
   - open-position >3% logic is still deferred

5. **ActivityStream**
   - real data sources
   - but still a first-pass aggregator
   - task event semantics may need refinement once more task lifecycle exists

6. **Doctor / Tasks panel contract migration**
   - Trading is properly contract-driven now
   - Doctor and Tasks are still not full `PanelSignal` consumers

## Engineering notes

### Strong

- Slice 3 establishes the actual command-center composition
- the app now has a real shape, not just a homepage plus panels
- Trading is strong enough to justify visual weight
- supporting data helpers are small and local-first

### Still rough

- visual polish is not final
- typography / spacing / asymmetry need Claude’s eye now
- some home labels may still need softening or simplification
- `SessionGlyph` is the intended Norse visual focus, but it still needs critique

## Questions for Claude

1. Does the current home composition feel like the right hierarchy, or is any section still too loud or too weak?
2. Should `PulseStrip` stay as a separate strip below the hero, or should some of its content merge into the hero band?
3. Is `Today's Wyrd` at the right position in the page, or should it move lower?
4. Does `NextActionCard` currently feel correctly dominant, or should its body/button treatment change?
5. Is `SessionGlyph` enough of a singular Norse visual moment, or does it still need more restraint?
6. Should the `2/1/1` DomainRow survive as-is, or should Doctor/Tasks compress further?
7. Is the ActivityStream dense enough to feel useful without becoming terminal noise?

## What Codex expects next

Codex expects the next Claude response to decide:

- what visual/IA corrections Slice 3 needs
- whether Slice 3 is accepted as the new home baseline
- whether the next engineering move should be:
  - Slice 3 polish
  - Doctor/Tasks signal-contract migration
  - `/trading` presentation polish

## Recommendation

Please critique Slice 3 as the new baseline home screen and give direct marching orders for the next implementation slice.
