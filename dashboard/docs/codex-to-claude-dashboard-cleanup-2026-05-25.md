## Dashboard Cleanup Deep Dive — 2026-05-25

### Goal
- Simplify the dashboard after multiple stacked feature passes.
- Remove dead home-era UI code.
- Leave Claude with one accurate picture of what is live, what is dormant, and what was intentionally trimmed.

### What I cleaned up

#### 1. Home architecture
- Kept the Pass 5 bento home as the canonical layout.
- Confirmed the current REALM home is:
  - HeroBand
  - DailyRitesPanel
  - InternshipPanel
  - Workout + Finance pair
  - Unusual Options + News pair
  - DreamingSurfaces
  - NextActionCard
  - SystemPulseStrip
- Rewrote the dashboard state doc to reflect this, because the previous state doc still described the older stacked home.

#### 2. Dead component removal
- Deleted unused legacy home/footer components that were no longer imported anywhere in live source:
  - `components/KpiStrip.tsx`
  - `components/PulseStrip.tsx`
  - `components/McpStrip.tsx`
  - `components/DomainRow.tsx`
  - `components/LatestForging.tsx`
  - `components/QuickActionsGrid.tsx`
  - `components/TodaysWyrd.tsx`
  - `components/TokenBurnMeter.tsx`
  - `components/UsageAccordion.tsx`
- Deleted the fully orphaned domain-row dependency chain:
  - `components/DoctorPanel.tsx`
  - `components/TradingPanel.tsx`
  - `components/TasksPanel.tsx`
  - `components/AskAgentButton.tsx`
  - `components/PulseClock.tsx`
- Deleted `components/ui/TracingBeam.tsx`, since the home page no longer uses it and it was explicitly removed from the design direction.

#### 3. Motion/package cleanup
- Replaced `BorderBeam`'s `framer-motion` implementation with a CSS-only implementation.
- Removed `framer-motion` from `package.json` and lockfile.
- Kept the active sidebar council glow effect while cutting the motion dependency entirely.

#### 4. Habit / internship state remains aligned
- Kept the `stocks` → `apply` habit migration.
- Kept the new internship SQLite/API/panel system.
- Left the new home route and SystemPulseStrip intact.

#### 5. Tab-shell cleanup
- Kept the lazy-loaded tab split for:
  - `CouncilTab`
  - `SagaTab`
  - `YggdrasilTab`
- This keeps the REALM first-load path lighter and separates the non-default surfaces more clearly.

### Important architectural state

#### Live and active
- Council routes + God Mode
- Heimdall activity aggregation
- Mímir memory browser
- Yggdrasil routes
- Trading route
- Hermes route
- Internship tracking
- SystemPulseStrip footer
- Ravens drawer
- Forge APIs / triad backend

#### Backend exists, UI currently unsurfaced
- Quick Actions backend at `/api/forge/[action]`
- The old dedicated `QuickActionsGrid` UI was removed during cleanup because the home page no longer uses it

### Verification
- `npm run build` passes
- `npm run typecheck` passes

### Current build numbers
- `/` first-load JS: `147 kB`
- `/activity`: `133 kB`
- `/memory`: `135 kB`

### Notes on bundle work
- The cleanup pass improved maintainability more than raw bundle size.
- The biggest concrete code-size cleanup was removing `framer-motion`.
- The home route is still above the original `140 kB` aspiration, but it is materially cleaner and less fragile than the earlier stacked-home state.

### Files added this cleanup pass
- `docs/codex-cleanup-plan-2026-05-25.md`
- `docs/codex-to-claude-dashboard-cleanup-2026-05-25.md`

### Files materially updated this cleanup pass
- `docs/DASHBOARD-STATE-2026-05-25.md`
- `app/globals.css`
- `components/ui/BorderBeam.tsx`
- `package.json`
- lockfile

### Risks / things intentionally left
- I did not remove backend triad/forge infrastructure even though the dedicated home quick-actions panel is gone; that backend is still real and useful.
- I did not remove `ConnectionsStrip`, `AnimatedRaven`, `VegvisirSigil`, or active council/chat infrastructure because they are still live.
- I did not chase the Windows local runtime bootstrap issue further in this cleanup pass; the codebase verifies cleanly via build/typecheck, but shell-driven live startup on this machine remains its own operational nuisance.

### Recommended next move for Claude
1. Decide whether Quick Actions should return as a dedicated route/panel or stay backend-only.
2. Decide whether the home route should be pushed below `140 kB` with a deeper sidebar/client-shell reduction.
3. Use `DASHBOARD-STATE-2026-05-25.md` as the new source of truth, not the older home-stack docs.
