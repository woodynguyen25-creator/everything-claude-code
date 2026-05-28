# Claude → Codex: Slice 3.5 Marching Orders

**Date:** 2026-05-18
**Author:** Claude (design / UX / IA lead)
**Status:** Slice 3 ACCEPTED as new home baseline. Slice 3.5 = Doctor/Tasks contract migration + polish pass + critical architectural fix (separate `/` from `/lebot-james`).

---

## Context

Slice 3 shipped cleanly. Composition is real. Foundation is solid. Now we tighten + migrate + fix one important architectural confusion that surfaced after Woody saw the live home page.

Read first (in order):
1. `dashboard/docs/claude-critique-slice-3.md` — full critique of Slice 3
2. `dashboard/DESIGN-LANGUAGE.md` — authoritative spec
3. This doc — marching orders for Slice 3.5

---

## What's locked since you last shipped

While you built Slice 3, Claude (this session) produced these new artifacts. **Read but do not edit them in this slice — they are Claude's owned content:**

- `dashboard/data/quotes.json` — **100 curated quotes** (Hávamál + Stoic + biblical + LeBron + Sun Tzu + others). This REPLACES the 10-quote placeholder file. The dashboard's daily quote rotation will land much harder once you redeploy.
- `dashboard/personas/lebot-james.md` — Lebot James persona spec (system prompt + voice + tools + delegation rules + sample greetings)
- `dashboard/personas/thor.md` — Thor persona
- `dashboard/personas/perseus.md` — Perseus persona
- `dashboard/personas/fenrir.md` — Fenrir persona
- `dashboard/personas/sauron.md` — Sauron persona

These persona files describe the **5 agents of the Council of the Realm**. Each one specifies its system prompt, model selection, tool access, signature visual motif, and delegation rules. They are ready to power agent routes when you build them.

**You should:** read each persona file before implementing the corresponding agent page or chat surface. The voice + delegation logic is locked there.
**You should NOT:** edit the personas. If something feels wrong, ping Claude — those are Claude's lane.

---

## Slice 3.5 deliverables (one PR, in order of priority)

### Priority 1 — **Architectural fix: separate `/` (Home) from `/lebot-james` (Agent)** [~1-2 hours]

**The problem:** Currently the AIOS-AGENT sidebar card links to `/`, conflating the operator's home dashboard with Lebot James's dedicated agent page. Woody flagged this — they should be distinct surfaces.

**The fix:**
- `/` stays the operator home (current composition: HeroBand + PulseStrip + NextAction + SessionGlyph + TodaysWyrd + DomainRow + ActivityStream) — **no content change**, just identity change. It's Lord Woody's home, not Lebot's.
- **NEW: `/lebot-james` route** — Lebot James's dedicated agent page. For v1, this can be a stub identical in structure to `/fenrir` (placeholder AgentHero + simple "awaiting Ravens/Slice 4 chat surface" copy). Reads from `dashboard/personas/lebot-james.md` for title/persona/voice copy. The full chat surface lands in Slice 4 (Ravens).
- **Update `components/Sidebar.tsx`:**
  - Replace `AGENTS` entry `{ href: '/', codename: 'AIOS-AGENT', persona: 'Odin · All-Father', accent: 'gold' }` with `{ href: '/lebot-james', codename: 'AIOS-AGENT', persona: 'Lebot James · All-Father', accent: 'gold' }`
  - Rename `'Odin · All-Father'` → `'Lebot James · All-Father'` (Odin was a placeholder; Lebot James is locked)
  - Keep `{ href: '/fenrir', codename: 'FENRIR-AGENT', persona: 'The Great Wolf', accent: 'blood' }` for now (Fenrir's full persona lands in Slice 4)
  - **Future-stub (don't build yet, but plan):** add THOR, PERSEUS, SAURON cards to a "future agents" disabled state, OR leave for Slice 4 entirely. Your call — but the sidebar should be ready to grow.

### Priority 2 — **SessionGlyph swap on `/`: Lebot placeholder → Vegvísir realm sigil** [~30 min]

**The problem:** The home SessionGlyph is currently rendering an abstract Norse rune (placeholder for Lebot James's eventual cyborg-LeBron portrait). But since `/` is becoming the operator's home (not Lebot's), the SessionGlyph should represent **Lord Woody's realm**, not an agent.

**The fix:**
- Update `components/SessionGlyph.tsx` to render a **Vegvísir** (Icelandic wayfinder stave — the "that which shows the way through storms" rune).
- Keep the existing animations: 12s outer-ring rotation, rune-glow on inner runes, `critical` prop turns the center red on storm-state.
- The Vegvísir is an 8-armed circular rune. Reference: search "Vegvisir Icelandic stave SVG" for the canonical shape — 8 vertical staves radiating from a center, each with different ornamental terminations. Hand-tune the SVG paths to match the locked aesthetic.
- **The Lebot James cyborg portrait** lives on `/lebot-james` once Midjourney art lands — NOT on `/`. SessionGlyph on home stays the operator's mark forever.

### Priority 3 — **Doctor + Tasks `PanelSignal` contract migration** [~half day]

**Current state:** Only `TradingPanel` consumes the `PanelSignal` shape. `DoctorPanel` and `TasksPanel` still use their own internal types. This blocks future "ask agent" buttons per panel, blocks staleness UX consistency, and blocks ActivityStream from getting structured event data.

**The fix:**

1. **Update `types/panel-card.ts`** if needed — no changes expected, the contract is already correct.
2. **Migrate `lib/doctor.ts`** to add a `getDoctorSignal(): Promise<PanelSignal>` function that wraps the existing `readDoctor()` and returns the shape:
   ```ts
   {
     freshness: { iso: lastRun.startedAt, staleAfterMs: 12 * 60 * 60 * 1000 },
     headline: `${fixed} healed · ${deferred} deferred`,
     detail: doctor.message,
     nextAction: doctor.status === 'crit' ? { verb: 'Open Doctor log', href: '/api/doctor', hotness: 3 } : null,
     source: 'aios-doctor',
     isFresh: ageMinutes < 12 * 60,
   }
   ```
3. **Migrate `lib/tasks.ts`** to add a `getTasksSignal(): Promise<PanelSignal>` function:
   ```ts
   {
     freshness: { iso: mostRecentUpdate, staleAfterMs: 7 * 24 * 60 * 60 * 1000 },
     headline: `${openCount} open · ${criticalCount} priority`,
     detail: openCount === 0 ? 'The forge is empty.' : `Top: ${topPriorityTask.title}`,
     nextAction: topPriority ? { verb: 'Open task', href: '/', hotness: topPriority.priority === 3 ? 3 : 1 } : null,
     source: 'tasks',
     isFresh: true,
   }
   ```
4. **Rebuild `DoctorPanel.tsx`** and `TasksPanel.tsx` to consume the signal-shaped output. They should visually match `TradingPanel.tsx`'s pattern: source badge, headline, detail, freshness badge, action button.
5. **Wire ActivityStream** to read more structured events now that Doctor and Tasks both expose timestamps + structured headlines via the contract.

### Priority 4 — **Polish pass** (small atomic commits) [~2-3 hours]

Carry these inline with the priorities above. Each is a small surgical edit:

#### 4a. Drop duplicate `realm.label` from HeroBand
**File:** `components/HeroBand.tsx`
- Remove line 58: `<p className="mt-2 text-base text-text-primary">{realm.label}.</p>`
- Remove `realm` from the `Promise.all` on line 38 — HeroBand no longer needs to fetch realm status (PulseStrip handles it).
- **Why:** "Realm under watch" currently appears twice on the home page within 80px of vertical space. Hero is for mood/greeting; PulseStrip is for ops status. They should never overlap.

#### 4b. Fix the weekend-greeting-at-night bug
**File:** `components/HeroBand.tsx`, `greetingFor()` function
- **Current bug:** Sunday at 11:32 PM shows "Sunday morning, Lord Woody" because the weekend branch overrides mode-based greeting regardless of time.
- **Fix:** Make the weekend branch time-aware OR fall through to mode-based:
  ```ts
  if (weekday === 'Sat' || weekday === 'Sun') {
    const dayName = weekday === 'Sat' ? 'Saturday' : 'Sunday';
    switch (mode) {
      case 'dawn': return `${dayName} morning, Lord Woody`;
      case 'day': return `${dayName} afternoon, Lord Woody`;
      case 'dusk': return `${dayName} evening, Lord Woody`;
      case 'night':
      default: return `${dayName} night, Lord Woody`;
    }
  }
  ```

#### 4c. Fix PulseClock `-` separator
**File:** `components/PulseClock.tsx`, line 67
- Change `${now.eastern.replace(/^[A-Za-z]{3}\s/, '')} - ${now.market}` to `${now.eastern.replace(/^[A-Za-z]{3}\s/, '')} · ${now.market}` (hyphen → bullet for visual consistency with the rest of the strip).

#### 4d. Fill in `profile.json` schedule
**File:** `data/profile.json`
- Update the `schedule.work` block with Woody's locked schedule:
  ```json
  "schedule": {
    "work": { "days": [1,2,3,4,5], "start": "15:00", "end": "19:00" },
    "gym":  { "preferred": "morning", "target": "daily" }
  }
  ```
- Birthday stays `null` — Woody fills when ready.

#### 4e. NextActionCard body typography bump
**File:** `components/NextActionCard.tsx`, line 101
- Change `<p className="mt-4 max-w-xl text-sm leading-7 text-text-secondary">` to `<p className="mt-4 max-w-xl text-base leading-7 text-text-secondary">`.
- **Why:** Card is meant to dominate the 62% row. `text-sm` reads as caption; `text-base` reads as a real hero body.

#### 4f. Clean dead code in NextActionCard `actionTone()`
**File:** `components/NextActionCard.tsx`, lines 12-17
- Either remove the `hotness === 0` branch from `actionTone()` (since `state.action ? ... : ...` at line 104 means hotness-0 code never executes), OR remove the gating and let `actionTone(null)` return safe defaults.
- Small cleanup. Pick whichever feels cleaner.

#### 4g. Clean `void year` smell in mode.ts
**File:** `lib/mode.ts`, line 78-82
- Replace:
  ```ts
  const [year, month, day] = profile.birthday.split('-').map(Number);
  if (!Number.isNaN(month) && !Number.isNaN(day) && month === now.month && day === now.day) {
    specialDay = 'birthday';
  }
  void year;
  ```
- With:
  ```ts
  const [, month, day] = profile.birthday.split('-').map(Number);
  if (!Number.isNaN(month) && !Number.isNaN(day) && month === now.month && day === now.day) {
    specialDay = 'birthday';
  }
  ```

#### 4h. DomainRow tablet fallback (optional)
**File:** `components/DomainRow.tsx`, line 8
- Add `md:grid-cols-2` between `gap-6` and `lg:grid-cols-[2fr_1fr_1fr]` so tablets stack Trading wide + Doctor/Tasks side-by-side instead of full single-column collapse.

---

## Don't-touch list

- `dashboard/data/quotes.json` — **Claude wrote this. Read it, deploy it, don't edit it.** If a quote feels wrong, ping Claude — Claude will refine.
- `dashboard/personas/*.md` (5 files) — **Claude's lane.** These are persona specs Codex consumes when building agent routes. Read for context; don't edit voice, tools, delegation rules, or sample greetings without Claude review.
- `dashboard/DESIGN-LANGUAGE.md` — Claude's authoritative spec. Implementation derives from this; the spec does not derive from implementation.

If you find a typo or genuinely-wrong technical detail in any of these files, fix it inline AND flag in the handoff doc so Claude knows.

---

## Exit criteria for Slice 3.5

- ✅ `npx tsc --noEmit` clean
- ✅ All 5 routes return 200 (including the new `/lebot-james` stub)
- ✅ Sidebar shows "Lebot James · All-Father" linked to `/lebot-james`, NOT to `/`
- ✅ Visiting `/` shows Vegvísir SessionGlyph (not the abstract Norse rune that was a Lebot placeholder)
- ✅ Visiting `/lebot-james` returns 200 with a stub page (full chat lands in Slice 4)
- ✅ `DoctorPanel` and `TasksPanel` consume the `PanelSignal` contract, render matching freshness/headline/action shape
- ✅ "Realm under watch" appears EXACTLY ONCE on the home page (PulseStrip only)
- ✅ Sunday at 11pm shows "Sunday night, Lord Woody" (or "Evening, Realm Lord"), NOT "Sunday morning"
- ✅ PulseClock uses `·` not `-` between Eastern time and market state
- ✅ NextActionCard body is `text-base`
- ✅ `profile.json` schedule has work hours + gym
- ✅ 100-quote bank deployed — random pick on home shows variety across days

---

## What's deferred to Slice 4 (Ravens)

**Do not build in this slice:**
- Full agent chat surface on `/lebot-james` (and `/thor`, `/perseus`, `/sauron` when added)
- Oracle Drawer (⌘K) — The Ravens
- Bell-icon notification history + Telegram + Windows toast wiring
- Per-panel "Ask {agent}" buttons
- Persona system prompts wired to actual Claude CLI invocation
- Cross-domain proactive insights (Lebot James's daily insight)

These all land in v1.5 codenamed Ravens.

---

## What's deferred to v2 (Yggdrasil)

- Hoard / Forge / Daily Rites / Saga panels
- Yggdrasil interactive viz on `/skills`
- Plaid + Apple Health integrations
- In-dashboard persona editor UI

---

## Handoff protocol

When Slice 3.5 lands:
1. Land one PR (atomic, reviewable)
2. Write `dashboard/docs/codex-slice-3-5-migration-polish.md`:
   - What shipped
   - Screenshots (especially: new sidebar with Lebot James link, Vegvísir SessionGlyph on home, stub `/lebot-james` page, migrated Doctor + Tasks panels)
   - What's still mocked / deferred
   - Any open questions for Claude
3. Ping Woody to surface Claude back. I'll critique at `dashboard/docs/claude-critique-slice-3-5.md` and direct Slice 4 (Ravens).

---

## TL;DR for Codex

**Build:**
1. Separate `/` (operator home) from `/lebot-james` (agent stub) → fix sidebar link → rename Odin → Lebot James
2. Swap home SessionGlyph from abstract rune to Vegvísir
3. Migrate Doctor + Tasks panels to `PanelSignal` contract
4. Apply the 8 polish items above

**Don't build:**
- Agent chat surfaces (Slice 4)
- Oracle Drawer (Slice 4)
- Notifications (Slice 4)

**Don't touch:**
- `data/quotes.json`
- `personas/*.md`
- `DESIGN-LANGUAGE.md`

Ship Slice 3.5 in one PR. Critique loop continues after handoff.
