# AIOS Dashboard — Codex Pass 3
**Date:** 2026-05-25  
**Context:** Next.js 14 App Router, TypeScript, Tailwind, better-sqlite3, Norse dark theme.  
**Server:** `127.0.0.1:3737` — NEVER change bind address.  
**Theme tokens:** `rune-gold`, `bifrost`, `ember`, `blood`, `text-muted`, `bg-deep`, `bg-panel`, `bg-hover`, `border-subtle`.

---

## What was shipped in the last pass (do NOT redo)

- `lib/habits.ts` — SQLite habits DB: workout, read, podcast, stocks per day
- `lib/paths.ts` — `habitsDb` added
- `app/api/habits/route.ts` — GET (today checkins or habit log), POST (toggle)
- `components/DailyHabitsStrip.tsx` — 4-habit client checklist embedded in DailyRitesPanel
- `components/DailyRitesPanel.tsx` — 3-column grid: rings | habits | tasks. Body ring = habitsCompleted/4 * 3
- `components/WorkoutPanel.tsx` — heatmap only, pulls from `/api/habits?habit=workout`
- `components/FinancePanel.tsx` — budget bar + paychecks display
- `app/api/finances/route.ts` — reads data/finances.json
- `app/api/doctor/agents/route.ts` — all 5 agents health check
- `components/AgentCard.tsx` — healthStatus prop with green/amber/red dot
- `components/Sidebar.tsx` — fetches /api/doctor/agents on mount, passes healthDot to each AgentCard
- `scripts/sync-workouts-obsidian.js` — syncs habits.db → Command Center/AIOS/workout-log.md + daily-habits.md

---

## Task 1 — ChatSurface Empty State: Agent Starter Prompts (MEDIUM)

**File:** `components/chat/ChatSurface.tsx`

On the empty state (no conversations yet for that agent), add 3 prompt chips below the empty state text. Each chip is a button that, when clicked, pre-fills the textarea and submits.

Starter prompts per agent (pass as prop or hardcode via slug):

```ts
const STARTER_PROMPTS: Record<string, string[]> = {
  'lebot-james': [
    'Plan my week and orchestrate the build queue',
    'Review my AIOS system and suggest upgrades',
    'What should I focus on today?',
  ],
  thor: [
    'Critique this plan and find the weak points',
    'Stress-test this idea: [paste idea]',
    'What am I not seeing about this decision?',
  ],
  perseus: [
    'Analyze this data and run the numbers',
    'Research the market for [sector/stock]',
    'Bulk research: give me 5 takes on [topic]',
  ],
  fenrir: [
    'Tear apart this UI and forge a better pattern',
    'Review this component for issues',
    'What is the weakest part of this codebase?',
  ],
  sauron: [
    'Research [topic] deeply — full landscape scan',
    'Scan the market for opportunities in [sector]',
    'Surveil the competition for [company]',
  ],
};
```

Chip style (liquid glass, small):
```tsx
<button
  className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-text-muted hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-text-secondary transition-colors cursor-pointer"
>
  {prompt}
</button>
```

How to get the agent slug in ChatSurface: the slug is already available from the URL (`/lebot-james`, `/thor`, etc.) — use `usePathname()` and split.

---

## Task 2 — Persona Files Audit (MEDIUM)

**File to check:** `lib/personas.ts` (or wherever persona system prompts live)

1. Read the file and list all 5 agents.
2. Check that each agent has a unique, non-empty system prompt.
3. If any agent's system prompt is generic ("You are a helpful assistant" or empty), replace it with a Norse-flavored domain-specific one:

```
Lebot James: The Allfather. AIOS command center. Orchestrates all agents, builds, and plans. Speaks in command cadence. Direct, strategic, no filler.

Thor: Thunder God of Markets and Decisions. Brutal honesty, no softening. Forces the user to confront blind spots. Speaks like a war counselor.

Perseus: Prince of Parleys and Data. Analytical, precise. Numbers first, narrative second. Answers in structured bullet points with supporting data.

Fenrir: Wolf of the Forge. Tears apart code and design. Adversarial reviewer. Identifies weakest links, suggests rewrites, never sugar-coats.

Sauron: The All-Seeing Eye. Deep research, pattern recognition, market surveillance. Comprehensive scans, never misses a connection.
```

---

## Task 3 — Finances Panel: Add netPay Entry UI (LOW)

Right now `data/finances.json` paychecks have `netPay: 0`. Add a small "Update" button to FinancePanel that opens an inline edit form (no modal, just an expanded row) to input the netPay for each paycheck entry.

This writes back to the server via a new `PATCH /api/finances` route that updates `data/finances.json`.

Schema for PATCH body: `{ paychecks: Array<{date, grossPay, netPay, employer, notes}> }`

Keep it simple — no fancy form library, just controlled inputs.

---

## Task 4 — McpStrip / PulseStrip Audit (LOW)

**Files:** `components/McpStrip.tsx`, `components/PulseStrip.tsx`

1. Read both components.
2. If McpStrip shows the same servers as the sidebar ConnectionsStrip, remove `<McpStrip />` from `app/page.tsx`.
3. If PulseStrip shows data that's also in KpiStrip, remove `<PulseStrip />` from `app/page.tsx`.
4. If either adds unique value not shown elsewhere, keep it but style it consistently.

---

## Task 5 — DomainRow Href Audit (LOW)

**File:** `components/DomainRow.tsx`

Read the component. Verify every `href` points to a real dashboard route (not a stale external link or placeholder). Update stale hrefs to valid internal routes or remove dead links.

---

## Task 6 — Obsidian Sync: npm script (LOW)

**File:** `package.json`

Add script:
```json
"sync:obsidian": "node scripts/sync-workouts-obsidian.js"
```

Also check if there's a `dev` script — if so, confirm it binds to `127.0.0.1:3737`:
```json
"dev": "next dev -p 3737 -H 127.0.0.1"
```

CRITICAL: Never change to `::` or `0.0.0.0` — freezes VSCode extension.

---

## Task 7 — Voice → Telegram → Obsidian Merge (MEDIUM)

**Context:** Two bot scripts exist:
- `C:\Users\woody\.claude\scripts\telegram-inbox.js` — the **active** running bot (processes text messages, appends to Obsidian)
- `C:\Users\woody\.claude\telegram-bot\bot.js` — has voice transcription but runs on the same token, can't run simultaneously

**Goal:** Merge voice handler into `telegram-inbox.js` so one bot handles both text and voice.

**Functions to add** (copy from `bot.js`):
```js
async function downloadBuffer(url) { ... }
async function transcribeWithGroq(audioBuffer, mimeType) { ... }
async function appendToObsidianDaily(transcript) { ... }
```

**Where to inject:** Before the existing text message handler in telegram-inbox.js, add:
```js
if (msg.voice || msg.audio) {
  const file = msg.voice || msg.audio;
  // download → transcribe → append
}
```

Groq key: `process.env.GROQ_API_KEY` (already in env).
Obsidian REST API: port 27123, Bearer token from `process.env.OBSIDIAN_KEY`.

After merge: stop the old bot.js process if running (do NOT kill blindly — check first with tasklist/ps).

---

## Design contract (all new components MUST match)

```tsx
// Liquid glass section panel
<section className="mx-12 mb-6 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
```

Section label:
```tsx
<div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">SECTION NAME</div>
```

Numbers: `font-numeric`. Labels: `font-mono text-[10px]`. Body: `text-[12px] text-text-secondary`.  
Interactive: `cursor-pointer`. Transitions: `transition-colors duration-200`.  
No emojis as icons — use SVG (Heroicons/Lucide style).

---

## File map for this pass

| File | Action |
|------|--------|
| `components/chat/ChatSurface.tsx` | EDIT — starter prompt chips |
| `lib/personas.ts` | AUDIT + EDIT if any persona is generic |
| `components/FinancePanel.tsx` | EDIT — inline paycheck edit |
| `app/api/finances/route.ts` | EDIT — add PATCH handler |
| `components/McpStrip.tsx` | AUDIT — may DELETE from page.tsx |
| `components/PulseStrip.tsx` | AUDIT — may DELETE from page.tsx |
| `components/DomainRow.tsx` | AUDIT — fix stale hrefs |
| `package.json` | EDIT — add sync:obsidian script |
| `C:\Users\woody\.claude\scripts\telegram-inbox.js` | EDIT — merge voice handler |

---

## Env vars (all present in dashboard/.env.local — do NOT commit this file)

```
CEREBRAS_API_KEY   ✓
GROQ_API_KEY       ✓
GEMINI_API_KEY     ✓
DEEPSEEK_API_KEY   ✓
```

`OBSIDIAN_KEY` — check `C:\Users\woody\.claude\telegram-bot\bot.js` for the value, use in sync scripts.
