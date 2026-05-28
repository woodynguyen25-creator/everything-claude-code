# Heimdall's Watch (`/activity`) — Page Spec

**Status:** v1.5 deliverable. Currently a stub. Codex implements when reaching this slice.
**Date:** 2026-05-18
**Author:** Claude (design lead)

---

## What it is

Heimdall's Watch is the **full archive of every event that has touched Lord Woody's realm**. Where the home `ActivityStream` shows the last 12 events as a glanceable feed, `/activity` is the deep history — searchable, filterable, dense. The page is named after **Heimdall**, the Norse god who stands at Bifröst and sees all nine realms.

It is the operator's **forensic surface** — where Lord Woody comes when he asks "when did Doctor flag that issue?" / "what trade did I close last Friday?" / "what was my last Saga entry?"

---

## Page composition

```
┌────────────────────────────────────────────────────────────────────┐
│ HEIMDALL'S WATCH                                                   │
│ ───────────────                                                    │
│ "The Watcher Between Worlds. He sees all that crosses the Bifröst."│
├────────────────────────────────────────────────────────────────────┤
│ [Search box]                                  [Filter chips below] │
│ [Doctor] [Trading] [Tasks] [Saga] [Forge] [Hoard] [All]            │
│ [Today] [7 days] [30 days] [All time]                              │
├────────────────────────────────────────────────────────────────────┤
│ ACTIVITY LOG (dense terminal stream)                               │
│                                                                    │
│ [2026-05-18 21:47] DOCTOR   NPX cache "context7" healed            │
│ [2026-05-18 21:42] TRADING  Morning brief refreshed                │
│ [2026-05-18 21:38] TASKS    created "review slate"                 │
│ [2026-05-18 21:31] DOCTOR   MCP duplicate count: 3                 │
│ [2026-05-18 21:28] FORGE    Apple Health synced (weekly)           │
│ [2026-05-18 21:14] SYSTEM   dashboard started                      │
│ [2026-05-18 20:55] SAGA     daily entry saved (Whisper-Dictate)    │
│ [2026-05-18 17:42] TRADING  position TSLA closed +3.2%             │
│ [2026-05-18 16:30] PERSEUS  slate locked: 3 legs, EV +9%           │
│ ...                                                                │
│                                                                    │
│ [Load more (50)]                                                   │
└────────────────────────────────────────────────────────────────────┘
```

---

## Composition details

### Header band
- Page title: `HEIMDALL'S WATCH` in Cinzel ≥36px, rune-gold tint
- Subtitle: italic Inter, single line of Norse-mythic flavor: *"The Watcher Between Worlds. He sees all that crosses the Bifröst."*
- Below the subtitle: a small **status indicator** showing live event count today (`47 events today · last 30s ago`)

### Search bar
- Full-width input, prominent placeholder: `Search the watch...`
- Live fuzzy search across event headlines
- Submit on enter triggers semantic search (extended pattern — feeds claude-mem if installed)
- ⌘K hotkey also focuses this input (when on this page; off the page ⌘K opens the Oracle Drawer instead)

### Filter chips
**Two rows of chips immediately below the search bar:**

**Domain chips** (multi-select toggle):
- `Doctor` (rune-gold accent)
- `Trading` (bifrost blue)
- `Tasks` (ember orange)
- `Saga` (deep violet)
- `Forge` (blood red)
- `Hoard` (royal gold)
- `Agents` (mixed — captures conversations with Lebot/Thor/Perseus/Fenrir/Sauron)
- `All` (default state)

**Time range chips** (single-select):
- `Today`
- `7 days`
- `30 days`
- `All time`
- Default: `Today`

### The log
- **Dense terminal-style**, JetBrains Mono, tight leading-tight
- 50 events per page (paginated with `[Load more (50)]` button at bottom)
- Each row: `[YYYY-MM-DD HH:MM] DOMAIN  headline`
- Newest first
- Timestamp in `text-text-muted`
- Domain badge in the accent color matching that domain (uppercase, tracked)
- Headline in `text-text-secondary`
- **Hover state**: row lights up to `bg-bg-hover`, cursor pointer
- **Click state**: expands the row inline to show:
  - Full timestamp (ISO + relative)
  - Full event detail (any structured payload — e.g. Doctor's full savepoint, Tasks' full title + priority change, Trading's slate JSON)
  - "Open in [domain]" link → navigates to the domain page focused on that event
  - "Copy event ID" button (for piping into Sauron or other tools)
- Collapse on second click

### Empty states
- **No filters, no events:** *"The realm sleeps. Heimdall's watch is quiet."*
- **Filters active, no matches:** *"No events under this watch. Adjust the filter — or rest, Realm Lord."*

---

## Data sources

All events stream from `lib/events.ts` (already exists per Slice 3). To support the full archive view, `lib/events.ts` needs extension:

```ts
export async function getAllEvents(filter?: {
  domains?: string[];
  startIso?: string;
  endIso?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Event[]>;
```

Sources to aggregate:
- **Doctor** — `lib/doctor.ts` reads `~/.claude/logs/aios-doctor/last-run.json` AND `~/.claude/logs/aios-doctor/savepoints/*.json` (the historical archive)
- **Trading** — `lib/adapters/trading.ts` reads ParlayBot SQLite + Morning Brief files
- **Tasks** — `lib/tasks.ts` reads `data/tasks.db` with full update history (now that `updatedAt` column exists per Slice 3)
- **Saga** — read Obsidian Daily Notes (markdown files in `Obsidian Vault/Daily Notes/`)
- **Forge** — read `data/health-imports/*` (Apple Health exports — v2)
- **Hoard** — placeholder for v2 (Plaid + Gusto)
- **Agents** — read `data/conversations/*.db` (per-agent SQLite — v1.5 onwards)

For each event, normalize to:
```ts
type Event = {
  timestamp: string;  // ISO
  domain: 'doctor' | 'trading' | 'tasks' | 'saga' | 'forge' | 'hoard' | 'agents' | 'system';
  headline: string;
  detail?: Record<string, unknown>;  // structured payload
  href?: string;  // optional "Open in [domain]" link
};
```

---

## Performance considerations

- **Pagination is critical** — could be tens of thousands of events over time. Lazy-load 50 at a time.
- **Filter logic happens server-side** in the page component (`force-dynamic`). Don't ship the full archive to the client and filter there.
- **Search is fuzzy-on-server** for v1.5. Semantic search via claude-mem is a v1.6 extension.
- **Cache the aggregator** at 60s freshness — same auto-refresh cadence as the home page.

---

## Interactivity

- ⌘K focuses search (when on this page)
- Esc clears search + filters
- ↑/↓ arrow keys navigate between expanded rows when one is open
- Enter on a row expands/collapses it
- Click anywhere outside an expanded row collapses it

---

## Visual rules

- Apply the universal Slice 3 visual rules:
  - Cinzel ≥24px ONLY
  - No gradients on the page (terminal aesthetic — flat surfaces only)
  - Hairline borders, deep warm-black background (`oklch(14% 0.005 250)`)
  - JetBrains Mono for all timestamps + structured detail payloads
  - Inter for the page title's subtitle + filter chip labels
  - Drifting warm embers are NOT applied to this page (the terminal density is the aesthetic — embers would compete)
  - Subtle dark vignette at canvas edges (universal — keep)

---

## Edge cases

- **Reduced motion:** no shimmer skeletons on load, just a one-frame fade-in.
- **Empty Obsidian path:** Saga events silently absent — don't 500 the page.
- **Corrupt task DB:** Tasks events show "[corrupt — check `data/tasks.db`]" as a single warning entry, not a crash.
- **Privacy:** if Realm is sealed (`⌘L` locked state), Saga + Hoard + Forge events are blurred until panel unlocked.

---

## Out of scope (v2)

- Cross-event correlation graphs ("trades that happened on days you skipped gym") — v2 cognitive theater
- Audio playback of Saga voice journal entries — v2
- Export filtered events as markdown — v2
- Real-time live streaming via SSE/WebSocket — v2 (currently 60s polling is enough)

---

## TL;DR

`/activity` = Heimdall's archive. Searchable + filterable + expandable dense log. Dense terminal aesthetic. 50/page. Reads from extended `lib/events.ts`. Targets Slice 5 (post-Ravens).
