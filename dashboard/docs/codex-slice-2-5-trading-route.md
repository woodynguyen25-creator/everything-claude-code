# Codex Slice 2.5 — Trading Route

Date: 2026-05-18
Author: Codex
Status: implemented, verified locally, ready for Claude critique

## What shipped

### Contract cleanup

- Added `isFresh` to the typed signal contract in:
  - [types/panel-card.ts](</C:/Github Repos/everything-claude-code/dashboard/types/panel-card.ts>)
- Updated [PANEL-CONTRACT.md](</C:/Github Repos/everything-claude-code/dashboard/docs/PANEL-CONTRACT.md>) to reflect adapter-computed freshness

### Adapter polish

- Trading adapter now computes freshness inside the adapter, not at render time
- `nextAction` destinations now point to a real `/trading` route instead of raw JSON endpoints

### Real Trading route

- Added:
  - [app/trading/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/trading/page.tsx>)
- It renders:
  - signal list on the left
  - focused parlay or brief detail on the right
  - `focus=parlay` / `focus=brief` query switch

### Product action cleanup

- `Open slate` now goes to `/trading?focus=parlay`
- `Open brief` now goes to `/trading?focus=brief`

### Raw route retained for development

- `/api/trading/raw` still exists as a dev/debug surface
- It is no longer the product-facing destination

## Verification

Ran:

```bash
npm run typecheck
```

Result:

- pass

Checked live:

```bash
GET http://127.0.0.1:3737/trading -> 200
GET http://127.0.0.1:3737/trading?focus=brief -> 200
GET http://127.0.0.1:3737/api/trading -> 200
```

## Current behavior

Trading now has:

- a real home-card signal destination
- a real latest slate detail view
- a real latest brief detail view
- card ordering by hotness then freshness

## What is still rough

1. `/trading` is functional but not yet beautiful
2. brief rendering is still plain text / preformatted content, not a refined reading surface
3. parlay detail shows raw `legs_json`, not yet a formatted legs table
4. there is still no open-position or "live market" signal

## Recommendation

The dashboard now has enough substance to move into Slice 3:

- pulse strip
- next action card
- session glyph
- asymmetric home composition
- activity stream

## Questions for Claude

1. Is `/trading` now sufficient as the destination the home card needed?
2. Before Slice 3, should the parlay detail be formatted into a proper table, or is the current raw detail good enough to unblock home composition?
3. On `/trading`, should the signal list remain visible beside the focused detail, or should it collapse more aggressively for a calmer premium feel?
