# Handoff to Codex — 2026-05-18 Evening Window

**Author:** Claude (Opus → Sonnet handoff)
**Window:** 4–5 hours unattended
**Branch:** `main`
**Working dir:** `c:\Github Repos\everything-claude-code\dashboard\`
**Server:** localhost:3737 (Next.js dev)
**Quality bar:** Production-ready. Each item must build clean and pass typecheck before moving to the next.

---

## Context for this session

**Where things stand:**
- Slices 1, 2, 2.5, 3, 3.5, 3.6, 4 all ACCEPTED.
- Slice 4.5 split:
  - Claude's half shipped: `lib/memory-actions.ts`, `app/api/ravens/actions/route.ts`, RavensRoot Pin/Save buttons, cost confirmation modal, ⌘K context-awareness.
  - Your half pending: `/memory` real implementation, arrow-key navigation in Ravens results.
- 5 agents have hero banners wired (lebot-james, thor, perseus, fenrir, sauron). All persona files exist. Aristotle persona file written but deferred — not activated.
- Free LLM stack tested live: Cerebras, Groq, Gemini 2.5 Flash, Ollama local. Claude CLI used for "Ask Lebot James" escalation.
- The Ravens (formerly Hugin) is locked branding. Mímir's Well (`/memory`), Heimdall's Watch (`/activity`).
- Existing specs in `docs/`: `MIMIR-WELL-SPEC.md`, `HEIMDALL-WATCH-SPEC.md`, `YGGDRASIL-HOTSPOTS-SPEC.md`, `RAVENS-DRAWER-SPEC.md`, `LOOP-LIBRARY.md`, `MIDJOURNEY-PROMPT-BANK.md`, `PANEL-CONTRACT.md`.

**Style anchors (hard locks — do not drift):**
- Cinzel display ≥ 24px ONLY. Body is Inter. Code is JetBrains Mono.
- OKLCH palette: see `tailwind.config.ts` and `styles/tokens.css`.
- Asymmetric grids: 62/38 splits, 2/1/1, NEVER equal grids.
- Drifting warm embers are the universal motion signature (`AmbientEmbers` component).
- Subtle dark vignette at canvas edges.
- No gradients on cards — flat `bg-bg-panel` with `border-border-subtle` hairline.
- Norse vocabulary: Wyrd, Hoard, Forge, Daily Rites, Saga, Yggdrasil, Mímir's Well, Heimdall's Watch, Slate of Fates, The Ravens.
- Color tokens to use: `rune-gold` (primary accent), `bifrost` (Thor cyan-blue), `emerald` (Perseus), `blood` (Fenrir, critical states), `fire` (Sauron, ember-tinted), `ember` (atmospheric).

---

## Priority order (do in this sequence — each one must be production-shippable before moving on)

### 🥇 PRIORITY 1: `/memory` page — Mímir's Well (FULL implementation)

**Time budget:** ~120 min
**Spec:** `dashboard/docs/MIMIR-WELL-SPEC.md` (read it cover-to-cover before starting)

**What to build:**

1. **Data layer — `lib/memory.ts` (new file)**
   - Implement the full TypeScript API in the spec:
     - `type Memory = { name, title, description, type, createdAt, updatedAt, pinned, source, bodyPath, preview }`
     - `listMemories(filter)` → reads from `~/.claude/projects/c--Github-Repos-everything-claude-code/memory/`
     - `getMemoryByName(name)` → returns full body
     - `promoteMemory(name)` → toggles inclusion in `MEMORY.md` index
     - `archiveMemory(name)` → moves to `memory/archived/` subfolder
     - `deleteMemory(name)` → hard-delete with confirmation flow handled in UI
     - `findCrossRefs(name)` → parse `[[name]]` links in all memory bodies, return reverse-lookup
   - Frontmatter parsing: use the existing pattern in `lib/personas.ts` (gray-matter style, already in repo).
   - **Path resolution:** Use `os.homedir()` to build the memory directory path. Don't hardcode `C:\Users\woody\`.
   - **Cache:** Module-level cache with 5min freshness. Invalidate on mutation operations.

2. **API routes (new):**
   - `app/api/memory/route.ts` — GET (list with query params: types, sources, q, limit, offset), responds with `Memory[]`
   - `app/api/memory/[name]/route.ts` — GET (full body), PATCH (promote/archive), DELETE
   - `app/api/memory/refs/[name]/route.ts` — GET (cross-references)

3. **Page — `app/memory/page.tsx` (rewrite the stub):**
   - Header band: title `MÍMIR'S WELL` Cinzel 36px+, subtitle italic Inter (use the line from the spec).
   - Stats line: `~N memories indexed · last sync Xm ago`
   - Search input with ⌘K hint at right (when on `/memory`, ⌘K focuses this — already wired in RavensRoot).
   - Type tag chips (project / feedback / reference / user / All), color-coded.
   - Source chips (claude-mem / MEMORY.md / Obsidian).
   - 3-column grid at `lg`, 2 at `md`, 1 at `sm`.
   - Memory cards per spec — see Mímir spec for full anatomy.
   - Load-more pagination at 12 per page.

4. **MemoryCard component — `components/MemoryCard.tsx` (new):**
   - Type tag chip (color-coded)
   - Relative timestamp (use `Intl.RelativeTimeFormat` — no external lib)
   - Title (Cinzel 18px, no larger than 24px since body context)
   - Body preview (text-sm, line-clamp-4, text-text-secondary)
   - Action row: Open, Pin, Archive icons. Hover state: `scale-[1.02]` + rune-gold border glow.

5. **MemoryDrawer component — `components/MemoryDrawer.tsx` (new):**
   - Slide-in from right, 600px wide.
   - Renders markdown body — use `react-markdown` package (already installed? check `package.json`; if not, install with `npm install react-markdown remark-gfm`).
   - Header: title + type tag + timestamps.
   - Footer actions: Edit in VS Code, Promote, Archive, Delete (with confirm), Cross-reference.
   - ESC closes, click-outside closes.

6. **Empty states (use Norse phrasing):**
   - Empty corpus: *"The well is dry. No memories yet. Live, work, and Mímir will fill it."*
   - No search match: *"Mímir does not know that. Try different words."*
   - No filter match: *"None under this watch. Try broader filters."*

7. **Keyboard:**
   - ↑/↓ navigate cards. Enter opens. P pins. Del archives. Esc clears search/filter.

**Acceptance:**
- Route `/memory` returns 200.
- Loads ALL memories from the index folder (currently ~20 .md files).
- Filtering by type works.
- Searching by title works (fuzzy substring is fine for v1).
- Opening a card renders the full markdown body in the drawer.
- Promote toggles a line in `MEMORY.md` (verify by reading file after click).
- Archive moves the file to `archived/` subfolder.
- TypeScript compile clean: `npm run build` or `npx tsc --noEmit`.

---

### 🥈 PRIORITY 2: Yggdrasil hotspots wiring on `/skills` page

**Time budget:** ~45 min
**Spec:** `dashboard/docs/YGGDRASIL-HOTSPOTS-SPEC.md`

**What to build:**

1. **`app/skills/page.tsx` enhancement:**
   - Background: load the Yggdrasil night scene image from `/public/art/scenes/yggdrasil-night.webp` if it exists, else keep the current Yggdrasil fallback list. (Image may already be in the folder — check.)
   - 9 absolute-positioned hotspot circles overlaid on the tree (rune-gold dots with subtle pulsing glow).
   - Each hotspot represents a skill realm (categories from the existing skills index).

2. **Hotspot data:**
   - Hardcode 9 hotspots with `{ x: '23%', y: '45%', label: 'Trading Skills', href: '/skills/trading' }`-style entries.
   - Coordinates: just pick reasonable spots on the tree image. Roughly: 3 in canopy (high), 3 in mid-trunk, 3 in roots.

3. **Hover behavior:**
   - On hover: a small card blooms into existence next to the hotspot. Card has: realm name (Cinzel), 1-line description (Inter italic), realm size (`12 skills`).
   - Use Framer Motion if available, else CSS transitions (`scale-0` → `scale-100` over 200ms).
   - Click hotspot: navigate to `/skills/[realm]` — for now those subpages can be stubs.

4. **Empty fallback:**
   - If image missing: render existing skills list (already works). Hotspot overlay only activates when image is present.

**Acceptance:**
- Skills page still loads when image absent.
- When image present: 9 hotspots visible, each shows tooltip on hover.
- Clicking hotspot navigates without 404.

---

### 🥉 PRIORITY 3: Arrow-key navigation hardening in Ravens

**Time budget:** ~20 min
**File:** `components/RavensRoot.tsx`

**Current state:** Already has ↑/↓ handling, but only highlights — Enter on a memory result doesn't actually do anything useful.

**What to fix:**

1. When Enter is pressed and a memory result is selected:
   - Open the memory drawer (you just built it in P1) by dispatching a `memory:open` event with the memory name, OR
   - Navigate to `/memory?focus={memory.name}` so the page can open the drawer on mount.
   - Pick whichever is cleaner. The latter is more linkable.

2. When Enter is pressed and a file result is selected:
   - Already opens VS Code via `vscode://file/...` — verify it works on the latest selectedIndex flow.

3. Selection ring polish:
   - Currently uses `border-rune-gold` on selected. Bump to `border-rune-gold ring-1 ring-rune-gold/40` for a clearer ring.

**Acceptance:**
- Open Ravens, type query, ↑/↓ moves selection ring.
- Enter on memory → navigates to `/memory?focus=...` and the drawer opens.
- Enter on file → opens in VS Code.

---

### 🏅 PRIORITY 4: Loading state shimmer pass

**Time budget:** ~30 min
**Files:** all panel components

**What to add:**

1. **Add a shimmer utility class to `app/globals.css`:**
   ```css
   .shimmer {
     position: relative;
     overflow: hidden;
   }
   .shimmer::after {
     content: '';
     position: absolute;
     inset: 0;
     background: linear-gradient(
       90deg,
       transparent,
       oklch(95% 0.02 80 / 0.04),
       transparent
     );
     animation: shimmer-slide 2.4s ease-in-out infinite;
   }
   @keyframes shimmer-slide {
     0% { transform: translateX(-100%); }
     100% { transform: translateX(100%); }
   }
   @media (prefers-reduced-motion: reduce) {
     .shimmer::after { animation: none; }
   }
   ```

2. **Apply to:** any `<Suspense>` skeleton in panels (TradingPanel, DoctorPanel, TasksPanel). If those panels don't use Suspense yet, wrap their async children and add a skeleton fallback.

3. **Skeleton patterns:**
   - `<div className="h-4 w-3/4 bg-bg-deep rounded shimmer" />`
   - `<div className="h-3 w-1/2 bg-bg-deep rounded shimmer" />`
   - Card-height: `<div className="h-32 bg-bg-deep rounded shimmer" />`

**Acceptance:**
- Pages still render correctly with no shimmer when data loaded.
- During Suspense fallback (simulate with a slow DB query), you see the shimmer slide.

---

### 🎖 PRIORITY 5: 21st.dev component subset integration

**Time budget:** ~60 min (only if priorities 1–4 done with time left)
**Reference:** Will be at `dashboard/docs/codex-briefs/21ST-DEV-INTEGRATION.md` (Claude is writing this in parallel)

**Install deps first:**
```bash
npm install class-variance-authority framer-motion
```

**Build (cherry-picked, NOT the whole 21st.dev kit):**

1. **BorderBeam component** — `components/ui/BorderBeam.tsx`:
   - Reusable animated border beam. Props: `duration` (default 6s), `color` (default `rune-gold`), `size` (default 250).
   - Reference implementation: dillionverma's magicui pattern (search npm/github for `magicui border-beam`).
   - Use SVG with a sliding rectangle clip + gradient. Compositor-friendly (transform only).
   - Apply to the **active Council card** in the sidebar (whichever agent matches the current route).

2. **TracingBeam component** — `components/ui/TracingBeam.tsx`:
   - Vertical scroll-tracked beam on the home page left edge.
   - Use IntersectionObserver to track scroll progress through the home page sections.
   - Beam draws downward as user scrolls.
   - Apply to `app/page.tsx` — wrap the existing staggered sections.

3. **Activity Rings component** — `components/ui/ActivityRings.tsx`:
   - 3 concentric SVG rings, Apple-Watch-style.
   - Props: `rings: { color, value, max }[]`.
   - Use CSS variables for color (so we can theme via existing tokens).
   - Drop into the Daily Rites placeholder panel (or stub a Daily Rites panel if it doesn't exist yet).

**Acceptance:**
- All 3 components type-check.
- BorderBeam visible on active sidebar Council card (one card at a time).
- TracingBeam visible on home page, animates with scroll.
- Activity Rings rendered somewhere (Daily Rites stub is fine).
- No bundle size catastrophe (compare bundle size before/after — should be under +50KB gzipped).

---

### Stretch (only if time remains): notification bell + history drawer

**Time budget:** ~45 min

1. Bell icon in top-right of layout (next to or replacing the floating Ravens button).
2. Click → opens a drawer (similar style to MemoryDrawer) showing the last 50 events from `lib/events.ts` if that exists.
3. Mark-as-read state stored in localStorage.

---

## Per-task workflow Codex should follow

For each priority:

1. **Read the relevant spec** in `docs/` before touching code.
2. **Plan** — write a 3-bullet summary of what you'll touch and in what order to a scratch file.
3. **Implement** — small commits, clean diffs. Use existing patterns from neighboring files.
4. **Verify** — run `npx tsc --noEmit` after each major file. Run `npm run build` before declaring the priority done.
5. **Test in browser** — navigate to the affected route on localhost:3737, exercise the feature.
6. **Commit** — `git add -A && git commit -m "feat(slice-5): <priority name> — <one-sentence outcome>"` (use conventional commits, no Co-Authored-By per global config).
7. **Update Claude with a review doc** at `docs/codex-to-claude-review-slice-5-{priority}-2026-05-18.md` — what shipped, what skipped, any open questions.

---

## Hard rules (do NOT violate)

- **Do not change branding.** "The Ravens" not "Hugin." "Mímir's Well" not "Memory Browser."
- **Do not introduce new accent colors** outside the existing palette.
- **Do not install heavy deps** beyond what's listed (react-markdown, remark-gfm, class-variance-authority, framer-motion). If you find you need something else, write it to the review doc and stop instead of installing.
- **Do not touch `app/layout.tsx`** except to wire the bell drawer if you reach the stretch goal.
- **Do not modify `lib/agent-status.ts`** — Claude already owns that file's evolution.
- **Do not edit `lib/personas.ts`** — locked.
- **Do not edit any `personas/*.md`** files. They are voice locks.
- **Do not delete files** — if something looks redundant, write it to the review doc.
- **Do not run `git push`** — local commits only. User will review and push manually.
- **Do not delete the `BASELINE-2026-05-18.txt`** in the dashboard root — it's the revert reference.

---

## What to do if blocked

- **Type errors you can't resolve in <5 min:** mark the file `// @ts-expect-error TODO(claude-review)` with a comment explaining what's stuck and move on.
- **A spec is ambiguous:** make the most conservative interpretation, note it in the review doc.
- **A library is missing and you're unsure if installing it is allowed:** check the "Hard rules" above. If it's not on the allowed list, stop and document.
- **A test or build fails after a change:** revert that file with `git checkout -- <file>` and move on.

---

## Final review handoff format

Write a single doc at `docs/codex-to-claude-review-slice-5-2026-05-18-evening.md` with:

```
## Slice 5 — Evening Window Review

### ✅ Shipped
- P1 Mímir's Well: <links to commits>
- P2 Yggdrasil hotspots: ...

### ⚠️ Skipped or partial
- ...

### ❓ Open questions
- ...

### 🧪 How to verify
- /memory → expect: ...
- /skills → expect: ...
```

User will read it when they're back. Be specific and brief.

---

## Reminder of the project north stars

1. This is Lord Woody's personal AIOS — not a SaaS, not a product. Decisions favor *delight + character* over *scale*.
2. Cinematic painterly 2D (Theros × Hades) is the aesthetic anchor. If something feels too "shadcn default" or "Tailwind admin template," it's wrong.
3. The Norse skin is **the product**, not decoration. Every empty state, error state, and microcopy line earns its keep with mythology.
4. Free tier is the budget. Don't add anything that requires a paid service unless explicitly approved.

Now build. Good fortune, Codex.
