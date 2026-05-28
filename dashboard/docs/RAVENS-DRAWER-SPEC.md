# The Ravens (Oracle Drawer / ⌘K) — Spec

**Status:** v1.5 keystone. **This is the headline feature of Slice 4.**
**Date:** 2026-05-18 (renamed from "Hugin's Whisper" — now collectively named after both of Odin's ravens)
**Author:** Claude (design lead)
**Milestone codename:** Ravens

---

## What it is

The Ravens is Lord Woody's **command palette + memory search + agent escalation drawer**. Named after **Hugin and Munin**, Odin's two ravens. Every day Hugin (Old Norse for "thought") and Munin ("memory") fly across the nine realms — Hugin brings back what *is happening*, Munin brings back what *has happened*. Together they whisper to the All-Father what they have seen. The drawer mirrors that exactly: a tool that flies across your memory + files + agents and brings back what you need.

Press `⌘K` from anywhere on the dashboard → a drawer slides in from the right. Type a question. The drawer searches across memory, files, and (when escalated) calls Lebot James as a live agent to synthesize an answer.

**This is the productivity heart of the dashboard.** Once the Ravens land, the dashboard goes from "beautiful overview" → "actual operator surface I run my day from."

> **Future split note:** if v1.6 ever wants to separate the drawer into two functions, the mythology is ready — **Hugin** owns forward-looking proactive AI suggestions, **Munin** owns backward-looking memory + file recall. For v1.5 they fly together as the Ravens.

---

## Anatomy

```
┌─────────────────────────────────┐
│ THE RAVENS              [Esc]   │
│ ─────────────                   │
│ [What do you seek, Lord Woody?] │
│                                 │
│ 👑 Lebot · ⚡ Thor · 💰 Perseus  │
│ 🐺 Fenrir · 👁 Sauron            │
├─────────────────────────────────┤
│ MEMORY (5)                      │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Memory result 1              │ │
│ │ tag · 2d ago                 │ │
│ │ preview body...              │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Memory result 2              │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Memory result 3              │ │
│ └─────────────────────────────┘ │
│ ...                             │
├─────────────────────────────────┤
│ FILES (2)                       │
│                                 │
│ ◇ obsidian/Trading/...md       │
│ ◇ dashboard/data/wyrd.json     │
├─────────────────────────────────┤
│                                 │
│ [Ask Lebot James → ~$0.12]     │
│ [Ask Sauron the web → ~$0.04]  │
└─────────────────────────────────┘
```

---

## Layout

- **Position:** slide-in drawer from the right edge of the viewport
- **Width:** 420px (fixed)
- **Height:** full viewport height
- **Background:** `bg-bg-panel` with subtle backdrop blur on the rest of the viewport
- **Border:** hairline left edge in `border-border-subtle`
- **Trigger:** `⌘K` hotkey OR click the small raven icon top-right of the dashboard
- **Dismiss:** `Esc`, click backdrop, or click the `[Esc]` hint in the drawer header

---

## Header section

- Title `THE RAVENS` in Cinzel ≥24px tracked 0.2em, gold-tinted
- Subtitle: small italic Inter line: *"Hugin and Munin listen at the bridge."*
- `[Esc]` hint chip at top-right (clickable to close)

## Search input

- Full-width input below header
- Placeholder rotates by mode-time:
  - Dawn/morning: `What do you seek, Lord Woody?`
  - Day: `Speak it, my Lord.`
  - Dusk: `What rises before nightfall?`
  - Night: `What stirs in the dark?`
- Auto-focused when drawer opens
- ⌘K when drawer is open → re-focuses search

## Agent override row

Below the search input, a single horizontal row of 5 small icons + label:
- 👑 **Lebot** (default — gold accent)
- ⚡ **Thor** (electric blue)
- 💰 **Perseus** (emerald)
- 🐺 **Fenrir** (blood)
- 👁 **Sauron** (orange-red)

**Behavior:**
- Default state: no agent selected = query routes via keyword-detection on submit (see Routing below)
- Click an agent icon → forces that agent for the next escalation, icon highlights
- Click again to deselect (back to default routing)
- Visual: small icon + text label, 6px gap between each

## Results sections

Three sections stacked vertically, scrollable as a single viewport:

### Section A: MEMORY (Munin's domain)
- Header: `MEMORY (N)` in Cinzel small caps, tracked 0.2em
- Up to **5 results** — top matches from claude-mem hybrid search (fuzzy + semantic)
- Each result is a small card:
  - Title (Inter `text-sm font-medium`)
  - Type tag (small chip) + relative timestamp (right-aligned)
  - Preview body (Inter `text-xs`, `text-text-secondary`, line-clamp-3)
  - Click → opens full memory in Mímir's Well (`/memory` modal view) OR slides the drawer wider to show the full memory body in-place (Codex's call — modal is cleaner)
- Empty state: *"Munin remembers nothing of this."* (italic)

### Section B: FILES
- Header: `FILES (N)`
- Up to **3 results** — local file matches via grep + `Glob`
- Sources: `Obsidian Vault/`, `dashboard/`, `~/.claude/memory/`
- Each result: file path (truncated to ~40 chars, tooltipped to full path), file type icon
- Click → opens file in VS Code via `vscode://file/...` protocol
- Empty state: *"No files cross the Bifröst."*

### Section C: ESCALATE (button row at bottom — Hugin's domain)
Fixed to the drawer's bottom (sticky). Always visible.

**Primary escalation button:**
- `Ask [Selected Agent] →  ~$X.XX` (estimated cost shown)
- Default text: `Ask Lebot James →  ~$0.12`
- Cost estimate calculated from: query length + estimated response length + the agent's model (Opus = higher, Sonnet = lower)
- Click → triggers the escalation flow (see Escalation Flow below)

**Secondary escalation (when default is Lebot):**
- `Ask Sauron the web →  ~$0.04` (always shown when the query looks research-y — keywords like "find," "what's happening with," "compare")
- Click → forces Sauron route specifically

---

## Routing logic (when no agent is forced)

When Lord Woody submits without picking an agent, the drawer keyword-detects intent and routes:

| Keywords detected | Route to |
|---|---|
| `trade`, `stock`, `option`, `ticker name (AAPL, NVDA, SPY)`, `position`, `entry`, `stop` | Thor |
| `parlay`, `slate`, `DFS`, `prop`, `vig`, `Kelly`, `sportsbook` | Perseus |
| `lucky dog`, `landing`, `CSS`, `design`, `component`, `animation`, `figma`, `tailwind` | Fenrir |
| `find me`, `what's happening`, `latest news`, `compare`, `competitor`, `research` | Sauron |
| All other queries | Lebot James (default) |

If multiple match, score by keyword weight and pick the highest. Tie → Lebot James.

The detected agent's icon highlights briefly before the escalation fires (visual confirmation of the route).

**v1.6 extension:** swap keyword detection for a tiny LLM classifier call (~$0.001 per query) for ambiguous prompts.

---

## Escalation flow (when "Ask Agent →" is clicked)

1. **Confirm cost** — if estimated cost > $0.50, show a one-line confirmation: *"This query may cost ~$X.XX. Proceed?"* with `[Yes]` / `[No]`. Skip confirmation for cheap queries (< $0.50).
2. **Show spinner** — drawer content fades, replaced with the agent's sigil + small "consulting..." text
3. **Spawn the agent** — backend calls `claude --print` with:
   - System prompt = the agent's persona file (`dashboard/personas/{agent}.md` system-prompt section)
   - Tool access = the agent's primary tool list
   - Pre-loaded context = current Doctor JSON + Trading state + recent Tasks + recent Wyrd + claude-mem top-5 results for this query
   - User message = the original query
4. **Stream the response** — as Claude's response streams back, render it in the drawer as a conversation:
   - Agent's sigil + name at top
   - Streaming response body below
   - Below the response: `[Save to Saga]` `[Pin as memory]` `[Continue conversation →]` action buttons
5. **The conversation persists** — saved to `data/conversations/{agent}.db` per-agent (per the Wave 15 lock).
6. **The drawer stays open** — Lord Woody can read, then either dismiss or click `[Continue conversation →]` to navigate to the agent's dedicated page (`/lebot-james`, `/thor`, etc.) with the conversation already loaded.

---

## Keyboard navigation

| Key | Action |
|---|---|
| `⌘K` | Open drawer (or re-focus search if already open) |
| `Esc` | Close drawer |
| `↓` | Move to next result card |
| `↑` | Move to previous result card |
| `Enter` (on focused card) | Open that result |
| `Enter` (in search input, no result focused) | Trigger primary escalation (Ask Lebot or whichever agent is forced) |
| `⌘1` ... `⌘5` | Quick-force agent override (Lebot/Thor/Perseus/Fenrir/Sauron) |
| `Tab` | Cycle through agent override icons |

---

## Architecture

```ts
// lib/ravens.ts (new — formerly planned as lib/oracle.ts)

export type RavensQuery = {
  text: string;
  forcedAgent?: 'lebot' | 'thor' | 'perseus' | 'fenrir' | 'sauron';
};

export type RavensResults = {
  memories: Memory[];   // top 5 from claude-mem hybrid search (Munin's catch)
  files: FileMatch[];   // top 3 from grep + glob
  detectedAgent: AgentName;  // for routing
  estimatedCost: { lebot: number; sauron: number };  // for the escalate buttons
};

export async function search(query: RavensQuery): Promise<RavensResults>;
export async function escalate(query: RavensQuery, agent: AgentName): Promise<ReadableStream<string>>;
```

**Backend route:** `app/api/ravens/route.ts`
- `GET /api/ravens?q=...` → returns results (memory + files + routing)
- `POST /api/ravens/escalate` → spawns the agent, streams response

---

## Visual rules

- Apply universal Slice 3 visual rules
- Cinzel ≥24px ONLY (drawer title, section headers, agent labels in escalation button)
- No gradients on result cards (flat panel)
- One sigil moment per agent (their accent color + icon)
- Hover state: card lifts, rune-gold border glow
- Subtle dark vignette inside the drawer too (universal)
- Drifting embers visible inside the drawer at low density (~3-5 sparks)

---

## Performance

- **Drawer slide-in:** 200ms ease-out-expo (locked)
- **Search debounce:** 150ms (don't fire on every keystroke)
- **Hybrid search target:** <300ms p95 for memory + files lookup
- **Escalation cold start:** acceptable up to 2s before streaming begins (it's a real Claude invocation)
- **Response streaming:** show tokens as they arrive (no buffered wait)
- **Cost calculation:** instant (just math on prompt + estimated output tokens)

---

## Edge cases

- **No query, ⌘K just opened:** show recent queries (last 5 from `data/ravens-history.db`) below the search input. Click to re-run.
- **Search returns 0 memories AND 0 files:** show *"The Ravens fly empty. Speak it as Claude knows it."* with the escalate button still active.
- **claude-mem MCP unavailable:** fall back to file-system search only, show small dev-warning chip.
- **Claude CLI unavailable / API key missing:** escalate button disabled with tooltip *"Claude offline. Configure `claude` CLI first."*
- **Drawer opened on `/memory` or `/activity`:** repurpose ⌘K to focus the page's search input instead (these pages have native search).
- **Realm sealed (privacy locked):** memory results from Saga/Hoard/Forge are blurred; click-to-reveal per result.

---

## Bonus signature feature: agent voice-style result framing

When the routing detection picks a specific agent (e.g., a trading question → Thor), show a **one-line preamble** in the agent's voice **before** the search results:

> ⚡ *Thor's eye is on this. Memories surfaced:*

This previews the agent's voice before the user commits to escalation. Tiny detail, big personality.

| Agent | Preamble copy |
|---|---|
| Lebot | 👑 *The All-Father considers it.* |
| Thor | ⚡ *Thor's eye is on this.* |
| Perseus | 💰 *Perseus consults the books.* |
| Fenrir | 🐺 *Fenrir sniffs the work.* |
| Sauron | 👁 *The Eye turns west.* |

---

## Out of scope (v1.6+)

- Multi-agent council mode (ask Lebot AND Thor at once, synthesize) — v1.6
- Conversation handoff (Lebot says "let me bring in Perseus" mid-stream) — v1.6
- Voice input via Whisper-Dictate to the Ravens — v1.7
- Saved searches / scheduled monitoring (Sauron's "watch this" feature) — v2
- Result clustering / topic grouping — v2
- **Hugin/Munin split** — if proactive AI insights mature in v1.6, separate the drawer into Hugin tab (forward) + Munin tab (backward). For v1.5 they share one surface.

---

## TL;DR

`⌘K` opens **the Ravens** — slide-from-right 420px drawer. Hybrid memory + file search → top 5 memories + 3 files. Agent override icons. Escalate button spawns the selected agent via `claude --print` with full project context, streams response. Per-agent voice preamble adds personality. **This is the productivity unlock that turns the dashboard from beautiful → useful.** Slice 4 keystone.
