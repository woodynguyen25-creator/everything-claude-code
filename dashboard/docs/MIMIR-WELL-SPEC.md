# Mímir's Well (`/memory`) — Page Spec

**Status:** v1.5 deliverable. Currently a stub. Codex implements when reaching this slice.
**Date:** 2026-05-18
**Author:** Claude (design lead)

---

## What it is

Mímir's Well is the **memory browser** — the corpus of cross-session memories Lord Woody and his agents have accumulated. It is named after **Mímir**, the wisest being in Norse mythology, keeper of the well of wisdom that Odin gave an eye to drink from. The well holds what mortals forget.

This page browses the **claude-mem** corpus (vector-indexed memories from past Claude Code sessions) AND the **Obsidian Vault memory files** (the structured persistent memory at `~/.claude/projects/c--Github-Repos-everything-claude-code/memory/`).

Where the Oracle Drawer (`The Ravens`, ⌘K) is for **fast lookup** during work ("what did I decide about X?"), Mímir's Well is for **deep browsing** — reading, organizing, curating, archiving.

---

## Page composition

```
┌────────────────────────────────────────────────────────────────────┐
│ MÍMIR'S WELL                                                       │
│ ─────────────                                                      │
│ "What the wise know, others have forgotten. Drink and recall."     │
├────────────────────────────────────────────────────────────────────┤
│ [Search the well...]                          [⌘K shortcut hint]   │
│ [Tags: project · feedback · reference · user] [All]                │
│ [Source: claude-mem · MEMORY.md · Obsidian]                        │
├────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│ │ MEMORY CARD 1    │  │ MEMORY CARD 2    │  │ MEMORY CARD 3    │  │
│ │ [tag] · 2d ago   │  │ [tag] · 5d ago   │  │ [tag] · 1w ago   │  │
│ │                  │  │                  │  │                  │  │
│ │ Title text       │  │ Title text       │  │ Title text       │  │
│ │ Preview body...  │  │ Preview body...  │  │ Preview body...  │  │
│ │                  │  │                  │  │                  │  │
│ │ [open] [pin] [×] │  │ [open] [pin] [×] │  │ [open] [pin] [×] │  │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│ │ MEMORY CARD 4    │  │ ...              │  │ ...              │  │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                    │
│ [Load more (12)]                                                   │
└────────────────────────────────────────────────────────────────────┘
```

---

## Composition details

### Header band
- Page title: `MÍMIR'S WELL` in Cinzel ≥36px, rune-gold tint
- Subtitle: italic Inter: *"What the wise know, others have forgotten. Drink and recall."*
- Below subtitle: small stat line showing corpus size: `~847 memories indexed · last sync 23m ago`

### Search + filters
- Full-width search input with ⌘K hint at right (placeholder: `Search the well...`)
- Search is **hybrid** — fuzzy first across titles + tags, then semantic across full body content (claude-mem vector search)
- Type tag chips below search:
  - `project` (rune-gold)
  - `feedback` (bifrost blue)
  - `reference` (ember orange)
  - `user` (emerald)
  - `All` (default)
- Source chips below type:
  - `claude-mem` (vector-indexed cross-session memories)
  - `MEMORY.md` (the curated index)
  - `Obsidian` (the broader vault — read-only)
- Default state: all sources, all types, no search query → shows recent memories newest first

### Memory cards (grid)
- 3-column grid at `lg`, 2-column at `md`, 1-column at `sm`
- Each card:
  - **Type tag** in top-left (color-coded by type — see above)
  - **Relative timestamp** in top-right (`2d ago`, `5d ago`)
  - **Title** — first line, Cinzel, prominent (≥18px, but no larger than ≥24px since this is body, not hero)
  - **Body preview** — first ~120 chars of memory body, Inter `text-sm`, line-clamped to 4 lines, `text-text-secondary`
  - **Action row** at bottom (small icons):
    - `Open` — opens full memory in a modal/slide-over
    - `Pin` — toggles whether this memory shows in `MEMORY.md` index
    - `×` (Archive) — removes from active rotation (moves to archived/, NOT deleted)
- **Hover state:** card lifts slightly (`scale-[1.02]`), rune-gold border glow
- **Click anywhere on card** (except action icons) → opens full memory view

### Full memory view (modal / slide-over)
- Triggered by `Open` or card click
- Slides in from the right (~600px wide drawer) OR opens as a centered modal — Codex's call
- Renders the memory's full markdown content (use a markdown renderer like `react-markdown`)
- Header: title + type tag + timestamps (created / updated / last accessed)
- Footer actions:
  - `Edit in VS Code` — opens the source markdown file in VS Code via `vscode://file/...` protocol
  - `Promote to MEMORY.md` — adds this memory to the curated index (or removes if already present)
  - `Archive` — moves to archived state
  - `Delete` — hard-delete (requires confirmation dialog)
  - `Cross-reference` — finds and lists other memories that link to this one (via `[[memory-name]]` syntax)

### Empty states
- **Empty corpus:** *"The well is dry. No memories yet. Live, work, and Mímir will fill it."*
- **No search matches:** *"Mímir does not know that. Try different words."*
- **No memories under filter:** *"None under this watch. Try broader filters."*

---

## Data sources

### Source 1: claude-mem MCP
Read via the existing `mcp__plugin_claude-mem_mcp-search` toolset. Specifically:
- `mcp__plugin_claude-mem_mcp-search__memory_search` — keyword + semantic search
- `mcp__plugin_claude-mem_mcp-search__memory_context` — fetch full memory bodies
- `mcp__plugin_claude-mem_mcp-search__list_corpora` — list available corpora

### Source 2: `MEMORY.md` index
File: `~/.claude/projects/c--Github-Repos-everything-claude-code/memory/MEMORY.md`
- This is the curated, hand-maintained index of important memories
- One line per entry: `- [Title](file.md) — one-line hook`
- Parse each line, resolve the `file.md` link to the actual memory file, render preview

### Source 3: Memory directory
Directory: `~/.claude/projects/c--Github-Repos-everything-claude-code/memory/*.md`
- All structured memory files with frontmatter (`name`, `description`, `metadata.type`)
- Read each one's frontmatter for type / tags / timestamps
- Read body for preview + full-view rendering

---

## Architecture

```ts
// lib/memory.ts (new)

export type Memory = {
  name: string;              // slug from frontmatter
  title: string;             // from first H1 in body
  description: string;       // from frontmatter
  type: 'user' | 'feedback' | 'project' | 'reference' | 'unknown';
  createdAt: string;
  updatedAt: string;
  pinned: boolean;           // whether it appears in MEMORY.md
  source: 'claude-mem' | 'memory-md' | 'obsidian';
  bodyPath: string;          // absolute file path
  preview: string;           // first ~120 chars of body, plaintext
};

export async function listMemories(filter?: {
  types?: Memory['type'][];
  sources?: Memory['source'][];
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Memory[]>;

export async function getMemoryByName(name: string): Promise<Memory & { body: string }>;
export async function promoteMemory(name: string): Promise<void>;  // add to MEMORY.md
export async function archiveMemory(name: string): Promise<void>;  // move to archived/
export async function deleteMemory(name: string): Promise<void>;
export async function findCrossRefs(name: string): Promise<Memory[]>;  // parse [[name]] links
```

---

## Performance

- **Cache the corpus index** at 5min freshness (memories change slowly).
- **Lazy-load full memory bodies** — only when the user opens a card.
- **Pagination:** 12 cards per page, load 12 more on `[Load more]` click.
- **Semantic search** goes through claude-mem MCP — could take 200-500ms. Show shimmer skeleton on cards during search.

---

## Interactivity

- ⌘K when on this page focuses the search bar (when on home, ⌘K opens the Oracle Drawer instead)
- Esc clears search + filters
- ↑/↓ arrow keys navigate between cards in the grid
- Enter opens the focused card
- `P` on a focused card pins/unpins it
- `Del` on a focused card archives it (with confirmation)

---

## Visual rules

- Apply universal Slice 3 visual rules:
  - Cinzel ≥24px for titles + page hero ONLY (memory body is Inter)
  - No gradients on cards (flat `bg-bg-panel` with hairline border)
  - Hover glow uses `rune-gold` accent
  - Markdown rendering uses Inter for body, JetBrains Mono for inline `code`, Cinzel for any `# H1` in the rendered body
  - Drifting warm embers ARE applied to this page (atmospheric, less intense than `/skills` Yggdrasil)
  - Subtle dark vignette at canvas edges (universal)

---

## Edge cases

- **Memory file with malformed frontmatter:** skip silently, log warning in dev console
- **Memory file references via `[[name]]` that doesn't exist:** render the link as italic + flag with small `⚠` icon, no broken state
- **claude-mem MCP unavailable:** fall back to file-system-only mode, gray out the `claude-mem` source filter chip
- **Memory body too long for preview:** truncate at character boundary, append `…`

---

## Out of scope (v2)

- AI-suggested memory curation ("you wrote this 3 months ago, want to promote to MEMORY.md?") — v2
- Cross-memory clustering / topic graphs — v2 (this is more of a Yggdrasil cognitive-theater feature)
- Memory import from external sources (Notion, Roam, etc.) — v2
- Conversation-to-memory promotion — v1.6 with agent pages

---

## TL;DR

`/memory` = Mímir's Well. Browse + search + curate + archive the claude-mem corpus + MEMORY.md index. Card-grid layout, modal full view, hybrid search. Reads from new `lib/memory.ts`. Targets Slice 5 (post-Ravens).
