# AIOS Dashboard — Codex Pass 4: Life Dashboard
**Date:** 2026-05-25  
**User context:** 19yo college student, part-time job (~$600 biweekly), actively hunting internships.  
**Stack:** Next.js 14 App Router, TypeScript, Tailwind, better-sqlite3. Server: `127.0.0.1:3737`.  
**Theme tokens:** `rune-gold`, `bifrost`, `ember`, `blood`, `text-muted`, `bg-deep`, `bg-panel`, `bg-hover`, `border-subtle`.

---

## PRIORITY 1 — Internship Tracker (CRITICAL — build this first)

This is the most high-value panel for the user right now. They need to land an internship.

### 1a. SQLite schema

Create `lib/internships.ts`:

```ts
type InternshipStatus = 'saved' | 'applied' | 'phone-screen' | 'interview' | 'offer' | 'rejected' | 'ghosted';

type Internship = {
  id: number;
  company: string;
  role: string;
  location: string;         // "Remote" | "NYC" | etc.
  status: InternshipStatus;
  appliedDate: string | null;  // YYYY-MM-DD
  deadline: string | null;     // YYYY-MM-DD
  nextAction: string | null;   // "Send follow-up" | "Prep for interview" etc.
  nextActionDate: string | null;
  url: string | null;          // job posting URL
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
```

DB file: `data/internships.db`. Follow the exact same pattern as `lib/tasks.ts`.

Functions:
- `listInternships()` — all, ordered by status priority then updatedAt
- `createInternship(data)` — insert
- `updateInternship(id, data)` — partial update
- `deleteInternship(id)` — soft delete via status='rejected'
- `getActiveCount()` — count of non-rejected, non-ghosted entries
- `getInterviewCount()` — count of status='interview'

Add to `lib/paths.ts`:
```ts
internshipsDb: path.join(process.cwd(), 'data', 'internships.db'),
```

### 1b. API routes

`GET /api/internships` — returns all internships sorted by urgency  
`POST /api/internships` — create. Body: `{ company, role, location?, url?, deadline?, notes? }`  
`PATCH /api/internships/[id]` — update any fields  
`DELETE /api/internships/[id]` — marks status='rejected'

All routes: `export const dynamic = 'force-dynamic'`

### 1c. InternshipPanel component (client)

File: `components/InternshipPanel.tsx`  
Design: liquid glass matching DailyRitesPanel.

Layout:
```
┌───────────────────────────────────────────────────────┐
│ INTERNSHIP HUNT                     3 active · 1 interview│
├───────────────────────────────────────────────────────┤
│ [+ Add Application]                                    │
│                                                        │
│ ● Google SWE Intern    INTERVIEW   📅 May 30 prep      │
│ ● Stripe Eng Intern    APPLIED     📅 Follow up Jun 1  │
│ ● Meta UX Intern       SAVED       Apply before Jun 15 │
│ ○ Amazon SDE Intern    REJECTED                        │
└───────────────────────────────────────────────────────┘
```

Status badge colors:
- `saved` → `bg-white/10 text-text-muted`
- `applied` → `bg-bifrost/15 text-bifrost`
- `phone-screen` → `bg-amber-500/15 text-amber-400`
- `interview` → `bg-rune-gold/15 text-rune-gold` with pulse glow
- `offer` → `bg-emerald-500/15 text-emerald-400` with strong glow
- `rejected` / `ghosted` → `bg-rose-900/20 text-text-muted opacity-60`

Each row: company | role | status badge | next action + date  
Rows sorted: interview first → phone-screen → applied → saved → rejected (bottom, dimmed)

Quick-add form (inline, not modal): company input + role input + [Apply] button.  
Clicking a row expands it to show full details + edit fields.

Collapse rejected/ghosted entries behind a "Show archived (N)" toggle.

Add to `app/page.tsx` between DailyRitesPanel and WorkoutPanel:
```tsx
import InternshipPanel from '@/components/InternshipPanel';
// ...
<InternshipPanel />
```

---

## PRIORITY 2 — Finance Panel Overhaul (Student Budget Edition)

The current FinancePanel is generic. Rebuild it for a college student's reality.

### 2a. Update FinancePanel layout

File: `components/FinancePanel.tsx`

New layout:
```
┌─────────────────────────────────────────────────────┐
│ FINANCES                         Next pay: May 29    │
├──────────────────────┬──────────────────────────────┤
│  This month          │  Budget breakdown             │
│  $1,200 net          │  ████████░░ 53% committed     │
│  $570 free           │  Food $200 · Gas $80          │
│                      │  Subs $60 · Savings $200      │
├──────────────────────┴──────────────────────────────┤
│  Savings Goal: Emergency Fund                        │
│  $0 / $2,000  ░░░░░░░░░░ 0%                         │
├──────────────────────────────────────────────────────┤
│  Recent: May 15 $600 · May 1 $600                   │
└──────────────────────────────────────────────────────┘
```

New computed fields to show:
- `freeIncome` = `currentMonthNet - totalBudget` (money left after committed expenses)
- Savings goal progress bar if `savingsGoal` exists in finances.json
- Budget label: "X% of income committed" — green if <75%, amber if 75-90%, red if >90%

### 2b. API update already done

The `GET /api/finances` already returns `savingsGoal`. FinancePanel just needs to render it.

### 2c. Manual savings update

Add a `PATCH /api/finances/savings` route:
- Body: `{ current: number }` — updates `savingsGoal.current` in finances.json
- FinancePanel shows a small `+` button next to the savings bar that opens an input to log new savings balance

---

## PRIORITY 3 — Daily Habits: Add Internship Apply habit (MEDIUM)

The current 4 habits (workout, read, podcast, stocks) are fine but for a student in summer internship mode, one should be more relevant.

**Option A:** Replace "stocks" with "apply" (apply to 1 internship per day) — very high leverage  
**Option B:** Keep all 4 but rename "stocks" to "apply + stocks" with two mini checkboxes

**Recommendation:** Change habit key from `stocks` → `apply` with label "Apply Today". Stocks can be checked via the Trading tab. This makes the daily habit directly tied to their #1 goal.

**Files to change:**
- `lib/habits.ts` — update HABIT_KEYS and HABIT_LABELS
- `components/DailyHabitsStrip.tsx` — update icon (use a document/send icon for "apply")
- `app/api/habits/route.ts` — no change needed (generic)
- `scripts/sync-workouts-obsidian.js` — update HABIT_KEYS array

**Migration:** Add a one-time migration in `lib/habits.ts` that renames existing 'stocks' rows to 'apply' on first boot.

---

## PRIORITY 4 — ChatSurface Starter Prompts (carry over from Pass 3)

File: `components/chat/ChatSurface.tsx`

On empty state, add 3 clickable prompt chips below the empty state message. Each chip pre-fills the textarea and submits immediately.

```ts
const STARTER_PROMPTS: Record<string, string[]> = {
  'lebot-james': [
    'Plan my week and prioritize my internship search',
    'What should I focus on today?',
    'Orchestrate a full build of [describe feature]',
  ],
  thor: [
    'Critique this plan and find the weak points',
    'Stress-test this idea for me',
    "What am I not seeing about this decision?",
  ],
  perseus: [
    'Analyze the internship market for SWE roles',
    'Run the numbers on my monthly budget',
    'Research companies hiring college interns in [field]',
  ],
  fenrir: [
    'Review this component and tear it apart',
    'What is the weakest part of this codebase?',
    'Forge a better pattern for [paste code]',
  ],
  sauron: [
    'Research [company] deeply before my interview',
    'Scan the market for internship opportunities in [sector]',
    'Surveil what skills companies want for SWE interns 2026',
  ],
};
```

How to get agent slug: `usePathname()` from next/navigation, split the first path segment.

Chip style:
```tsx
<button className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-text-muted hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-text-secondary transition-colors cursor-pointer">
  {prompt}
</button>
```

---

## PRIORITY 5 — Persona Audit (carry over from Pass 3)

File: `lib/personas.ts` (or wherever system prompts are stored)

Check each agent's system prompt. Replace any generic ones with:

```
LEBOT JAMES: You are the Allfather. AIOS command center for a 19-year-old college student and entrepreneur. You orchestrate tasks, builds, and daily life. You know the user is job-hunting for internships, building AI projects, and learning to manage money. Direct, strategic, no filler. Think like a wise mentor who cuts through noise.

THOR: You are the Thunder God. Your job is brutal honesty and stress-testing ideas. Never soften feedback. Challenge the user to confront their blind spots. Speak like a demanding mentor who respects the user's potential.

PERSEUS: You are the Prince of Data and Research. Analytical, precise. Numbers first, narrative second. Structured bullet points with evidence. For this user: internship market research, budget analysis, opportunity identification.

FENRIR: You are the Wolf of the Forge. Code and design critic. Tear apart anything suboptimal. Identify the weakest link in every system. Adversarial but constructive. Never sugarcoat.

SAURON: You are the All-Seeing Eye. Deep research, pattern recognition, competitive intelligence. Comprehensive scans, long horizon thinking. For this user: company research before interviews, skill gap analysis, opportunity surveillance.
```

---

## PRIORITY 6 — DomainRow Audit + Layout Cleanup (LOW)

### 6a. DomainRow
Read `components/DomainRow.tsx`. Update any stale hrefs to real internal dashboard routes.

### 6b. McpStrip vs ConnectionsStrip
Read both `components/McpStrip.tsx` and `components/ConnectionsStrip.tsx`. If they show the same servers, remove `<McpStrip />` from `app/page.tsx`.

### 6c. PulseStrip vs KpiStrip  
Read both. If PulseStrip data duplicates KpiStrip, remove `<PulseStrip />` from `app/page.tsx`.

---

## Design contract (MANDATORY for all new components)

```tsx
// Liquid glass section panel — mandatory
<section className="mx-12 mb-6 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
```

Section label: `<div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">LABEL</div>`  
Numbers: `font-numeric`. Labels: `font-mono text-[10px]`. Body: `text-[12px] text-text-secondary`.  
Interactive: always `cursor-pointer`. Transitions: `transition-colors duration-200`.  
No emojis as icons — use inline SVG (Heroicons style, 24×24 viewBox, strokeWidth 2).

---

## File map

| File | Action |
|------|--------|
| `lib/internships.ts` | CREATE |
| `lib/paths.ts` | EDIT — add internshipsDb |
| `app/api/internships/route.ts` | CREATE |
| `app/api/internships/[id]/route.ts` | CREATE |
| `components/InternshipPanel.tsx` | CREATE |
| `app/page.tsx` | EDIT — add InternshipPanel |
| `components/FinancePanel.tsx` | EDIT — add free income + savings goal |
| `app/api/finances/route.ts` | EDIT — add PATCH savings |
| `lib/habits.ts` | EDIT — rename stocks→apply |
| `components/DailyHabitsStrip.tsx` | EDIT — update icon + label |
| `scripts/sync-workouts-obsidian.js` | EDIT — update HABIT_KEYS |
| `components/chat/ChatSurface.tsx` | EDIT — starter prompts |
| `lib/personas.ts` | AUDIT + EDIT |
| `components/DomainRow.tsx` | AUDIT |
| `components/McpStrip.tsx` | AUDIT — may remove |
| `components/PulseStrip.tsx` | AUDIT — may remove |

---

## Env (all present in dashboard/.env.local — do NOT commit)

```
CEREBRAS_API_KEY  ✓
GROQ_API_KEY      ✓
GEMINI_API_KEY    ✓
DEEPSEEK_API_KEY  ✓
```
