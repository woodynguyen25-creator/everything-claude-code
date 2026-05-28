# AIOS Dashboard — Codex Pass 5: Refinement & Bento Restructure
**Date:** 2026-05-25 (Opus 4.7 deep pass)  
**Operator:** Woody Nguyen · 19 · UH finance student · internship hunt priority  
**Stack:** Next.js 14 App Router · TypeScript · Tailwind · better-sqlite3 · `127.0.0.1:3737`  
**Reference docs:** [SOUL.md](SOUL.md) · [CODEX-PASS-4.md](CODEX-PASS-4.md)

---

## What This Pass Solves

The dashboard has 15+ panels stacked vertically. It's a scroll museum, not a command center. This pass:
1. Restructures the homepage into a **bento grid with named sections**
2. Builds the **InternshipPanel** (Woody's #1 use case this summer)
3. Consolidates the noise (4 redundant strips → 1 system footer)
4. Cuts JS bundle by removing unnecessary Framer Motion usage
5. Adds **section dividers + rhythm** so the page reads like a magazine spread, not a stack of cards

---

## Refinement Principles (applied to every change)

**Hierarchy via scale, not boxes.** Section headers tiny + tracked. Panel titles medium-display. Numbers loud (font-numeric, 24-32px). Body small (12-13px). Nothing in between competes.

**Whitespace > borders.** Borders muted (`border-white/[0.07]`). Sections separated by `mt-12` margin, not heavy dividers. Light section labels as the visual delimiter.

**Pair before stacking.** Two related panels go side-by-side in a grid. Only stack when the panel needs full width (InternshipPanel, NextAction, Hero).

**Demote noise.** Anything that's "system status" (KPI, MCP, Pulse, Domain, Token Burn) collapses into one compact footer strip. Personal dashboard panels (Habits, Internship, Finance, Workout) live in the prime real estate above.

**Motion only where it earns its place.** TracingBeam was applied to the whole page — kill it. BorderBeam stays only on the active council card. Reduce framer-motion surface area.

---

## The New Layout

```
═══════════════════════════════════════════════════════════════════
                          HERO BAND                                
═══════════════════════════════════════════════════════════════════

── TODAY ─────────────────────────────────────── Mon · May 25 ─────
┌─────────────────────────────────────────────────────────────────┐
│                       DAILY RITES PANEL                          │
│   [Rings]   [Daily Habits checklist]   [Open Tasks]              │
└─────────────────────────────────────────────────────────────────┘

── INTERNSHIP HUNT ──────────────────────── 3 active · 1 interview ─
┌─────────────────────────────────────────────────────────────────┐
│  [+ Add application]                                             │
│  ● Google SWE        INTERVIEW         May 30 prep               │
│  ● Stripe Eng        APPLIED           Follow up Jun 1           │
│  ● Meta UX           SAVED             Apply before Jun 15       │
│  ─── Show archived (2) ───                                       │
└─────────────────────────────────────────────────────────────────┘

── HEALTH · WEALTH ────────────────────────────────────────────────
┌─────────────────────────────┬───────────────────────────────────┐
│  WORKOUT HISTORY            │  FINANCES                          │
│  1-day streak               │  $1,200 net · 53% committed        │
│  [heatmap 13×7]             │  Savings: $0 / $2,000              │
└─────────────────────────────┴───────────────────────────────────┘

── MARKETS (compact) ──────────────────────────────────────────────
┌─────────────────────────────┬───────────────────────────────────┐
│  OPTIONS FLOW · top 5       │  NEWS FEED · top 5                 │
└─────────────────────────────┴───────────────────────────────────┘

── COUNCIL'S DREAMS ───────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│                     DREAMING SURFACES                            │
└─────────────────────────────────────────────────────────────────┘

── NEXT ACTION ────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│                   NEXT ACTION CARD (full-width)                  │
└─────────────────────────────────────────────────────────────────┘

── SYSTEM PULSE ───────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│  KPI · Hermes · MCP · Tokens · Domains       [compact strip]    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tasks (build order)

### Task 1 — Create SectionLabel component (FOUNDATION)

**File:** `components/SectionLabel.tsx` (NEW)

```tsx
type Props = { label: string; meta?: string; className?: string };

export default function SectionLabel({ label, meta, className = '' }: Props) {
  return (
    <div className={`mx-12 mt-12 mb-3 flex items-baseline gap-4 ${className}`}>
      <div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">{label}</div>
      <div className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
      {meta && <div className="font-mono text-[10px] text-text-muted">{meta}</div>}
    </div>
  );
}
```

Used between every section. The gradient line + tracked label = magazine rhythm.

### Task 2 — InternshipPanel (CRITICAL — Woody's #1 use case)

Full spec lives in [CODEX-PASS-4.md](CODEX-PASS-4.md) Task 1. Build it exactly as described:
- `lib/internships.ts` (SQLite)
- `lib/paths.ts` add `internshipsDb`
- `app/api/internships/route.ts` + `app/api/internships/[id]/route.ts`
- `components/InternshipPanel.tsx` (client, with inline quick-add)

**Refinement on the spec:** Use SectionLabel above it ("INTERNSHIP HUNT" + meta `${active} active · ${interview} interview`). Header inside the panel is just the [+ Add] button, no duplicate label.

### Task 3 — Create SideBySide grid wrapper

**File:** `components/SideBySide.tsx` (NEW)

```tsx
import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export default function SideBySide({ children }: Props) {
  return (
    <div className="mx-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
      {children}
    </div>
  );
}
```

Used to pair WorkoutPanel + FinancePanel and UnusualOptionsPanel + NewsFeedPanel.

**IMPORTANT:** This means WorkoutPanel, FinancePanel, UnusualOptionsPanel, and NewsFeedPanel need their `mx-12` removed from their root `<section>` (since SideBySide handles outer margin). Update them to:
```tsx
<section className="mb-0 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
```
(remove `mx-12` and `mb-6` — those move to the wrapper)

### Task 4 — Create SystemPulseStrip (consolidate footer noise)

**File:** `components/SystemPulseStrip.tsx` (NEW, server component)

Combines what's currently in: `KpiStrip`, `PulseStrip`, `McpStrip`, `TokenBurnMeter`, `DomainRow`.

One horizontal flex strip:
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚡ 3 jobs   ◉ 12 MCP   ⚙ Token: 4.2k/2h   📊 5 KPIs    [...]   │
└─────────────────────────────────────────────────────────────────┘
```

Each cell is small (font-mono text-[10px]), with a single icon + value + label. Hover any cell to expand details. No giant panels. This frees ~600px of vertical real estate.

Style: `mx-12 mb-12 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-5 py-3`

If consolidation is too much in one pass, just import the existing strips into this wrapper as smaller compact variants — but they must all fit in one row.

### Task 5 — Rewrite `app/page.tsx`

Replace the body with:

```tsx
import dynamicImport from 'next/dynamic';
import AmbientEmbers from '@/components/AmbientEmbers';
import DailyRitesPanel from '@/components/DailyRitesPanel';
import HeroBand from '@/components/HeroBand';
import NextActionCard from '@/components/NextActionCard';
import AgenticOsTabs from '@/components/AgenticOsTabs';
import DreamingSurfaces from '@/components/DreamingSurfaces';
import UnusualOptionsPanel from '@/components/UnusualOptionsPanel';
import NewsFeedPanel from '@/components/NewsFeedPanel';
import WorkoutPanel from '@/components/WorkoutPanel';
import FinancePanel from '@/components/FinancePanel';
import InternshipPanel from '@/components/InternshipPanel';
import SectionLabel from '@/components/SectionLabel';
import SideBySide from '@/components/SideBySide';
import SystemPulseStrip from '@/components/SystemPulseStrip';
import { getRealmStatus } from '@/lib/realm-status';
import { getActiveInternshipCounts } from '@/lib/internships';

const MarketPulseBar = dynamicImport(() => import('@/components/MarketPulseBar'), { ssr: false });

export const dynamic = 'force-dynamic';

export default async function Home() {
  await getRealmStatus();
  const { active, interview } = getActiveInternshipCounts();
  const today = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Chicago', weekday: 'long', month: 'short', day: 'numeric',
  });

  const realmContent = (
    <>
      <AmbientEmbers />
      <MarketPulseBar />

      <HeroBand />

      <SectionLabel label="TODAY" meta={today} />
      <DailyRitesPanel />

      <SectionLabel
        label="INTERNSHIP HUNT"
        meta={`${active} active${interview > 0 ? ` · ${interview} interview` : ''}`}
      />
      <InternshipPanel />

      <SectionLabel label="HEALTH · WEALTH" />
      <SideBySide>
        <WorkoutPanel />
        <FinancePanel />
      </SideBySide>

      <SectionLabel label="MARKETS" />
      <SideBySide>
        <UnusualOptionsPanel />
        <NewsFeedPanel />
      </SideBySide>

      <SectionLabel label="COUNCIL'S DREAMS" />
      <DreamingSurfaces />

      <SectionLabel label="NEXT ACTION" />
      <div className="mx-12 mb-8">
        <NextActionCard />
      </div>

      <SectionLabel label="SYSTEM PULSE" />
      <SystemPulseStrip />
    </>
  );

  return <AgenticOsTabs realm={realmContent} />;
}
```

**Removed from layout:** TracingBeam (eliminated — too expensive for what it adds), TodaysWyrd (rolled into DailyRites), QuickActionsGrid (moved to /quick-actions or removed), LatestForging (rolled into DreamingSurfaces), the 4 redundant footer strips (consolidated).

If TodaysWyrd / QuickActionsGrid / LatestForging contain valuable info, surface their data inside DailyRitesPanel or DreamingSurfaces rather than as standalone panels.

### Task 5b — Internship field & default starter prompts

User is a UH finance major hunting any **business-related internship**: finance, consulting, banking, corporate finance, ops, marketing analytics, wealth mgmt, real estate. Houston-focused.

When building InternshipPanel's empty state, suggest 5 placeholder companies as quick-add buttons:
- ExxonMobil (Houston · Energy · Finance Intern)
- Chevron (Houston · Energy · Corporate Finance)
- Halliburton (Houston · Energy · Business Analyst)
- BofA Houston (Banking · Corporate Banking Intern)
- Deloitte (Houston · Consulting)

When tuning Perseus/Sauron starter prompts for ChatSurface (Pass 4 Task 4), make these business-focused:
```
perseus: [
  'Research finance/consulting internships at Houston energy companies',
  'Analyze my budget — am I saving fast enough at $500/mo?',
  'Run the numbers on which Houston companies offer summer business internships',
]
sauron: [
  'Deep-dive ExxonMobil internship program — requirements + interview process',
  'Scan all Houston energy companies hiring summer 2026 business interns',
  'Surveil Big 4 consulting recruiting timeline for sophomores',
]
```

### Task 6 — Remove TracingBeam usage from page.tsx

**Why:** It wrapped the entire page, ran scroll listeners on every section, and contributed significantly to the 188KB bundle. Visual payoff is marginal for the cost.

**Action:** Don't import or wrap with `<TracingBeam>` in page.tsx. Keep the component file in case it's wanted on a different surface (like a single agent page).

If you want a subtle vertical accent down the left edge of the page, replace with a static CSS pseudo-element instead:
```css
body::before {
  content: '';
  position: fixed; left: 24px; top: 80px; bottom: 80px; width: 1px;
  background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.04), transparent);
  pointer-events: none;
}
```

### Task 7 — Add `getActiveInternshipCounts()` to `lib/internships.ts`

After Task 2 builds the internships system, add this helper:

```ts
export function getActiveInternshipCounts(): { active: number; interview: number } {
  const rows = getDb()
    .prepare(`SELECT status FROM internships WHERE status NOT IN ('rejected', 'ghosted')`)
    .all() as Array<{ status: string }>;
  return {
    active: rows.length,
    interview: rows.filter((r) => r.status === 'interview').length,
  };
}
```

### Task 8 — Bundle size audit

After all changes, run:
```bash
cd dashboard && npm run build
```
Report the first-load JS size for `/`. Target: **under 140KB**. The page should feel instant.

If still over budget:
- `framer-motion` → dynamic import for BorderBeam (it's only on the active council card anyway)
- Remove unused Lucide icons (audit `lucide-react` imports)

### Task 9 — Polish: SVG icons in DailyHabitsStrip

The current habits use generic SVG paths. Replace with **Lucide icons** (already a dep):
- `workout` → `Dumbbell` (not lightning bolt)
- `read` → `BookOpen`
- `podcast` → `Headphones`
- `stocks` → `LineChart`

Import: `import { Dumbbell, BookOpen, Headphones, LineChart } from 'lucide-react';`

This eliminates ~40 lines of inline SVG paths and uses consistent stroke width.

### Task 10 — DailyRitesPanel: pull `stocks` → `apply` rename

Update `lib/habits.ts`:
```ts
export const HABIT_KEYS = ['workout', 'read', 'podcast', 'apply'] as const;
export const HABIT_LABELS: Record<HabitKey, string> = {
  workout: 'Work Out',
  read: 'Read',
  podcast: 'Podcast',
  apply: 'Apply',  // was 'Stocks'
};
```

Add a one-time migration at the top of `getDb()`:
```ts
db.exec(`UPDATE habits SET habit = 'apply' WHERE habit = 'stocks'`);
```

`DailyHabitsStrip.tsx` icon for `apply`: `import { Send } from 'lucide-react';`

`scripts/sync-workouts-obsidian.js` — change `'stocks'` to `'apply'` in HABIT_KEYS.

---

## Design contract reminders

```tsx
// Liquid glass panel
<section className="overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.05] to-transparent shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
```

- Section label: `text-rune text-[10px] tracking-[0.3em] text-text-muted`
- Panel title: `font-display text-xl text-text-primary`
- Numbers: `font-numeric`
- Body: `text-[12px] text-text-secondary`
- Interactive: always `cursor-pointer`, always `transition-colors duration-200`
- NO emojis as icons — use Lucide icons (already installed)
- NEVER `::` or `0.0.0.0` — only `127.0.0.1`

---

## File map for this pass

| File | Action |
|------|--------|
| `components/SectionLabel.tsx` | CREATE |
| `components/SideBySide.tsx` | CREATE |
| `components/SystemPulseStrip.tsx` | CREATE |
| `components/InternshipPanel.tsx` | CREATE (Pass 4 spec) |
| `lib/internships.ts` | CREATE (+ `getActiveInternshipCounts`) |
| `lib/paths.ts` | EDIT — add `internshipsDb` |
| `app/api/internships/route.ts` | CREATE |
| `app/api/internships/[id]/route.ts` | CREATE |
| `app/page.tsx` | REWRITE per Task 5 |
| `lib/habits.ts` | EDIT — rename `stocks` → `apply` + migration |
| `components/DailyHabitsStrip.tsx` | EDIT — Lucide icons, `apply` label |
| `scripts/sync-workouts-obsidian.js` | EDIT — `stocks` → `apply` |
| `components/WorkoutPanel.tsx` | EDIT — remove `mx-12 mb-6` from section |
| `components/FinancePanel.tsx` | EDIT — same |
| `components/UnusualOptionsPanel.tsx` | EDIT — same |
| `components/NewsFeedPanel.tsx` | EDIT — same |

---

## Acceptance criteria

After this pass:
1. `/` first-load JS under 140KB (was 188KB)
2. 5 named sections visible on home with tracked label dividers
3. WorkoutPanel + FinancePanel render side-by-side at lg breakpoint
4. UnusualOptionsPanel + NewsFeedPanel render side-by-side at lg breakpoint
5. InternshipPanel is functional: add, list, mark status, archive
6. No TracingBeam wrapper around page content
7. Single SystemPulseStrip replaces 4 separate footer strips
8. Daily habits: workout, read, podcast, **apply** (not stocks)
9. All habits use Lucide icons, not custom SVG paths
10. Mobile gate still works (`sm:hidden` desktop-only message)
