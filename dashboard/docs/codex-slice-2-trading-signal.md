# Codex Slice 2 — Trading Signal Contract

Date: 2026-05-18
Author: Codex
Status: implemented, verified locally, ready for Claude critique

## What shipped

### Panel contract

- Added [PANEL-CONTRACT.md](</C:/Github Repos/everything-claude-code/dashboard/docs/PANEL-CONTRACT.md>)
- Added typed signal contract at:
  - [types/panel-card.ts](</C:/Github Repos/everything-claude-code/dashboard/types/panel-card.ts>)

### Trading adapter

- Added a real adapter:
  - [lib/adapters/trading.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/adapters/trading.ts>)
- It reads:
  - latest ParlayBot slate from SQLite at `C:\Github Repos\parlay-bot\data\parlay_bot.db`
  - latest morning brief from `C:\Users\woody\TradingView Assistant\briefs`
- It returns ordered trading cards with:
  - freshness
  - headline
  - detail
  - nextAction
  - source

### Thin facade

- Reworked [lib/trading.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/trading.ts>) into a thin compatibility facade over the new adapter

### Trading API

- `/api/trading` now returns the new card-based payload
- Added `/api/trading/raw` for raw inspection of the latest brief/parlay source

### Trading panel

- [components/TradingPanel.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/TradingPanel.tsx>) now renders:
  - source labels
  - freshness status
  - real headlines
  - one real next action button per card

## Real data observed

At verification time, the panel produced:

- `PARLAY`
  - `MLB 4-leg slate · EV +121.2%`
  - sourced from ParlayBot SQLite
  - action: `Open slate`

- `BRIEF`
  - `Pre-Market Brief — Fri May 15, 2026 — 04:30 PM CT`
  - sourced from TradingView Assistant briefs folder
  - action: `Open brief`

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
GET http://127.0.0.1:3737/api/trading -> 200
GET http://127.0.0.1:3737/api/trading/raw?kind=parlay&id=5 -> 200
```

## What is still rough

1. Trading currently uses:
   - latest parlay row
   - latest brief file
   but not yet a stronger concept of "active trading state"

2. The nextAction routes currently open raw JSON payloads, which is useful for debugging but not yet elegant product behavior

3. Freshness thresholds are still judgment calls:
   - parlay: 4h
   - brief: 12h
   These may need tuning

4. We still do not have:
   - open position tracking
   - explicit market-state awareness inside the panel itself
   - richer action semantics

## Engineering take

This slice earns the Trading panel the right to exist.

It is still not the final version of Trading, but it is now:

- real
- typed
- locally sourced
- actionable

That means the home page can now be re-composed honestly around it in Slice 3.

## Questions for Claude

1. Does Trading now feel heavy enough to deserve the 2x slot in the future `2/1/1` home composition?
2. Should the panel keep both cards visible, or should one of them be elevated and the other demoted?
3. Should `Open slate` / `Open brief` remain raw/debug actions for one more slice, or should the next step be a real `/trading` domain page before home IA changes?
4. Is the current source-label + freshness + action composition the right density, or should it be calmer/more premium before Slice 3?

## Recommendation

Proceed to Slice 3 next:

- Pulse strip
- Next Action card
- Session glyph
- Asymmetric home composition
- Activity stream
