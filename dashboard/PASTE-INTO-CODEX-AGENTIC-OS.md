# Codex Build Spec — Woody's Realm → Agentic OS

**Author:** Claude (lead designer)
**For:** Codex (engineer)
**Date:** 2026-05-24 · **Status:** FINAL — all decisions locked
**Supersedes:** every earlier Slice 6 / Slice 7 / Allthing / earlier Agentic-OS draft. This is the single source of truth.

> Copy everything between the `=====` lines and paste into a fresh Codex session.

=====

## Context — the locked architecture

Woody's Realm dashboard is becoming an **Agentic OS** — modeled on Chase AI's Obsidian Command Center and Jack Roberts' Hermes triad, re-skinned in Woody's Norse aesthetic. After deep research (7 YouTube videos, 21st.dev, production AI dashboards), the architecture is LOCKED:

1. **The dashboard stays a Next.js app** at `http://127.0.0.1:3737` — the beautiful, future-proof foundation.
2. **It gets embedded inside Obsidian** via the Custom Frames plugin (a dedicated pane) and the bottom is a real terminal via the Terminal plugin.
3. **The dev server auto-starts on Windows boot** via Task Scheduler — `127.0.0.1:3737` is always live.
4. **`render.js` is already repurposed** — Claude redirected its markdown output from `HOME.md` to `AIOS Digest.md`. You only ADD a JSON output (Part 1).
5. **The home page becomes the Agentic OS layout** — token burn, KPI strip, quick actions, dreaming surfaces.
6. **A cost-aware triad pipeline** orchestrates Claude CLI + Codex CLI + DeepSeek + free models (Cerebras/Groq/Gemini) with heavy critique.

Stack unchanged: Next.js 14 App Router, TypeScript, Tailwind 3.4 (typography plugin installed), better-sqlite3, localhost-only port 3737.

## Hard style locks

- Cinzel display ≥24px ONLY · Inter body · JetBrains Mono code · IBM Plex Mono numerics
- OKLCH palette via `tailwind.config.ts` + `styles/tokens.css` — no new colors
- `panel` utility for cards · asymmetric grids (62/38, 2/1/1) · no equal grids on main surfaces
- Norse vocabulary in NARRATIVE/labels: Wyrd, Hoard, Forge, Mímir, Heimdall, The Ravens, Yggdrasil, The Council
- **EXCEPTION — buttons are plain and functional.** Quick-action buttons say exactly what they do ("Morning Brief", "Deep Research"). No mythic button names. Woody must know what a button does at a glance.
- AmbientEmbers atmospheric motion stays · painterly Theros × Hades aesthetic
- No shadcn primitives, no generic dark-SaaS look

---

## How Codex should work

This is a long spec. Work it like a professional engineer.

### Cadence
1. **Read before building.** Read this whole spec, then `render.js`, then the neighboring files for the Part you're on.
2. **One Part at a time, in order.** Parts are sequenced; each builds on the last.
3. **Checkpoint after every Part** — `npm run typecheck` and `npm run build` both pass before moving on.
4. **Commit per Part, locally** — `feat(agentic-os): Part N — <outcome>`. NO `git push`. Woody reviews and pushes.
5. **Small diffs, match existing style.**

### STOP POINT — this session
**Build Parts 1 through 5, then STOP and report.** Do NOT do Parts 6–8 in this session. Woody reviews the working Agentic OS (Parts 1–5 give a functional dashboard) before you proceed to the triad (Part 7 spends real money on DeepSeek). After Woody approves, a follow-up session does Parts 6–8.

### CRITICAL — Woody must be able to SEE the dashboard
Before you report Parts 1–5 done, the dashboard MUST be live and viewable:
1. Start the dev server: `npm run dev` in the dashboard directory (it binds `127.0.0.1:3737`).
2. Verify `http://127.0.0.1:3737` loads in a browser and the REALM tab renders fully — sidebar, token burn, KPI strip, quick actions, all of it.
3. In your report, explicitly confirm: "Dashboard is live at http://127.0.0.1:3737 — REALM tab renders." Describe what's on screen.
This is non-negotiable. Woody wants to open localhost and see his Agentic OS. A spec that builds components but leaves the server down is NOT done.

### When you hit a decision the spec doesn't resolve
Make the most conservative, most reversible choice. Log it in the review doc under "Decisions I made." Keep moving.

### When you hit a blocker
If `typecheck`/`build` fails and you can't fix it in ~10 min: revert that file, note it, move to the next independent Part. If a dependency is genuinely missing: stub it, mark `TODO(woody-review)`, continue.

### Verification is not optional
Never report a Part "done" without evidence. UI Parts: describe what renders. Script Parts: show the command ran and produced the expected file. "It should work" is not done.

---

## PART 1 — render.js JSON output

**File:** `~/.claude/scripts/aios-dashboard/render.js` (READ IT FIRST — ~595 lines)

Claude already redirected its markdown output to `AIOS Digest.md` (HOME.md is now free for the dashboard embed). render.js computes per-model token usage + cost, skill counts, tool counts, project stats, "Dreaming Surfaces" pattern detection, BATON parse, MCP list, recent sessions.

**Your task:** ADD a JSON output alongside the existing markdown. Do not remove or change the markdown logic.

1. At the end of `render()`, after `fs.writeFileSync(HOME_PATH, md)`, add:
   ```js
   const statsJson = {
     generatedAt: new Date().toISOString(),
     lookbackDays: LOOKBACK_DAYS,
     models: Object.fromEntries(
       [...stats.modelTokens.entries()].map(([m, t]) => [m, { ...t, cost: cost.perModel[m]?.cost ?? 0 }])
     ),
     totalCost: cost.total,
     topSkills: topSkills.map(([s, c]) => ({ skill: s, count: c })),
     topTools: topTools.map(([t, c]) => ({ tool: t, count: c })),
     projects: PRIMARY_PROJECTS.map(key => {
       const s = stats.projectStats.get(key);
       return { key, name: (PROJECT_MAP[key]||{}).name || key,
         sessions: s ? s.sessions.size : 0, prompts: s ? s.userMessages : 0,
         lastTouched: s ? s.lastTouched : 0 };
     }),
     dreams, mcps,
     recentSessions: stats.recentTitles.slice(0, 8),
     baton,
   };
   fs.writeFileSync('C:/Github Repos/everything-claude-code/dashboard/data/aios-stats.json',
     JSON.stringify(statsJson, null, 2), 'utf8');
   ```
2. Create `dashboard/lib/aios-stats.ts` — a typed reader with a 60s module-level cache. Type: `AiosStats` mirroring the JSON above. `readAiosStats(): AiosStats | null`.

**Checkpoint:** run `node "C:/Users/woody/.claude/scripts/aios-dashboard/render.js"`, confirm `dashboard/data/aios-stats.json` appears and parses.

---

## PART 2 — KPI Strip

**File:** `components/KpiStrip.tsx`

Three tiles in a row (a strip — equal widths OK here):

| Tile | Source | Shows |
|---|---|---|
| TRADING | `lib/adapters/trading.ts` `getTradingDetail()` | Latest parlay EV % or "no slate" — color by freshness |
| DOCTOR | `lib/doctor-signal.ts` `getDoctorSignal()` | Health headline + freshness dot |
| TASKS | `lib/tasks.ts` `listTasks()` | Open count + critical count |

Each tile: large IBM Plex Mono number, rune-label caption, agent-accent icon in the corner, `panel` utility. Build this first — it's the simplest component and validates the data-wiring pattern.

**Checkpoint:** the 3 tiles render with real data on the home page.

---

## PART 3 — The Agentic OS home layout

Rebuild `app/page.tsx` into the Agentic OS command center.

### Tabs at the top: `REALM · COUNCIL · SAGA · YGGDRASIL`

- **REALM** — fully built this slice (everything below).
- **COUNCIL · SAGA · YGGDRASIL** — lightweight stubs this slice. Each: a titled panel with a one-line description and a "lands in a later slice" note. Real builds come later. Do NOT over-invest here.

### REALM tab layout (top to bottom)

```
HeroBand (scene + greeting) ............... KEEP existing component
TOKEN BURN METER .......................... Part 4
KPI STRIP ................................. Part 2
LATEST FORGING card ....................... most recent significant agent output
QUICK ACTIONS GRID ........................ Part 5
DREAMING SURFACES ......................... self-improvement list from aios-stats.json `dreams`
MCP STRIP ................................. small monospace chips of connected MCP servers
DomainRow + ActivityStream ................ KEEP existing components
```

### New components
- `components/TokenBurnMeter.tsx` — Part 4
- `components/LatestForging.tsx` — reads most recent `recentSessions` entry from `aios-stats.json`
- `components/QuickActionsGrid.tsx` — Part 5
- `components/DreamingSurfaces.tsx` — renders `dreams[]` as a callout list
- `components/McpStrip.tsx` — renders `mcps[]` as small chips

Tabs use existing patterns (not shadcn). REALM is the default.

**Checkpoint:** the home page renders the full REALM tab; the other 3 tabs show clean stubs.

---

## PART 4 — Token Burn Meter (stacked bars, 4 providers)

**File:** `components/TokenBurnMeter.tsx`

Chase-AI style: horizontal stacked bars, one per provider, stacked vertically.

| Provider | Color | Data source |
|---|---|---|
| Claude (Max sub) | rune-gold | `aios-stats.json` → `claude-*` models → cost + turns |
| Codex (ChatGPT Plus) | bifrost | `data/codex-usage.json` (Part 4b poller) |
| DeepSeek (paid, $5 balance) | blood | `data/triad-usage.json` → deepseek entries → real $ spent |
| Free tiers (Cerebras/Groq/Gemini) | emerald | `data/triad-usage.json` → free entries → quota used |

- Each bar: filled (used) in the provider color, hatched faded portion (remaining).
- DeepSeek bar shows **$ remaining against the ~$5 balance** + a warning tint when today's spend crosses $0.50.
- Right label per bar: `$X.XX` or `XX%` in IBM Plex Mono.
- Header: `TOKEN BURN · last 5h window` + `last pull Xm ago`.
- Respects reduced-motion (no animated fill).

### Part 4b — Codex usage poller
`dashboard/scripts/tools/poll-codex-usage.js` — reads Codex CLI's local logs (explore `~/.codex/`), aggregates today's usage, writes `data/codex-usage.json`. If logs aren't parseable, write `{ available: false }` and the meter shows Codex as "—". Designed to run every 6 min via Task Scheduler.

**Checkpoint:** the 4-bar meter renders; DeepSeek + free bars read from `triad-usage.json` (which Part 7 will populate — until then, render zeros gracefully).

---

## PART 5 — Quick Actions Grid

**File:** `components/QuickActionsGrid.tsx`

**Plain, functional button names.** Woody must know exactly what each does. 10 buttons, 2 rows × 5:

| Button | What it does |
|---|---|
| Morning Brief | runs `scripts/loops/morning-trading-brief.js` (Sauron→Thor→Lebot) |
| Deep Research | Sauron deep-research Forging (quad, Part 7) |
| Plan Today | Lebot drafts today's plan → writes to today's Obsidian daily note |
| Process Inbox | Lebot processes Obsidian `00 Inbox/`. Tagged notes (`#luckydog`/`#trading`/`#homework`) route automatically. **Untagged notes: Lebot must ASK Woody which project each belongs to — never guess.** |
| Weekly Review | runs `scripts/loops/weekly-wyrd.js` |
| Build Slate | Perseus builds a DFS/crypto/prediction slate (quad, Part 7) |
| Design Pass | Fenrir design review on the active Hall (quad, Part 7) |
| Vault Cleanup | Lebot scans the vault for dups/broken links |
| Refresh Metrics | re-runs render.js + the pollers, refreshes all `data/*.json` |
| Run Doctor | runs the AIOS Doctor health check |

Each button: `panel` utility + accent border-left. Click → POST to `app/api/forge/[action]/route.ts`. The route spawns the mapped script as a subprocess and streams output back via SSE. Inline status + a result card.

### Interrogator always runs
**Every button that triggers agent work runs the Interrogator FIRST** — it asks Woody clarifying questions before any work begins. This is non-negotiable: Woody wants heavy questioning on every Forging, every time, no matter the task. (Pure utility buttons — Refresh Metrics, Run Doctor — skip the Interrogator; they're not agent Forgings.)

The Interrogator surfaces its questions as a card in the UI; Woody answers inline; only then does the pipeline proceed.

### Output routing
Every Forging's output note is written into the **active Hall's folder** in the vault (Lucky Dog / Trading / ECC) — each project's work stays with that project. Plus a "Save to Saga" affordance.

Create `app/api/forge/[action]/route.ts` — validate the action slug against the 10 above, spawn the mapped script, stream stdout via SSE.

**Checkpoint:** clicking "Morning Brief" runs the morning brief; clicking "Run Doctor" runs Doctor. Interrogator card appears for agent-work buttons.

---

> ⏹ **STOP HERE THIS SESSION.** Parts 1–5 give Woody a working Agentic OS home. Report back. Parts 6–8 below are for the follow-up session after Woody's review.

---

## PART 6 — Auto-start the dev server on Windows boot

Create `dashboard/scripts/tools/start-dashboard.bat`:
```bat
@echo off
cd /d "c:\Github Repos\everything-claude-code\dashboard"
npm run dev
```
Create `dashboard/scripts/tools/install-autostart.ps1` — registers a Scheduled Task "Woody's Realm Dashboard": logon trigger, user-scoped, 30s delay, RunLevel Limited, hidden window, action runs the `.bat`. Document in the header how Woody runs it once. **Do NOT run it yourself.**

---

## PART 7 — The cost-aware Triad Pipeline

**File:** `dashboard/scripts/triad/forge.js` — a reusable pipeline callable from any Quick Action.

### The Thinker is a cost-aware orchestrator (core principle)

The Thinker does NOT just draft a plan. It **orchestrates**. For every Forging:

1. Runs the **Interrogator** — heavily questions Woody (no cap on questions).
2. Breaks the work into discrete pieces.
3. For each piece, assigns the optimal model considering BOTH **capability** and **cost**.
4. Produces a **visible execution plan**: "Piece 1 → Codex (code gen), Piece 2 → DeepSeek (bulk, cheap), Piece 3 → Cerebras (free scan) — here's why." Shown to Woody.
5. Hands each piece to its assigned worker.

### Woody's model budget — the numbers the Thinker reasons with

| Model | Cost model | Best at |
|---|---|---|
| Claude (Max sub) | flat, quota-limited | synthesis, taste, reasoning, planning |
| Codex CLI (ChatGPT Plus $20/mo) | flat | code generation, implementation |
| DeepSeek V3 (metered ~$0.27/M in, $1.10/M out; $5 balance) | **real money** | bulk generation, long context |
| Cerebras / Groq / Gemini | $0 free | fast scanning, extraction, critique |

The Thinker prefers flat-cost and free options; it spends DeepSeek only when bulk/long-context work genuinely warrants it.

### DeepSeek cap + the fallback chain

- Soft warning at **$0.50/day** DeepSeek spend (surface it in the UI + Token Burn Meter).
- Hard stop at **$1.50/day**.
- **Fallback chain when DeepSeek is capped:**
  1. DeepSeek capped → **Codex takes over the worker role automatically.** No pause — Codex (GPT-5) is flat-cost and not a quality drop from DeepSeek. The Thinker stops assigning to DeepSeek for the rest of the day.
  2. Codex ALSO unavailable/capped → the only remaining workers are the free tiers (Cerebras / Groq / Gemini), which ARE a quality step down. **Do NOT silently drop to free.** PAUSE the Forging and ask Woody: "DeepSeek and Codex are both unavailable. Continue on free models (Cerebras Qwen 3 235B — modest quality drop) or hold?" Wait for his answer.
- The Thinker must track which workers are available and surface the fallback state in the execution plan it shows Woody.

### Pipeline stages

```
INPUT: { prompt, agent, mode }   mode = solo | triad | quad

1. Interrogator   → heavily questions Woody, waits for answers   [ALWAYS]
2. Thinker        → cost-aware orchestration plan (above)
3. Worker(s)      → each piece runs on its assigned model
   QUAD MODE ONLY — heavy critique loop, max 3 full loops:
4. Critic A       → technical critique      (Cerebras GPT-OSS 120B, free)
5. Critic B       → taste/strategy critique (Groq Llama 3.3 70B, free)
6. Critic C       → user-intent critique    (Gemini 2.5 Flash, free)
   → if any critic flags major issues AND loop < 3: back to Thinker → Worker
7. Final Reviewer → consolidates            (Claude CLI)
8. Verifier       → asks Woody 1–3 confirmation questions
OUTPUT: result note → active Hall's vault folder · cost log → data/triad-usage.json
```

- **Standard triad mode:** thinker → worker → one review. NO critique loop.
- **Quad mode only:** the 3-critic heavy loop, max 3 iterations.
- A fast classifier (Cerebras Llama 3.1 8B, free) picks `solo`/`triad`/`quad` by prompt complexity. Woody can override. The chosen mode is always shown.
- **Worker routing is auto** — the Thinker picks Codex vs DeepSeek per piece. Always show which model ran each piece in the UI.

### Provider wiring

Extend `scripts/loops/lib/router.js` with two providers:
- `codex` — shells out to `codex` CLI non-interactively (explore `codex --help` for the print/exec flag).
- `deepseek` — OpenAI-compatible API at `https://api.deepseek.com/v1/chat/completions`, models `deepseek-chat` (V3) and `deepseek-reasoner` (R1). Key: `DEEPSEEK_API_KEY` in `.env.local` (already set).

Every Forging writes per-stage cost + which model ran to `data/triad-usage.json` (feeds the Token Burn Meter).

---

## PART 8 — Cleanup + Obsidian setup doc

### Route cleanup
Audit the existing routes: `/memory`, `/activity`, `/skills`, `/skills/[realm]`, `/trading`, `/lebot-james`, `/thor`, `/perseus`, `/fenrir`, `/sauron`.
- **Delete** any route that is now fully redundant with the Agentic OS home AND has no real content/use case.
- **Keep** any route that still has genuine standalone value or real content (e.g. `/memory` Mímir's Well, `/trading`).
- List your keep/delete decisions in the review doc with one-line reasoning each. When unsure, keep.

### Obsidian setup doc
Create `dashboard/docs/OBSIDIAN-SETUP.md` documenting for Woody:
1. **Custom Frames** — add a frame pointing at `http://127.0.0.1:3737`, named "Command Center", opens as a dedicated pane.
2. **Terminal plugin** — 6 profiles: Lebot James / Thor / Perseus / Fenrir / Sauron (each `claude` with the persona file) + Codex (`codex`).
3. **Recommended layout** — Command Center pane center, terminal docked bottom (35%), vault tree left.
4. **Workspaces plugin** — save this as "Realm OS" for one-click restore.
5. Note: `HOME.md` can optionally embed the Command Center via a Custom Frames code block.

---

## Build order (this session: Parts 1–5)

1. Part 1 — render.js JSON + `lib/aios-stats.ts`
2. Part 2 — KPI Strip
3. Part 4 — Token Burn Meter + Codex poller
4. Part 5 — Quick Actions Grid + `/api/forge/[action]`
5. Part 3 — assemble the full REALM tab + the 3 stub tabs

`typecheck` + `build` pass after each. Commit per Part. Then STOP and report.

(Parts 6, 7, 8 = follow-up session after Woody reviews.)

---

## Hard rules — do NOT touch

- `lib/agent-status.ts` · `personas/*.md` · `content/norse-copy.json` — Claude owns these
- `~/.claude/scripts/aios-dashboard/render.js` — you only ADD the JSON output; do not change the markdown logic or the scanning brain
- Don't run `install-autostart.ps1` or any Task Scheduler command — Woody does that
- Don't `git push` — local commits only
- No new npm packages needed

## Report back

Write `dashboard/docs/codex-to-claude-review-agentic-os-2026-05-24.md`:
- What shipped per Part · checkpoints passed · `typecheck`/`build` results
- Keep/delete decisions deferred to Part 8 (not this session)
- "Decisions I made" — any forks you resolved
- Open questions for Woody
- How to verify each Part

Begin with Part 1. Build through Part 5. Stop. Report.

=====

## Notes for Woody (not part of the Codex prompt)

- **Codex builds Parts 1–5 this session** (~4–5 hrs) → you get a working Agentic OS home. Then it stops so you can review before the triad (Part 7) spends DeepSeek money.
- **render.js is already fixed** by me — see the A1 explanation in chat.
- **Realm Map Canvas** is still a separate small task I do once you green-light it (explained in chat).
