# AIOS Dashboard — Codex Next Pass
**Date:** 2026-05-25  
**Priority order:** Workout tracking → Financial panel → Agent health → Gusto integration → Cleanup

---

## Context

Dashboard is Next.js 14 App Router, TypeScript, Tailwind, better-sqlite3.  
Server: `127.0.0.1:3737` (hardcoded — never change to `::` or `0.0.0.0`).  
Theme: Norse dark, OKLCH tokens — `rune-gold`, `bifrost`, `ember`, `blood`, `text-muted`, `bg-deep`, `bg-panel`, `bg-hover`, `border-subtle`.  
Vault: `C:\Users\woody\Documents\Command Center\` (Obsidian REST API on port 27123, Bearer token in env).

**Already done this session:**
- MarketPulseBar moved out of layout.tsx into home-page dynamic import (fixes VSCode freeze)
- DailyRitesPanel redesigned as liquid glass with task list, moved to top of REALM
- UnusualOptionsPanel capped to 5 rows
- page.tsx reordered: DailyRitesPanel first → KpiStrip → market intel below

---

## Task 1 — Workout Tracking (HIGH PRIORITY)

### 1a. SQLite workout log

Create `lib/workout.ts`:
- Schema: `workouts(id, date TEXT UNIQUE, completed BOOLEAN, notes TEXT, createdAt TEXT)`
- `date` = `YYYY-MM-DD` — one row per day
- Functions: `logWorkout(date, completed, notes?)`, `getWorkoutLog(days = 90)`, `getTodayWorkout()`
- DB file: `data/workouts.db` (same pattern as tasks.db via PATHS)

Add to `lib/paths.ts`:
```ts
workoutsDb: path.join(DATA_DIR, 'workouts.db'),
```

### 1b. API routes

`GET /api/workouts?days=90` — returns array of `{ date, completed, notes }`  
`POST /api/workouts` — body `{ date, completed, notes? }` — upsert by date  

Both routes: `export const dynamic = 'force-dynamic'`

### 1c. WorkoutPanel component (client)

File: `components/WorkoutPanel.tsx`  
Design: liquid glass matching DailyRitesPanel (`rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-2xl`)

Layout:
- Header: "TRAINING LOG" label + today's date
- **Today card**: big check circle (tap to toggle) — green glow when complete, grey when not. One-tap POST to /api/workouts.
- **90-day heatmap grid**: 13 columns × 7 rows. Each cell = one day. Green = completed, `bg-bg-deep` = rest, `bg-border-subtle` = missed. Show month labels above columns.
- **Streak counter**: "X day streak" shown bottom-right in `font-numeric`.

Heatmap cell size: `w-3 h-3 rounded-sm`. Gap: `gap-[3px]`.

### 1d. Obsidian heatmap sync

Create `scripts/sync-workouts-obsidian.js` (Node, CommonJS):
- Reads workouts.db
- Writes `C:\Users\woody\Documents\Command Center\AIOS\workout-log.md`
- Format: YAML frontmatter with heatmap-plugin compatible data:
```yaml
---
heatmap:
  - date: 2026-05-25
    value: 1
  - date: 2026-05-24  
    value: 0
---
```
- Also appends a human-readable streak summary
- Run via: `node scripts/sync-workouts-obsidian.js`

Add to page.tsx after NewsFeedPanel:
```tsx
import WorkoutPanel from '@/components/WorkoutPanel';
// ...
<WorkoutPanel />
```

---

## Task 2 — Financial Panel (HIGH PRIORITY)

### 2a. Manual paycheck data file

Since Gusto has no free API (OAuth only, complex), use a JSON data file approach first:

Create `data/finances.json`:
```json
{
  "paychecks": [
    { "date": "2026-05-15", "grossPay": 0, "netPay": 0, "employer": "Gusto", "notes": "" }
  ],
  "monthlyBudget": {
    "rent": 0,
    "food": 0,
    "subscriptions": 0,
    "misc": 0
  },
  "accounts": []
}
```
Woody fills this in manually. No external API needed for v1.

### 2b. API route

`GET /api/finances` — reads `data/finances.json`, returns parsed data with computed fields:
- `currentMonthNet`: sum of netPay where date is current month
- `nextPayDate`: next expected payday (biweekly from last paycheck)
- `budgetUsed`: sum of monthlyBudget values vs currentMonthNet
- `force-dynamic`

### 2c. FinancePanel component (client)

File: `components/FinancePanel.tsx`  
Design: liquid glass matching DailyRitesPanel

Layout:
```
┌─────────────────────────────────────────┐
│ FINANCES           Next pay: Jun 1       │
├────────────────┬────────────────────────┤
│  This month    │  Budget tracker        │
│  $X,XXX net    │  ████░░░░ 60% used     │
│                │  Rent · Food · Subs    │
├────────────────┴────────────────────────┤
│  Recent paychecks (last 3)             │
│  May 15  $X,XXX   May 1  $X,XXX        │
└─────────────────────────────────────────┘
```

Color code: green if budget < 80% used, amber if 80-95%, red if >95%.

Add to page.tsx after WorkoutPanel.

### 2d. Gusto CSV import script (future path)

Create `scripts/import-gusto-csv.js`:
- Reads a Gusto payroll export CSV (user manually downloads from Gusto)
- Parses: Date, Gross Pay, Deductions, Net Pay
- Upserts into `data/finances.json`
- Run via: `node scripts/import-gusto-csv.js path/to/gusto-export.csv`

Document in `docs/FINANCES-SETUP.md`:
1. In Gusto → Reports → Payroll → Export CSV
2. Run `node scripts/import-gusto-csv.js ~/Downloads/payroll.csv`
3. Dashboard auto-updates on next load

---

## Task 3 — Agent Health + Connectivity Fix (MEDIUM)

### 3a. Agent health endpoint

`GET /api/doctor/agents` — checks each provider:
```ts
type AgentHealth = {
  agent: string;
  provider: string;
  model: string;
  status: 'ok' | 'no-key' | 'no-binary' | 'untested';
};
```

Logic:
- `claude-cli`: check if `claude.exe` resolves via `where claude`
- `deepseek`: check `process.env.DEEPSEEK_API_KEY` exists
- `gemini`: check `process.env.GEMINI_API_KEY` exists
- `cerebras`: check `process.env.CEREBRAS_API_KEY` exists
- `groq`: check `process.env.GROQ_API_KEY` exists

All 5 keys ARE in `.env.local` — this should return all green.

### 3b. Agent status indicator in sidebar

In `Sidebar.tsx`, add a small health dot next to each agent card:
- Green dot = provider available
- Amber dot = falling back to secondary provider  
- Red dot = no provider available (show "Offline")

Fetch from `/api/doctor/agents` on mount. Cache 60s.

### 3c. Empty state improvement

The "empty state" on agent pages (no conversations yet) should NOT look broken.
Current: centered panel with summon button.
Fix in `components/chat/ChatSurface.tsx`:
- Add 2-3 example prompts as chips below the empty state text
- Each agent gets domain-specific starter prompts:
  - Lebot James: "Plan my week", "Orchestrate a full build", "Review my trading system"
  - Thor: "Critique this plan", "Stress-test this idea", "Find the weak point"
  - Perseus: "Analyze this data", "Run the numbers on X", "Bulk research Y"
  - Fenrir: "Tear apart this UI", "Forge a better pattern", "What's the weakest component"
  - Sauron: "Research X deeply", "Scan the market for Y", "Surveil Z"

### 3d. Persona system prompt check

Check `lib/personas.ts` — if any agent's persona file is missing, it defaults to a generic prompt.
Ensure persona YAML/MD files exist for all 5 agents at the expected paths.
If missing, create minimal persona system prompts (Norse voice, domain focus).

---

## Task 4 — DailyRitesPanel Workout Integration (MEDIUM)

Once Task 1 is done, update `DailyRitesPanel.tsx`:
- The "Body" ring should drive from **actual workout data**, not just criticalTasks
- `value`: 3 if worked out today, 2 if worked out yesterday, 1 if 2+ days ago, 0 if 3+ days
- This makes the Body ring actually track fitness, not tasks

Import from new workout lib:
```ts
import { getTodayWorkout, getWorkoutLog } from '@/lib/workout';
```

---

## Task 5 — Layout Cleanup (LOW)

### 5a. McpStrip audit
`McpStrip` currently shows MCP server names. Audit for duplicates (Codex already fixed some). If it adds no value over the sidebar ConnectionsStrip, consider removing it.

### 5b. PulseStrip audit  
`PulseStrip` — if it overlaps with KpiStrip data, remove one. Keep whichever is more real-time.

### 5c. DomainRow audit
`DomainRow` — quick links row. Make sure it links to real dashboard pages, not stale hrefs.

### 5d. Remove TracingBeam on mobile gate
`AmbientEmbers` + `TracingBeam` add significant JS weight. On the mobile gate path, these never render — confirm they're inside the `sm:hidden` guard, not outside it.

---

## Task 6 — Voice → Telegram → Obsidian (DEFERRED)

Merge voice transcription from `C:\Users\woody\.claude\telegram-bot\bot.js` into  
`C:\Users\woody\.claude\scripts\telegram-inbox.js` (the active running bot).

Both use token `8674133966:AAHduLHzzmb8i0cePEY4CqDgrXn3nxDpANA` — can't run simultaneously.
Merge the voice handler functions:
- `downloadBuffer(url)`
- `transcribeWithGroq(audioBuffer, mimeType)` — Groq key: from env or hardcoded in bot.js
- `appendToObsidianDaily(transcript)` — Obsidian API port 27123

Add `msg.voice || msg.audio` check before the existing message routing in telegram-inbox.js.

---

## Env vars required (all present in dashboard/.env.local)

```
GEMINI_API_KEY     ✓
DEEPSEEK_API_KEY   ✓
CEREBRAS_API_KEY   ✓
GROQ_API_KEY       ✓
```

`OBSIDIAN_KEY` needed for workout sync script — check `C:\Users\woody\.claude\telegram-bot\bot.js` for the value.

---

## File map for Codex

| File | Action |
|------|--------|
| `lib/workout.ts` | CREATE |
| `lib/paths.ts` | EDIT — add workoutsDb |
| `app/api/workouts/route.ts` | CREATE |
| `components/WorkoutPanel.tsx` | CREATE |
| `scripts/sync-workouts-obsidian.js` | CREATE |
| `data/finances.json` | CREATE |
| `app/api/finances/route.ts` | CREATE |
| `components/FinancePanel.tsx` | CREATE |
| `scripts/import-gusto-csv.js` | CREATE |
| `app/api/doctor/agents/route.ts` | CREATE |
| `components/chat/ChatSurface.tsx` | EDIT — starter prompts |
| `lib/personas.ts` | AUDIT — ensure all 5 exist |
| `app/page.tsx` | EDIT — add WorkoutPanel + FinancePanel |

---

## Design contract (all new panels must match)

```tsx
// Liquid glass panel — mandatory for any new section
<section className="mx-12 mb-6 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
```

Section label format:
```tsx
<div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">SECTION NAME</div>
```

Numbers: `font-numeric`. Labels: `font-mono text-[10px]`. Body: `text-[12px] text-text-secondary`.
