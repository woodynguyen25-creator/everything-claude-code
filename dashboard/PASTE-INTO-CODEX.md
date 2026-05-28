# Paste this into Codex — 2026-05-18 (Post-CSS-Fix)

> Copy everything between the `=====` lines and paste into a fresh Codex session.

=====

## Context — what just happened

Claude (Sonnet, autonomous + chat) just diagnosed and fixed a critical CSS bug that was blocking the dashboard.

**Root cause:** `components/MemoryDrawer.tsx:88` used Tailwind variant prefixes (`prose-headings:`, `prose-p:`, `prose-code:`) from the `@tailwindcss/typography` plugin without the plugin being installed. This crashed Tailwind's JIT CSS generation, serving an empty CSS bundle. Every utility class became a no-op.

**Fix applied (already shipped, do not re-do):**
1. `npm install -D @tailwindcss/typography` ✅
2. Updated `tailwind.config.ts`: `plugins: [require('@tailwindcss/typography')]` ✅
3. Cleared `.next` cache ✅
4. Verified via `npm run build` — all 13 routes compile, zero errors ✅

The user will restart their dev server and confirm visually. Your job starts after that.

## Your task — full health verification + next slice

### Phase 1 — Verify the dashboard is genuinely back

For each route below, visit it in a browser and confirm:
- Page renders with full styling (sidebar visible at w-72, Cinzel display fonts, panels with hairline borders)
- Console has zero errors
- Network tab has zero 4xx/5xx responses

```
http://127.0.0.1:3737/                    Home — verify HeroBand at 30vh, NextActionCard + SessionGlyph in 62/38 row, TodaysWyrd, DomainRow, ActivityStream
http://127.0.0.1:3737/memory              Mímir's Well — verify cards render, search works, filters work, click → drawer opens with markdown body
http://127.0.0.1:3737/activity            Heimdall's Watch — confirm it's still a stub (that's your next big build)
http://127.0.0.1:3737/skills              Yggdrasil — verify 9 hotspots visible, hover shows preview cards
http://127.0.0.1:3737/skills/asgard       Realm sub-page — should not 404
http://127.0.0.1:3737/skills/midgard      Realm sub-page — should not 404
http://127.0.0.1:3737/trading             Trading panel
http://127.0.0.1:3737/lebot-james         Agent page with banner image
http://127.0.0.1:3737/thor                Agent page with banner image
http://127.0.0.1:3737/perseus             Agent page with banner image
http://127.0.0.1:3737/fenrir              Agent page with banner image
http://127.0.0.1:3737/sauron              Agent page with banner image
```

If any route fails, fix it before moving to Phase 2. Common potential issues:
- Hydration mismatch errors → check 'use client' boundaries
- 500 on API routes → check SQLite path resolution
- Missing image 404s → check `public/art/` matches the manifest

### Phase 2 — Surgical audit (scan for hidden issues)

Run these scans and report findings:

```powershell
cd "c:\Github Repos\everything-claude-code\dashboard"

# Scan 1: Other Tailwind plugin variants that might lurk
Select-String -Path "components\*.tsx","app\**\*.tsx" -Pattern "prose-[a-z]+:|prose-invert|form-input|form-checkbox|aspect-w-|aspect-h-"

# Scan 2: TypeScript health
npm run typecheck

# Scan 3: Production build sanity
npm run build

# Scan 4: Find any console.log left in production code
Select-String -Path "components\*.tsx","app\**\*.tsx","lib\*.ts" -Pattern "console\.(log|debug|warn)" | Where-Object { $_.Line -notmatch "// (debug|temp|TODO)" }

# Scan 5: Find unused imports (Next.js doesn't warn on these reliably)
Select-String -Path "components\*.tsx","app\**\*.tsx","lib\*.ts" -Pattern "^import.*from"
```

Document anything anomalous in your final report.

### Phase 3 — Build the next slice

After verification passes, build **Heimdall's Watch** (`/activity` real implementation). This is the symmetric counterpart to Mímir's Well — both are part of the IA backbone.

**Spec:** `dashboard/docs/HEIMDALL-WATCH-SPEC.md` (read it before starting)

**Time budget:** 90 min

**Scope:**

1. **Data layer — `lib/activity.ts` (new)**
   - Aggregate events from existing sources:
     - `lib/events.ts` (already exists — read it first)
     - `lib/conversations.ts` (claude-mem session log entries)
     - Doctor savepoints: `~/.claude/logs/aios-doctor/savepoints/*.json`
     - Loop output files: `~/Documents/Obsidian Vault/Trading/*-morning-brief.md`, etc.
   - Returns array of `ActivityEvent`:
     ```ts
     type ActivityEvent = {
       id: string;
       timestamp: string;     // ISO 8601
       kind: 'doctor' | 'loop' | 'ravens' | 'session' | 'memory' | 'trade';
       agent: 'lebot-james' | 'thor' | 'perseus' | 'fenrir' | 'sauron' | null;
       title: string;         // ≤80 char headline
       detail?: string;       // ≤200 char supporting line
       source: string;        // 'doctor.log' / 'morning-brief.js' / etc
       href?: string;         // optional drilldown link
     };
     ```
   - Module-level 30s cache.

2. **API route — `app/api/activity/route.ts` (new)**
   - GET with query params: `?since=ISO&agent=slug&kind=string&limit=50`
   - Returns `ActivityEvent[]` newest-first

3. **Page — `app/activity/page.tsx` (rewrite stub)**
   - Header: `HEIMDALL'S WATCH` Cinzel 36px+
   - Subtitle italic: *"All that crossed the bridge today."*
   - Stats: `~N events · last hour: X`
   - Filter chips: agent (color-coded), kind, time-window (today/week/all)
   - Timeline view: vertical, newest at top, grouped by hour
   - Each event: timestamp pill, agent color badge, title, optional detail, optional drilldown link
   - Use `panel` utility for the container
   - Apply universal Slice 3 visual rules (Cinzel ≥24px only, no card gradients, etc.)

4. **Component — `components/ActivityTimeline.tsx` (new, client)**
   - Handles filter state + auto-refresh every 30s
   - Streams new events without full re-render
   - Empty state: *"Heimdall sees only stillness. No events crossed the bridge today. The realm rests."* (from `content/norse-copy.json`)

5. **Optional polish:**
   - Cmd+K when on `/activity` focuses the timeline search (mirrors `/memory` behavior — already implemented in RavensRoot for `/memory`)
   - Arrow keys navigate events vertically
   - Enter on event opens drilldown or expands inline

**Acceptance criteria:**
- Route returns 200 with real data
- All event sources surface correctly (doctor, loops, ravens, session, memory, trade)
- Filtering by agent/kind/time-window works
- Auto-refresh keeps timeline current
- TypeScript clean
- `npm run build` succeeds

### Phase 4 — Polish pass on existing surfaces (only if Phase 3 done with time left)

If the Heimdall build wraps with time remaining, tackle these in priority order:

1. **Notification bell + history drawer** — per `docs/codex-briefs/CODEX-QUEUE-CONSOLIDATED.md` task 7. Bell icon top-right, drawer shows last 50 events, marks read in localStorage + small SQLite table.

2. **21st.dev component subset** — per `docs/codex-briefs/21ST-DEV-INTEGRATION.md`:
   - Install: `npm install class-variance-authority framer-motion`
   - Build `components/ui/BorderBeam.tsx` and apply to active sidebar AgentCard
   - Build `components/ui/TracingBeam.tsx` and wrap home page
   - Build `components/ui/ActivityRings.tsx` (defer DailyRitesPanel until you have time)

3. **Slug-based Ravens → Memory contract** — currently the handoff uses title-matching. Upgrade so Ravens results include canonical slugs from `lib/memory.ts` and the `/memory?focus=` param uses slugs directly.

## Hard rules — DO NOT touch these files

Claude locked these during the autonomous session. Modifying them without flagging will create drift.

- `dashboard/lib/agent-status.ts` — codenames + Lebot persona locked
- `dashboard/personas/*.md` — voice locks
- `dashboard/content/norse-copy.json` — Claude maintains; you may read
- `dashboard/AUTONOMY-PLAN.md`, `WORK-LOG-2026-05-18.md`, `DASHBOARD-BROKEN-DIAGNOSIS-2026-05-18.md`, `PASTE-INTO-CODEX.md` — Claude's session docs
- `dashboard/scripts/loops/morning-trading-brief.js`, `deep-research.js`, `slate-selection-critic.js`, `design-critique.js`, `weekly-wyrd.js` — loop infra, don't refactor without permission
- `~/.claude/skills/*/SKILL.md` (the 5 new skills Claude shipped) — read-only

You CAN edit (touched by Claude but not locked):
- `components/AgentHero.tsx` — has `bannerPosition` prop with default `'center 25%'`. Don't change signature. May add per-agent overrides if a specific banner crops oddly.
- `components/Sidebar.tsx` — Claude added `aria-label`. Don't remove it.
- `components/RavensRoot.tsx` — Claude added `aria-label`. You added keyboard hardening. Both stay.

## Reading list (in order, before starting Phase 3)

1. `dashboard/WORK-LOG-2026-05-18.md` — Claude's autonomous session summary
2. `dashboard/docs/codex-briefs/CODEX-QUEUE-CONSOLIDATED.md` — full backlog
3. `dashboard/docs/HEIMDALL-WATCH-SPEC.md` — Phase 3 spec
4. `dashboard/lib/events.ts` — read this BEFORE writing `lib/activity.ts` (the former is the existing event source; you're aggregating it)
5. `dashboard/lib/conversations.ts` — same — read first
6. `dashboard/content/norse-copy.json` — for empty/error state copy
7. `dashboard/docs/audit/AUDIT-2026-05-18.md` — known issues + tier B fixes

## Style anchors (in case anything drifts)

- Cinzel display font ≥24px ONLY (body is Inter, code is JetBrains Mono)
- OKLCH palette via `tailwind.config.ts` + `styles/tokens.css` — no new colors
- `panel` utility for cards (flat `bg-bg-panel` + `border-border-subtle` hairline)
- Asymmetric grids: 62/38, 2/1/1 — NEVER equal columns on home/dashboard surfaces
- AmbientEmbers is the universal motion signature — keep it everywhere
- Norse vocabulary lock: Wyrd, Hoard, Forge, Saga, Mímir, Heimdall, The Ravens, Yggdrasil
- Hover states must feel designed (`scale-[1.02]`, glow, color shift — never default)

## Permissions

- ✅ Install npm packages with explicit user benefit (typography plugin already installed)
- ✅ Modify code per scope above
- ✅ Run `npm run build`, `npm run typecheck`, `npm run dev`
- ✅ Commit locally with conventional commit messages
- ❌ Push to remote (user reviews and pushes manually)
- ❌ Delete `.originals/` art folders or `BASELINE-2026-05-18.txt`
- ❌ Modify Claude-locked files (listed above)

## Report back

Write a short review doc at `dashboard/docs/codex-to-claude-review-2026-05-18-evening-2.md`:

```
## Phase 1 — Verification
- [ ] All 12 routes 200
- [ ] No console errors
- [issues found and fixed]

## Phase 2 — Audit findings
- [scan results, anything worth flagging]

## Phase 3 — Heimdall's Watch shipped
- [files created/modified]
- [acceptance criteria met]
- [open questions]

## Phase 4 — Optional polish (if reached)
- [what shipped]

## Time spent
- Phase 1: Xm
- Phase 2: Xm
- Phase 3: Xm
- Phase 4: Xm
```

## Confidence

The CSS fix is verified — `npm run build` succeeds cleanly. Dashboard should render correctly after the user's dev server restart. If anything is still broken after restart, the symptom will be visible immediately on Phase 1 verification — read the browser console / network tab and fix from there.

Begin.

=====

## Bonus — confirmation steps for the user

When you (the user) come back to look at the result:

1. Visit `127.0.0.1:3737` after your dev restart. Expected: full sidebar, normal proportions, every panel styled.
2. Visit `/memory` — Codex's Mímir's Well. Cards should render with markdown drawer working (this is where the typography plugin actually delivers value — the `prose` classes now produce real styled markdown).
3. Visit `/skills` — Yggdrasil with 9 hotspots.
4. If anything looks off, screenshot and tell Codex via the report doc path above.
