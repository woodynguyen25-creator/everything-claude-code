## Parts 6–8 Review

### What shipped per Part

#### Part 6 — Windows auto-start assets

Created:

- [scripts/tools/start-dashboard.bat](</C:/Github Repos/everything-claude-code/dashboard/scripts/tools/start-dashboard.bat>)
- [scripts/tools/install-autostart.ps1](</C:/Github Repos/everything-claude-code/dashboard/scripts/tools/install-autostart.ps1>)

Notes:

- `install-autostart.ps1` documents exactly how Woody runs it once.
- I did **not** execute it.

#### Resolution 1 — Token Burn Meter unit fix

Updated:

- [components/TokenBurnMeter.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/TokenBurnMeter.tsx>)

Result:

- Claude and Codex now show **token volume + % of daily window**
- DeepSeek remains **real dollar spend**
- Free tiers show **$0 + quota**
- The old alarming “subscription providers as spend” behavior is gone

#### Part 7 — cost-aware triad pipeline

Created:

- [scripts/triad/forge.js](</C:/Github Repos/everything-claude-code/dashboard/scripts/triad/forge.js>)

Updated:

- [scripts/loops/lib/router.js](</C:/Github Repos/everything-claude-code/dashboard/scripts/loops/lib/router.js>)
- [app/api/forge/[action]/route.ts](</C:/Github Repos/everything-claude-code/dashboard/app/api/forge/[action]/route.ts)
- [lib/forge-actions.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/forge-actions.ts)

Supporting data/reads:

- [data/triad-usage.json](</C:/Github Repos/everything-claude-code/dashboard/data/triad-usage.json>)
- [lib/triad-usage.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/triad-usage.ts>)

What it now does:

- the 8 agent-Forging quick actions route through `scripts/triad/forge.js`
- utility actions remain direct wrappers:
  - `Refresh Metrics`
  - `Run Doctor`
- Interrogator still runs first in the UI
- triad prints a visible **Counsel Scroll** plan before work
- thinker/classifier stage records usage
- paid worker prefers DeepSeek when available
- DeepSeek cap behavior:
  - soft warning concept supported in meter/state
  - hard cap respected by the triad runner
- if DeepSeek is capped and Codex fails, the triad now **pauses and asks before using free tiers**

Codex provider:

- `router.js` now includes a real `callCodex()` path using `codex exec`
- direct shell verification worked
- inside the triad, Codex fallback is wired, but under the forced-cap smoke test it still behaved as unavailable/too slow for that request, which correctly triggered the pause message instead of silently downgrading quality

#### Part 8 — route audit + Obsidian setup

Created:

- [docs/OBSIDIAN-SETUP.md](</C:/Github Repos/everything-claude-code/dashboard/docs/OBSIDIAN-SETUP.md>)

Route cleanup decision:

- I **did not delete any additional routes** in Part 8.

### Route keep/delete decisions

#### Kept

- `/memory`
  - real Mímir’s Well surface with live data and drawer behavior
- `/activity`
  - still a standalone Heimdall’s Watch surface and clear future expansion target
- `/skills`
  - real Yggdrasil surface with hotspots
- `/skills/[realm]`
  - real realm entrypoints from `/skills`; deleting them would break navigation
- `/trading`
  - real standalone domain surface with direct relevance
- `/[agent]`
  - real council surfaces
- `/[agent]/[threadId]`
  - required for persistent councils

#### Deleted

- none in this Part

Reason:

- after the earlier council refactor, there were no remaining routes that were both fully redundant and contentless enough to delete safely

### Checkpoints passed

- `npm run typecheck` → pass
- `Remove-Item -Recurse -Force .next; npm run build` → pass
- fresh dev runtime restarted successfully on `http://127.0.0.1:3737`
- `GET /` → `200`
- `POST /api/forge/run-doctor` streamed real utility output
- `POST /api/forge/plan-today` streamed:
  - Interrogator answers
  - Counsel Scroll
  - worker output
  - final review

### Decisions I made

1. **Subscription burn normalization**
   - I used conservative token-window denominators for Claude and Codex so the bar can render honestly now without pretending subscription plans are metered.

2. **Triad verification scope**
   - I verified the live DeepSeek path end-to-end through `plan-today`.
   - I also forced the DeepSeek cap path. In that test, the system correctly paused and asked before free-tier downgrade because Codex fallback was not cleanly usable for that request.

3. **Route cleanup**
   - I kept all remaining standalone routes because each still has real value or active navigation responsibility.

### Open questions

1. Do you want a dedicated follow-up hardening pass just for the Codex worker fallback inside the triad, or is the current “pause before free-tier downgrade” behavior acceptable for now?
2. Do you want the Token Burn Meter window denominators explicitly surfaced in UI/help text, or kept implicit?
3. Should `/activity` be the next major product slice now that the Agentic OS home and triad exist?

### How to verify

#### Part 6
1. Inspect:
   - [start-dashboard.bat](</C:/Github Repos/everything-claude-code/dashboard/scripts/tools/start-dashboard.bat>)
   - [install-autostart.ps1](</C:/Github Repos/everything-claude-code/dashboard/scripts/tools/install-autostart.ps1>)
2. Confirm the script documents manual one-time install and was not run automatically.

#### Resolution 1
1. Open:
   - `http://127.0.0.1:3737`
2. Confirm:
   - Claude and Codex bars show token volume + % window
   - DeepSeek shows dollars
   - Free tiers show quota / zero-dollar language

#### Part 7
1. Click `Run Doctor`
   - expect direct utility streaming
2. Click `Plan Today`
   - answer the Interrogator
   - expect:
     - Counsel Scroll plan
     - worker output
     - final review
3. Check:
   - [data/triad-usage.json](</C:/Github Repos/everything-claude-code/dashboard/data/triad-usage.json>)
   - it should record triad stages/providers

#### Part 8
1. Read:
   - [OBSIDIAN-SETUP.md](</C:/Github Repos/everything-claude-code/dashboard/docs/OBSIDIAN-SETUP.md>)
2. Confirm it covers:
   - Custom Frames
   - Terminal profiles
   - layout
   - workspace save
   - optional `HOME.md` embed

### Final runtime note

- The dashboard is live again at `http://127.0.0.1:3737`
- REALM renders
- utility and agent-forging endpoints are both working against the fresh dev server
