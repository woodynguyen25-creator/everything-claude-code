# Codex — The Ravens v1.5: Oracle Drawer (⌘K) + Realm Content

**Author:** Claude (lead designer)
**For:** Codex (engineer)
**Date:** 2026-05-23 · **Status:** FINAL — decisions locked
**Context:** Woody's Realm dashboard v1 is live at `127.0.0.1:3737`. This brief is the next batch after `PASTE-INTO-CODEX-REFINE-2.md`. Work these in order: REFINE → REFINE-2 → THIS BRIEF.

> Copy everything between the `=====` lines into a fresh Codex session.

=====

## State of the realm (read before anything else)

As of 2026-05-23, Claude made the following fixes that are already in the codebase — **do not redo them:**

1. `app/page.tsx` — `TodaysWyrd` is now imported and rendered between `KpiStrip` and `LatestForging`.
2. `dashboard/data/wyrd.json` — updated to real project state: AIOS (on-track), Lucky Dog (paused), AI Consulting (next).
3. `lib/wyrd.ts` — `readWyrd()` now has try/catch; returns `[]` if file is missing.
4. `lib/mode.ts` — `readProfile()` and `readQuotes()` have try/catch + DEFAULT constants; HeroBand can't crash on missing files.
5. `C:/Users/woody/.claude/settings.json` — 21st-dev Magic MCP added (key in env block). Requires Claude Code reload to activate.
6. Build passes clean: `npx next build` → zero errors as of 2026-05-23.

---

## ITEM 1 — The Ravens oracle drawer (⌘K)

The Ravens is the global command palette. It is already spec'd in the design master lock and partially wired (`/api/ravens` and `/api/ravens/actions` routes exist). This item builds the **client UI** and fully wires it.

### What it does

Press **Ctrl+K** (Windows) from anywhere in the dashboard to open the Ravens overlay.

Three input modes, auto-detected by what the user types:

| Prefix | Mode | What happens |
|---|---|---|
| *(no prefix)* | **Memory search** | Queries memory via `/api/memory?q=…`, returns ranked results from Obsidian + mem0 |
| `>` | **Agent summon** | Quick-summon a council agent — e.g. `> lebot` opens the Lebot James chat thread |
| `$` | **Cost-confirm gate** | Show cost estimate for a forge action before running it — e.g. `$ morning-brief` |

### Overlay layout

Full-screen dark scrim (oklch 5% / 0.85 alpha), centered modal, 600px wide:

```
┌────────────────────────────────────────────────────────┐
│  [raven glyph]  Search memory, summon agent, or $cost  │
│  ─────────────────────────────────────────────────────  │
│  [result 1]   title · source · freshness               │
│  [result 2]   title · source · freshness               │
│  [result 3]   …                                        │
│                                                         │
│  [ESC to close]         [↑↓ navigate · ↵ open]        │
└────────────────────────────────────────────────────────┘
```

- **Input field**: full-width, IBM Plex Mono, placeholder text above.
- **Results list**: max 8 items. Keyboard-navigable (↑↓↵). Each result has a type icon (🪶 memory, 🧬 agent, 💰 cost).
- **Memory results**: clicking opens the Obsidian note in the Memory tab (`/memory`) filtered to that entry.
- **Agent summon results**: clicking navigates to that agent's chat page (e.g. `/lebot-james`).
- **Cost-confirm results**: shows the `estimatedCost` from `lib/forge-actions.ts` for that action, a CONFIRM button, and a CANCEL button. Confirming fires the forge action via the existing `/api/forge/[action]` route with a default empty answers object.
- Close on ESC, on overlay-click, or after navigation.

### Implementation

1. **Hook**: `hooks/useRavens.ts` — manages open/close state, query string, results, active index. Registers `Ctrl+K` globally via `useEffect` + `keydown` listener. Cleans up on unmount.

2. **Component**: `components/Ravens.tsx` — the overlay. Reads state from `useRavens`. Renders scrim + modal. Absolutely positioned, `z-[9999]`.

3. **Search logic** (inside `useRavens`, debounced 200ms):
   - Empty query → show recent memory entries (last 5, from `/api/memory?recent=5`)
   - `>` prefix → filter council agent list (static — Lebot James, Thor, Perseus, Fenrir, Sauron) client-side
   - `$` prefix → filter `FORGE_ACTIONS` from `lib/forge-actions.ts` client-side by slug/label
   - Anything else → call `/api/memory?q=${query}` and render results

4. **Mount**: add `<Ravens />` to the root layout (`app/layout.tsx`) — it needs to be always-mounted so ⌘K works from any route. It renders nothing when closed.

5. **Keyboard shortcut label**: add a small `⌘K` / `Ctrl+K` pill somewhere visible in the HeroBand or sidebar (pick whatever looks cleanest). It should be obviously clickable and open the Ravens overlay on click as well.

### Style notes

- **Scrim**: `fixed inset-0 z-[9998] bg-[oklch(5%_0_0_/_0.85)] backdrop-blur-sm`
- **Modal**: `panel` utility + `border border-rune-gold/20` + subtle top glow (`box-shadow: 0 0 40px oklch(75% 0.12 85 / 0.15)`)
- **Input border-bottom**: `border-b border-rune-gold/40` (not a box border — just an underline)
- **Active result**: `bg-[oklch(18%_0_0)]` + left `border-l-2 border-rune-gold`
- **Entrance animation**: `opacity 0→1` + `translateY(-8px)→0`, 150ms ease-out

### Checkpoint

Open the dashboard. Press Ctrl+K. The overlay opens. Type "wyrd" → memory results appear. Type "> lebot" → Lebot James appears as a result. Press ↵ → navigates to `/lebot-james`. Press ESC → overlay closes. Build passes.

---

## ITEM 2 — YGGDRASIL realm content (3 missing realms)

The YGGDRASIL tab shows 9 realm cards. Three currently route to placeholders with no real content. Wire them.

### Current routing (in `AgenticOsTabs.tsx`)

```
midgard    → '/'           ✅ home page
vanaheim   → '/trading'    ✅ trading page  
helheim    → '/activity'   ✅ activity page
asgard     → '/lebot-james' — but does the route exist?
jotunheim  → '/skills/jotunheim' — 404
muspelheim → '/skills/muspelheim' — 404
niflheim   → '/skills/niflheim' — 404
alfheim    → '/skills/alfheim' — 404
svartalfheim → '/skills/svartalfheim' — 404
```

**Your task:** Fix the 5 broken `/skills/[realm]` routes.

The dynamic route `app/skills/[realm]/page.tsx` reads from `buildRealmMeta()` in `lib/realms.ts` (or similar). Check what that function returns and add entries for: `jotunheim`, `muspelheim`, `niflheim`, `alfheim`, `svartalfheim`.

Each realm page should render a styled content panel (use the existing `RealmPage` component or the pattern already used by working realm pages). Content can be placeholder for now — Norse mythology flavor text + one relevant data section. Map each to something real in Woody's stack:

| Realm | Norse meaning | Map to |
|---|---|---|
| Asgard | Home of gods | System health / Doctor signals |
| Jotunheim | Land of giants | Trading analysis / Market data |
| Muspelheim | Fire realm | Performance metrics / Token burn history |
| Niflheim | Ice / shadow | ParlayBot results / DFS slates |
| Alfheim | Light elves | Skills inventory / ECC status |
| Svartalfheim | Dark elves | Automation scripts / Task Scheduler status |

Asgard already has a route (`/lebot-james`). That's fine — it links to the council lead. Update the YGGDRASIL_REALMS config in `AgenticOsTabs.tsx` to route it there properly.

For the 5 new realms: add entries to `buildRealmMeta()` with a descriptive `title`, `description`, `icon`, and a single data section (can be static flavor text + one live data pull from existing APIs). Do not build a new data pipeline for this — reuse what's already wired.

### Checkpoint

Open the YGGDRASIL tab. Click every realm card's "Enter" link. Zero 404s. Each realm page loads with its title, description, and at least one content section. Build passes.

---

## ITEM 3 — TodaysWyrd edit-in-place

`components/TodaysWyrd.tsx` reads from `dashboard/data/wyrd.json`. Right now it's read-only. Add an inline edit so Woody can update wyrd statuses without touching the JSON manually.

### Behavior

- Each wyrd card gets a small **pencil icon** (top-right corner, rune-gold, visible on hover only).
- Clicking the pencil opens that card in edit mode **inline** — the status badge becomes a `<select>` (options: `on-track`, `paused`, `blocked`, `next`), and the `next` text becomes a `<textarea>` (1-2 lines).
- Two buttons appear: **Save** (rune-gold) and **Cancel** (muted).
- **Save**: `PATCH /api/wyrd/[id]` with `{ status, next }`. On success, the card re-renders with the new data, no page reload.
- **Cancel**: discard changes, return to view mode.

### API route

Create `app/api/wyrd/[id]/route.ts`:

```typescript
import { readWyrd, writeWyrd } from '@/lib/wyrd'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { status, next } = await req.json()
  const wyrds = readWyrd()
  const idx = wyrds.findIndex(w => w.id === params.id)
  if (idx === -1) return Response.json({ error: 'not found' }, { status: 404 })
  wyrds[idx] = { ...wyrds[idx], status, next }
  writeWyrd(wyrds)
  return Response.json(wyrds[idx])
}
```

Add `writeWyrd(wyrds: WyrdEntry[])` to `lib/wyrd.ts` — it writes the array back to `dashboard/data/wyrd.json` with `JSON.stringify(wyrds, null, 2)`.

### Checkpoint

Open the home page. Click the pencil on "Lucky Dog launch". Change status to "on-track". Click Save. The card immediately shows "on-track". Reload the page — the change persists (it was written to `wyrd.json`). Build passes.

---

## Working discipline

One item at a time. `npm run typecheck` + `npm run build` after each item. One commit per item. No `git push`. Keep `127.0.0.1:3737` live (bind is always `127.0.0.1` — never `::` or `0.0.0.0`).

## Report back

Append to `dashboard/docs/codex-to-claude-review-ravens-v1-5-2026-05-23.md`:

- Ravens overlay: what you built, keyboard shortcut location, any search quirks
- YGGDRASIL: which realms now have real content vs. placeholder, and which existing API each pulls from
- TodaysWyrd edit: confirm inline edit + PATCH route work end-to-end
- Anything left + why

Begin with Item 1.

=====

## Notes for Woody (not part of the Codex prompt)

- **Why Ravens comes first:** ⌘K is the highest-leverage UX upgrade — it makes the whole dashboard navigable at speed without clicking. It was marked "ready for Codex" in the design master lock.
- **YGGDRASIL 404s are real bugs:** five realm cards in the YGGDRASIL tab currently 404. These should be fixed before showing the dashboard to anyone. The realm map above is a suggestion — override freely based on what data feels right.
- **TodaysWyrd edit:** this unlocks a tight loop — Woody updates wyrd status directly in the dashboard instead of editing JSON. The three wyrds are his north star projects, so quick edits matter.
- **Order:** Ravens → YGGDRASIL → TodaysWyrd. Ravens is the hardest (new overlay component) so it should come first while context is fresh.
- **21st-dev Magic MCP:** now configured in `~/.claude/settings.json`. After reloading Claude Code, you can call `use_mcp_tool("21st-dev-magic", "generate-component", {...})` for UI scaffolding. Especially useful for the Ravens overlay if you want a head start on the component shape.
