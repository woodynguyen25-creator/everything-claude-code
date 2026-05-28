## Dashboard Refinement Review — 2026-05-25

### Route audit

#### Page routes

| Route | Status | Notes |
|---|---:|---|
| `/` | 200 | REALM home renders with hero, usage meter, KPI strip, quick actions, Dreaming Surfaces, Daily Rites |
| `/memory` | 200 | real memory browser, drawer, filters, shimmer + empty states |
| `/activity` | 200 | Heimdall timeline renders real aggregated events |
| `/skills` | 200 | Yggdrasil scene + hotspots |
| `/skills/asgard` | 200 | realm detail is now data-backed, no longer a hollow placeholder |
| `/trading` | 200 | latest slate is formatted into readable rows, no raw JSON |
| `/lebot-james` | 200 | centered empty-state council layout when no history |
| `/thor` | 200 | council surface with persisted thread data |
| `/perseus` | 200 | centered empty-state council layout |
| `/fenrir` | 200 | centered empty-state council layout |
| `/sauron` | 200 | centered empty-state council layout |
| `/thor/1` | 200 | council thread deep-link loads |

#### API spot-checks

| Route | Status |
|---|---:|
| `/api/activity?limit=5` | 200 |
| `/api/memory?limit=3` | 200 |
| `/api/trading` | 200 |
| `/api/doctor` | 200 |
| `/api/tasks` | 200 |
| `/api/chat/threads?agent=thor` | 200 |

### Item-by-item changes

#### 1. Markdown leaks

Fixed by introducing:

- [components/InlineMarkdown.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/InlineMarkdown.tsx>)

Applied to:

- [components/DreamingSurfaces.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/DreamingSurfaces.tsx>)
- [components/ActivityTimeline.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/ActivityTimeline.tsx>)

Result:

- no literal `**bold**` / markdown leak remains in the surfaced insight strings

#### 2. Hero

Updated:

- [components/HeroBand.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/HeroBand.tsx>)

Changes:

- removed the photo-based hero treatment
- replaced it with a full-bleed painterly token-gradient placeholder
- added stronger bottom scrim
- fixed heading leading
- left `HERO_IMAGE` as the one-line future swap point

#### 3. Token Burn `/usage`-style behavior

Updated:

- [components/TokenBurnMeter.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/TokenBurnMeter.tsx>)

Decision I made:

- Claude/Codex subscription bars now use **non-cache tokens only** (`in + out`) for the burn figure
- the 5-hour reset countdown is inferred from the earliest recent session/codex event inside the current rolling window
- DeepSeek remains real-dollar metered
- free tiers remain zero-dollar quota-style

This is a truthful middle ground without touching the renderer again.

#### 4. `/trading` raw JSON leak

Updated:

- [app/trading/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/trading/page.tsx>)

Changes:

- parsed `legs_json`
- rendered player/stat/line/pick/odds/EV rows
- added a real empty state when no visible cards exist

#### 5. Chat scroll behavior

Updated:

- [components/chat/ChatStream.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/chat/ChatStream.tsx>)
- [components/chat/ChatSurface.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/chat/ChatSurface.tsx>)

Changes:

- page no longer uses `scrollIntoView()` on every token/message
- council scroll is constrained to the internal chat container
- auto-scroll only happens near the bottom
- added `↓ Jump to latest`
- council surface now uses `h-[100dvh]` / overflow containment

#### 6. Agent page redesign

Updated:

- [components/chat/ChatSurface.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/chat/ChatSurface.tsx>)

Before:

- empty agents rendered as multi-column voids with empty side panels

After:

- empty agents render a centered single-column council entry state
- past sagas appear only as a small strip when relevant
- Scrying Pool is collapsed by default
- active thread routes retain the council surface but waste less width

#### 7. Ravens trigger

Updated:

- [components/RavensRoot.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/RavensRoot.tsx>)
- [components/Sidebar.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/Sidebar.tsx>)

Changes:

- removed the off-palette feel
- top-right trigger is now a subtle `⌘K` chip
- sidebar trigger matches the calmer utility language

#### 8. Top-left realm mark

Created:

- [components/RealmMark.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/RealmMark.tsx>)

Updated:

- [components/Sidebar.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/Sidebar.tsx>)

Changes:

- quieter neutral mark
- rune-gold glow only on hover
- swappable component boundary preserved

#### 9. Typography fixes

Updated:

- [components/MemoryCard.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/MemoryCard.tsx>)
- [components/chat/ScryingPool.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/chat/ScryingPool.tsx>)
- [components/PulseStrip.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/PulseStrip.tsx>)
- [components/RavensRoot.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/RavensRoot.tsx>)
- [app/skills/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/skills/page.tsx>)

Result:

- no remaining `font-display text-xl` / `text-lg` misuse in the audited route surfaces

#### 10. Duplicate activity on home

Updated:

- [app/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/page.tsx>)

Changes:

- removed home `ActivityStream`
- kept Dreaming Surfaces
- home activity now appears once on the landing page, with `/activity` as the full view

#### 11. Number + label hygiene

Updated:

- [components/PulseClock.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/PulseClock.tsx>)
- [components/KpiStrip.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/KpiStrip.tsx>)
- [components/McpStrip.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/McpStrip.tsx>)
- [components/ActivityTimeline.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/ActivityTimeline.tsx>)
- [components/LatestForging.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/LatestForging.tsx>)

Changes:

- single local timezone in PulseClock
- KPI cards now use a more consistent number/unit template
- MCP STRIP renamed to MCP SERVERS and de-duped
- Heimdall tally currency standardized to 2 decimals
- Latest Forging reframed as a quoted prompt instead of a monument

#### 12. Mobile gate

Updated:

- [app/layout.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/layout.tsx>)

Changes:

- below `sm`, the broken layout is hidden
- users get a centered desktop-only realm message instead

#### 13. Home polish + approved 21st.dev subset

Installed:

- `framer-motion`

Created:

- [components/ui/BorderBeam.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/ui/BorderBeam.tsx>)
- [components/ui/TracingBeam.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/ui/TracingBeam.tsx>)
- [components/ui/ActivityRings.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/ui/ActivityRings.tsx>)
- [components/DailyRitesPanel.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/DailyRitesPanel.tsx>)

Updated:

- [components/AgentCard.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/AgentCard.tsx>)
- [tailwind.config.ts](</C:/Github Repos/everything-claude-code/dashboard/tailwind.config.ts>)
- [app/page.tsx](</C:/Github Repos/everything-claude-code/dashboard/app/page.tsx>)

Result:

- BorderBeam on active council card
- TracingBeam on home page
- Daily Rites replaces the weaker decorative home panel
- home row is more useful than before

Bundle-size note:

- home route first-load JS moved from roughly `104k` earlier in the pass to `188k` after the framer-motion-backed additions
- that is a meaningful increase and exceeds the original +50KB aspiration, so I’m calling it out explicitly

#### 14. Council model routing

Updated:

- [lib/council.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/council.ts>)
- [lib/council-models.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/council-models.ts>)
- [lib/chat-stream.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/chat-stream.ts>)
- [components/chat/ChatInput.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/chat/ChatInput.tsx>)
- [components/chat/ChatSurface.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/chat/ChatSurface.tsx>)

Applied mapping:

- Lebot James → Claude CLI Opus
- Thor → Claude CLI Sonnet
- Perseus → DeepSeek
- Fenrir → Claude CLI Sonnet
- Sauron → Gemini 2.5 Flash

The active/fallback provider is now surfaced via the council UI line.

### Dead code removed

Removed:

- [components/ActivityStream.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/ActivityStream.tsx>)
- [components/SessionGlyph.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/SessionGlyph.tsx>)
- [components/AgentHero.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/AgentHero.tsx>)
- [components/PromptBar.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/PromptBar.tsx>)
- [components/OdinGlyph.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/OdinGlyph.tsx>)
- [components/FenrirGlyph.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/FenrirGlyph.tsx>)

### What I chose to leave

1. I did not attempt a new feature pass on Heimdall beyond the requested polish.
2. I did not expand the triad further after the accepted safe fallback floor.
3. I did not add a full mobile responsive layout — only the locked desktop gate.
4. I did not re-audit console errors through Playwright in this pass; the route audit here is HTTP/render/data oriented.

### God Mode continuation

#### What changed

Updated:

- [lib/council-models.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/council-models.ts>)
- [lib/chat-schema.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/chat-schema.ts>)
- [lib/god-mode-state.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/god-mode-state.ts>)
- [lib/council-god-mode.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/council-god-mode.ts>)
- [app/api/chat/[agent]/route.ts](</C:/Github Repos/everything-claude-code/dashboard/app/api/chat/[agent]/route.ts>)
- [components/chat/ChatInput.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/chat/ChatInput.tsx>)
- [components/chat/ChatSurface.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/chat/ChatSurface.tsx>)

Behavior now:

- each council has a **God Mode** label:
  - Lebot James → `All-Father Mode`
  - Thor → `Thunder God Mode`
  - Perseus → `Oracle Mode`
  - Fenrir → `Fenrir Unchained`
  - Sauron → `The Eye Opens`
- God Mode is opt-in per summon
- first God Mode summon:
  - runs the Interrogator
  - persists the pending state
  - pauses for Woody's answers
- second God Mode summon:
  - consumes the answers
  - routes through the freeform council triad
  - streams the Thinker plan + worker card + final answer into the same chat thread

#### Freeform triad entry point

Added:

- [lib/council-god-mode.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/council-god-mode.ts>)

It provides a typed freeform council triad path without forcing the council API route to import the `scripts/triad/forge.js` file directly at runtime.

#### Live verification

Verified against the council API:

1. `POST /api/chat/thor` with `godMode: true`
   - returned interrogation questions
   - created/persisted a council thread
2. second `POST /api/chat/thor` with the answers and `godMode: true`
   - returned `meta: triad`
   - streamed `Thinker (Opus)` tool-call card
   - streamed `Worker (deepseek)` tool-call card
   - returned the final Thor answer in council voice

#### Notes

- This lands the intended mental model:
  - normal summon = single-model council
  - God Mode summon = interrogator + triad
- I did **not** replace the existing home-page Quick Action triad path; this is additive

### Dev-server auto-start hardening

Updated:

- [scripts/tools/start-dashboard.bat](</C:/Github Repos/everything-claude-code/dashboard/scripts/tools/start-dashboard.bat>)
- [scripts/tools/restart-dashboard.ps1](</C:/Github Repos/everything-claude-code/dashboard/scripts/tools/restart-dashboard.ps1>)
- [docs/OBSIDIAN-SETUP.md](</C:/Github Repos/everything-claude-code/dashboard/docs/OBSIDIAN-SETUP.md>)

Mechanism chosen:

- keep the existing Scheduled Task install path
- make the batch launcher **idempotent** by checking whether port `3737` is already serving before trying to start dev again
- add a one-command restart script for manual recovery

This does not guarantee Windows will never behave strangely, but it is materially more reliable than the earlier blind `npm run dev` launcher.
