## Agentic OS — Parts 1–5 Review

### What shipped per Part

#### Part 1 — render.js JSON output
- Added JSON output to `C:\Users\woody\.claude\scripts\aios-dashboard\render.js`
- New typed reader:
  - [lib/aios-stats.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/aios-stats.ts>)
- Verified:
  - `node "C:\Users\woody\.claude\scripts\aios-dashboard\render.js"`
  - [data/aios-stats.json](</C:/Github Repos/everything-claude-code/dashboard/data/aios-stats.json>) now exists and is populated

#### Part 2 — KPI Strip
- Added:
  - [components/KpiStrip.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/KpiStrip.tsx>)
- Uses real data from:
  - trading adapter
  - doctor signal
  - tasks SQLite
- Verified on `/` with real values rendered

#### Part 4 — Token Burn Meter
- Added:
  - [components/TokenBurnMeter.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/TokenBurnMeter.tsx>)
  - [lib/codex-usage.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/codex-usage.ts>)
  - [lib/triad-usage.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/triad-usage.ts>)
  - [scripts/tools/poll-codex-usage.js](</C:/Github Repos/everything-claude-code/dashboard/scripts/tools/poll-codex-usage.js>)
  - [data/triad-usage.json](</C:/Github Repos/everything-claude-code/dashboard/data/triad-usage.json>)
- Verified:
  - `node scripts/tools/poll-codex-usage.js`
  - [data/codex-usage.json](</C:/Github Repos/everything-claude-code/dashboard/data/codex-usage.json>) now exists and parses

#### Part 5 — Quick Actions Grid
- Added:
  - [components/QuickActionsGrid.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/QuickActionsGrid.tsx>)
  - [app/api/forge/[action]/route.ts](</C:/Github Repos/everything-claude-code/dashboard/app/api/forge/[action]/route.ts>)
  - [lib/forge-actions.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/forge-actions.ts>)
- Added conservative wrapper scripts for current session:
  - [scripts/tools/refresh-metrics.js](</C:/Github Repos/everything-claude-code/dashboard/scripts/tools/refresh-metrics.js>)
  - [scripts/tools/run-doctor.js](</C:/Github Repos/everything-claude-code/dashboard/scripts/tools/run-doctor.js>)
  - [scripts/tools/plan-today.js](</C:/Github Repos/everything-claude-code/dashboard/scripts/tools/plan-today.js>)
  - [scripts/tools/process-inbox.js](</C:/Github Repos/everything-claude-code/dashboard/scripts/tools/process-inbox.js>)
  - [scripts/tools/vault-cleanup.js](</C:/Github Repos/everything-claude-code/dashboard/scripts/tools/vault-cleanup.js>)
- Verified end-to-end:
  - `POST /api/forge/run-doctor` streamed doctor output
  - `POST /api/forge/plan-today` streamed the Interrogator answers and wrote a plan to the daily note

#### Part 3 — Agentic OS REALM home
- Added:
  - [components/AgenticOsTabs.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/AgenticOsTabs.tsx>)
  - [components/LatestForging.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/LatestForging.tsx>)
  - [components/DreamingSurfaces.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/DreamingSurfaces.tsx>)
  - [components/McpStrip.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/McpStrip.tsx>)
- Rebuilt:
  - [app/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/page.tsx>)
- The home page now shows:
  - tab row: `REALM · COUNCIL · SAGA · YGGDRASIL`
  - REALM content:
    - HeroBand
    - Token Burn Meter
    - KPI Strip
    - Latest Forging
    - Quick Actions Grid
    - Dreaming Surfaces
    - MCP Strip
    - existing lower surfaces (`PulseStrip`, `NextActionCard`, `DomainRow`, `ActivityStream`)
  - stub panels for the three non-REALM tabs

### Checkpoints passed
- `npm run typecheck` → pass
- `Remove-Item -Recurse -Force .next; npm run build` → pass
- `GET /` → `200`
- Verified home HTML includes:
  - `REALM`
  - `COUNCIL`
  - `SAGA`
  - `YGGDRASIL`
  - `TOKEN BURN`
  - `QUICK ACTIONS`

### Decisions I made
- **Codex usage denominator:** I used a conservative daily reference budget of `1,000,000` total tokens to derive the Codex bar percentage. The raw token counts are preserved in `codex-usage.json`; the visual percentage is just a meter normalization choice.
- **DeepSeek/free burn data:** Since Part 7 is deferred, I seeded `triad-usage.json` with zero/default values so the burn meter can render honestly now and absorb real data later.
- **Quick actions before Part 7:** For actions that do not yet have a full triad implementation, I used conservative wrapper scripts rather than fake future behavior. They do useful work now and can be replaced cleanly later.
- **REALM lower stack:** I kept the accepted lower dashboard surfaces in place under the new Agentic OS sections instead of deleting them, so Parts 1–5 add the orchestration layer without regressing the already-accepted home.

### Open questions for Woody
- The Claude cost surface is showing **list-price equivalent spend** from the renderer, which is very large because it reflects estimated token economics rather than actual incremental Max-plan billing. If that is too alarming visually, I would recommend Claude give us a design call on how to label it more clearly.
- The utility wrappers for `Plan Today`, `Process Inbox`, and `Vault Cleanup` are conservative and useful, but they are not yet full triad-aware pipelines. That feels appropriate for Parts 1–5, but Claude may want to sharpen the exact follow-up path.

### How to verify each Part

#### Part 1
1. Run:
   - `node "C:\Users\woody\.claude\scripts\aios-dashboard\render.js"`
2. Confirm:
   - [data/aios-stats.json](</C:/Github Repos/everything-claude-code/dashboard/data/aios-stats.json>) exists and updates

#### Part 2
1. Open:
   - `http://127.0.0.1:3737`
2. Confirm:
   - 3 KPI cards render with real trading/doctor/tasks data

#### Part 4
1. Run:
   - `node scripts/tools/poll-codex-usage.js`
2. Confirm:
   - [data/codex-usage.json](</C:/Github Repos/everything-claude-code/dashboard/data/codex-usage.json>) exists
   - Token Burn Meter renders 4 provider bars

#### Part 5
1. Open the REALM home
2. Click:
   - `Run Doctor`
   - expect streamed doctor output in the Forging Output panel
3. Click:
   - `Plan Today`
   - answer the Interrogator prompts inline
   - expect a streamed success message and a daily-note write

#### Part 3
1. On `/`, confirm:
   - tabs exist
   - REALM is default
   - COUNCIL / SAGA / YGGDRASIL show clean stubs

### Current stop point
- Built Parts **1–5 only**
- Did **not** do Parts 6–8
- Ready for Woody review before triad/autostart work
