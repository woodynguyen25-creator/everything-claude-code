## Heimdall Review — 2026-05-25

### What shipped

#### Refinement B — Token Burn denominators surfaced

Updated:

- [components/TokenBurnMeter.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/TokenBurnMeter.tsx>)

What changed:

- Claude and Codex bars now expose their denominator logic via subtle `?` help affordances
- Claude tooltip explains:
  - subscription plan
  - token-window estimate
  - value vs spend distinction
- Codex tooltip explains:
  - token-window estimate
  - usage rhythm, not metered spend
- DeepSeek tooltip explains:
  - real metered spend
  - balance framing

#### Refinement A — Codex worker hardening

Updated:

- [scripts/loops/lib/router.js](</C:/Github Repos/everything-claude-code/dashboard/scripts/loops/lib/router.js>)
- [scripts/triad/forge.js](</C:/Github Repos/everything-claude-code/dashboard/scripts/triad/forge.js>)

What changed:

- `callCodex()` now uses a real `codex exec` path
- Codex provider is exported from the router and callable by the triad
- the triad still preserves the pause-before-free-tier floor
- stage-level usage is now written into `triad-usage.json`
- when DeepSeek is capped and Codex fails/unavailable, the triad now returns the explicit pause message instead of a raw provider failure

Hardening result:

- direct `codex exec` path is working from the shell
- routed Codex fallback is wired and reaches the pause logic correctly
- the remaining rough edge is not silent failure, but that Codex can still be slow or unavailable enough under the triad path that the system falls back to the correct pause message

#### Main slice — Heimdall's Watch (`/activity`)

Created:

- [lib/activity.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/activity.ts>)
- [lib/activity-log.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/activity-log.ts>)
- [app/api/activity/route.ts](</C:/Github Repos/everything-claude-code/dashboard/app/api/activity/route.ts>)
- [components/ActivityTimeline.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/ActivityTimeline.tsx>)

Updated:

- [app/activity/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/activity/page.tsx>)
- [lib/events.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/events.ts>)
- [app/api/forge/[action]/route.ts](</C:/Github Repos/everything-claude-code/dashboard/app/api/forge/[action]/route.ts>)
- [lib/chat.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/chat.ts>)
- [lib/forge-actions.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/forge-actions.ts>)

What Heimdall does now:

- `/activity` is a real page, not a stub
- `/api/activity` serves aggregated events
- filter chips:
  - kind
  - agent
  - time window
- dense terminal-style timeline
- right tally rail
- 30s polling
- keyboard navigation:
  - `↑/↓`
  - `Enter`

### The 6 activity sources verified wired

Verified through `/api/activity`:

1. **Triad Forgings**
   - source: [data/triad-usage.json](</C:/Github Repos/everything-claude-code/dashboard/data/triad-usage.json>)
   - sample seen: `plan-today · thinker-classifier via cerebras`

2. **Quick Action runs**
   - source: [data/activity-log.json](</C:/Github Repos/everything-claude-code/dashboard/data/activity-log.json>)
   - sample seen: `run-doctor started` and `run-doctor completed`

3. **Doctor history**
   - source: `~/.claude/logs/aios-doctor/last-run.json` + savepoints
   - sample savepoint events surfaced

4. **Dreaming Surfaces**
   - source: [data/aios-stats.json](</C:/Github Repos/everything-claude-code/dashboard/data/aios-stats.json>)
   - sample dreams surfaced

5. **Council sessions**
   - source: council chat threads in [data/tasks.db](</C:/Github Repos/everything-claude-code/dashboard/data/tasks.db>)
   - sample surfaced: `/thor/1`

6. **Saga / Daily Notes**
   - source: Obsidian Daily Notes
   - sample surfaced: `2026-05-21.md`

### Checkpoints

- `npm run typecheck` → pass
- `Remove-Item -Recurse -Force .next; npm run build` → pass
- fresh dev server restarted successfully at `http://127.0.0.1:3737`
- `GET /activity` → `200`
- `GET /api/activity?limit=8` → real aggregated events
- a new Quick Action run appeared in `/api/activity?kind=forge` after the 30s cache window

### Codex-worker hardening test result

What I verified:

- direct `codex exec` works non-interactively from the shell
- DeepSeek live worker path through the triad is still good
- forced DeepSeek-cap path:
  - Counsel Scroll correctly re-routed to Codex
  - when Codex did not complete cleanly in that path, the system correctly paused and asked before dropping to free models

So the result is:

- **safe and correct fallback behavior is verified**
- **Codex-worker reliability improved**
- **Codex-worker perfection under triad load is not fully proven yet**

That is better than before, because it is now diagnosable and safe rather than flaky and opaque.

### Open questions

1. Do you want the next pass to focus specifically on making Codex the reliable first fallback when DeepSeek is capped, or is the current safe pause behavior sufficient?
2. Should Heimdall’s right-hand tally rail stay this minimal, or do you want it to expand into a denser operator rail in the next slice?
3. Do you want `/activity` to start surfacing more task/trading-specific deep history next, or keep it broad and realm-wide?
