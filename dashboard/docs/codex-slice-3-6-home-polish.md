# Codex Slice 3.6 — Home Polish + Council Expansion

Date: 2026-05-18
Author: Codex
Status: implemented, verified, ready for Claude critique

## What shipped

### Sidebar Council expansion

The sidebar now shows the full five-agent Council:

- `AIOS-AGENT` → `/lebot-james`
- `THOR-AGENT` → `/thor`
- `PERSEUS-AGENT` → `/perseus`
- `FENRIR-AGENT` → `/fenrir`
- `SAURON-AGENT` → `/sauron`

Supporting pieces added:

- [components/AgentCard.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/AgentCard.tsx>)
- [components/VegvisirSigil.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/VegvisirSigil.tsx>)
- [components/ConnectionsStrip.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/ConnectionsStrip.tsx>)
- [lib/agent-status.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/agent-status.ts>)

Sidebar upgrades now present:

- brand block reads `WOODY'S REALM`
- Vegvisir sigil added
- live operator date added
- footer includes 8-MCP connections strip plus localhost row
- cards have portrait slots with emoji fallback
- status dots are wired to real logic where available

### New Council route stubs

Added:

- [app/thor/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/thor/page.tsx>)
- [app/perseus/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/perseus/page.tsx>)
- [app/sauron/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/sauron/page.tsx>)

Existing and preserved:

- [app/lebot-james/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/lebot-james/page.tsx>)
- [app/fenrir/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/fenrir/page.tsx>)

### Hero scene wiring

Added:

- [lib/scenes.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/scenes.ts)

Updated:

- [components/HeroBand.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/HeroBand.tsx)

Behavior:

- if a real scene image exists for the current mode, HeroBand can render it
- otherwise it falls back to the gradient-based mood treatment

Current reality:

- `public/art/scenes/*.webp` are not present yet
- the gradient fallback path is active and working

### Home polish

Added:

- [components/AmbientEmbers.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/AmbientEmbers.tsx)

Updated:

- [app/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/page.tsx>)
- [components/SessionGlyph.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/SessionGlyph.tsx>)
- [app/globals.css](</C:/Github Repos/everything-claude-code/dashboard/app/globals.css>)
- [tailwind.config.ts](</C:/Github Repos/everything-claude-code/dashboard/tailwind.config.ts>)

Behavior:

- ambient ember drift on home
- staggered entrance on home sections
- SessionGlyph radial glow + 4s breath animation

### /skills Yggdrasil fallback surface

Updated:

- [app/skills/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/skills/page.tsx>)

Behavior:

- if the night scene exists, it is ready to host hotspot overlay
- otherwise it renders a real fallback realm list/grid

Current reality:

- the image is not present yet
- the fallback list/grid is the active UX

### Supporting integration changes

Updated:

- [app/layout.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/layout.tsx>)
- [components/Sidebar.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/Sidebar.tsx>)

Layout now:

- computes agent statuses server-side
- passes operator date into the sidebar

## Verification

### Typecheck

Ran:

```bash
npm run typecheck
```

Result:

- pass

### Build

Ran:

```bash
npm run build
```

Result:

- pass

### Route verification

Verified with direct route checks:

```bash
GET /            -> 200
GET /lebot-james -> 200
GET /fenrir      -> 200
GET /thor        -> 200
GET /perseus     -> 200
GET /sauron      -> 200
GET /skills      -> 200
GET /trading     -> 200
GET /api/doctor  -> 200
GET /api/trading -> 200
GET /api/tasks   -> 200
```

### Content-level checks

Confirmed:

- `WOODY'S REALM` appears in the sidebar
- all 5 council cards appear
- `/skills` fallback shows realm cards including Asgard, Vanaheim, Midgard, and Helheim
- `/lebot-james` renders the correct stub copy

## Notes

1. `AWAITING THE RAVENS` remains on `/lebot-james`
   - this matches the most recent Claude direction and was intentionally kept

2. Council portrait slots currently use emoji fallback
   - real image pickup will happen automatically once canonical sigils land at `public/art/agents/sigils/*.png`

3. HeroBand is scene-aware but still in fallback mode
   - this is expected until the scene assets land

## What is still deferred

Still deferred to Slice 4 / later:

- Ravens drawer / command palette
- live agent chat surfaces
- per-panel Ask-agent buttons
- notification history
- true Yggdrasil hotspot overlay against a real night scene
- deeper life-dashboard expansion

## Questions for Claude

1. Is Slice 3.6 accepted as the new baseline?
2. Should the next slice be:
   - Slice 4 / Ravens
   - more home polish
   - Doctor/Tasks visual refinement
3. Is any additional council/sidebar tuning needed before Ravens?
4. Is the current `/skills` fallback sufficient until the scene lands?
5. What are the exact next 3 implementation priorities?

## Recommendation

The dashboard is stable enough to move forward.

My recommendation is:

- accept Slice 3.6
- use Claude to direct the next exact slice
- then move into Slice 4 / Ravens rather than continuing to polish static surfaces
