# Codex Queue — Consolidated Backlog

**Last updated:** 2026-05-18
**Source of truth:** This file replaces scattered handoff docs. When a new task is added or completed, update here first.

---

## Active queue (sequenced)

| # | Slice | Task | Spec | Owner | Status | Est |
|---|---|---|---|---|---|---|
| 1 | 5 | Mímir's Well full implementation | `docs/MIMIR-WELL-SPEC.md` | Codex | TODO | 120m |
| 2 | 5 | Yggdrasil hotspots on /skills | `docs/YGGDRASIL-HOTSPOTS-SPEC.md` | Codex | TODO | 45m |
| 3 | 5 | Ravens arrow-key Enter→navigate | inline in HANDOFF doc | Codex | TODO | 20m |
| 4 | 5 | Loading shimmer pass | inline in HANDOFF doc | Codex | TODO | 30m |
| 5 | 5 | 21st.dev integration subset (3 components) | `docs/codex-briefs/21ST-DEV-INTEGRATION.md` | Codex | TODO | 60m |
| 6 | 6 | Heimdall's Watch full implementation | `docs/HEIMDALL-WATCH-SPEC.md` | Codex | TODO | 90m |
| 7 | 6 | Notification bell + history drawer | this doc, below | Codex | TODO | 45m |
| 8 | 6 | Agent chat surfaces (5 routes) | this doc, below | Codex | TODO | 180m |
| 9 | 7 | Hoard panel real implementation | this doc, below | Codex | TODO | 60m |
| 10 | 7 | Forge panel real implementation | this doc, below | Codex | TODO | 60m |
| 11 | 7 | Daily Rites panel (uses ActivityRings) | this doc, below | Codex | TODO | 45m |
| 12 | 7 | Saga panel + Today's Saga surface | this doc, below | Codex | TODO | 60m |

---

## Completed (chronological)

| Slice | Task | Completed |
|---|---|---|
| 1 | Foundation hygiene | 2026-05-17 |
| 2 | Trading signal panel | 2026-05-17 |
| 2.5 | /trading route | 2026-05-17 |
| 3 | Home composition | 2026-05-18 |
| 3.5 | Migration polish | 2026-05-18 |
| 3.6 | Home polish | 2026-05-18 |
| 4 | Ravens drawer | 2026-05-18 |
| 4.5a | Pin/Save/Cost/⌘K context (Claude's half) | 2026-05-18 |

---

## Task definitions (for tasks 6–12 only — first 5 are in dedicated docs)

### Task 7 — Notification bell + history drawer

**Files:**
- `components/NotificationBell.tsx` (new)
- `components/NotificationDrawer.tsx` (new)
- `lib/notifications.ts` (new — reads from `lib/events.ts`)
- `app/api/notifications/route.ts` (new — GET unread, POST mark-read)

**Spec:**
- Bell icon in top-right of the layout (next to or replacing the current floating `🐦` Ravens trigger).
- Badge with count of unread events.
- Click opens a 380px slide-out drawer.
- Drawer shows last 50 events with timestamps + agent badges (color-coded by agent).
- Each event has a "Mark read" affordance and is read-only.
- Read state persists to localStorage AND to a small SQLite table `notification_reads(event_id, read_at)`.
- Empty state: *"No tidings — the ravens have flown without word."* (from `norse-copy.json`)

**Acceptance:**
- Bell renders.
- Click toggles drawer.
- Events render in newest-first order.
- Mark-read removes badge count.
- Drawer survives navigation between routes.

### Task 8 — Agent chat surfaces (5 routes)

**Files (one per agent):**
- `app/lebot-james/chat/page.tsx`
- `app/thor/chat/page.tsx`
- `app/perseus/chat/page.tsx`
- `app/fenrir/chat/page.tsx`
- `app/sauron/chat/page.tsx`
- `components/AgentChatSurface.tsx` (shared component, parameterized by agent)
- `lib/agent-chat.ts` (new — wraps the Ravens escalate API for sustained chat)
- `app/api/agent-chat/[agent]/route.ts` (new — stream endpoint per agent)

**Spec:**
- Each agent's `/chat` subpath surfaces a real chat UI.
- Chat history is in-memory only for now (no persistence — that's v2).
- Messages stream from the agent's mapped LLM (Cerebras for Lebot, Groq for Thor, Gemini for Perseus, Ollama for Fenrir local, Claude for Sauron escalations).
- Each agent uses its persona file (`personas/*.md`) as the system prompt.
- Message bubbles: user right-aligned (rune-gold border-left), agent left-aligned (agent's accent color border-left).
- Header shows agent banner thumbnail + codename + estimated cost-so-far.
- Input bar at bottom with Send (Enter) and Clear (Esc).

**Acceptance:**
- All 5 routes return 200.
- Sending a message streams a reply from the correct LLM.
- Conversation history persists within the session (page refresh = new chat).

### Task 9 — Hoard panel real implementation

**Concept:** The Hoard is Lord Woody's financial standings — net worth, savings rate, investment balance. Cinematic data tile, not a banking dashboard.

**Files:**
- `app/hoard/page.tsx` (new, replaces any stub)
- `components/HoardPanel.tsx` (new — for home page)
- `lib/hoard.ts` (new)
- `data/hoard.json` (new — manually maintained for v1; v2 may ingest from Plaid/bank API)

**Spec:**
- Home panel shows: current net worth + 30-day delta + sparkline.
- Full page shows: net worth over time, breakdown by category (cash/invested/crypto/RE), monthly savings rate.
- Use Activity Rings (from task 5) to show: savings rate ring, investment rate ring, debt ratio ring.
- Empty: *"The hoard is empty. No treasure tallied yet. Add your first rune."*

### Task 10 — Forge panel real implementation

**Concept:** The Forge is craft in progress — projects, skills being learned, repos in flight.

**Files:**
- `app/forge/page.tsx`
- `components/ForgePanel.tsx`
- `lib/forge.ts`
- `data/forge.json` (project list)

**Spec:**
- Home panel: 3 most active projects with progress bars.
- Full page: card grid of all projects with status (in-fire, cooling, cold).
- Each card: name, language tag, last commit (read from git log if path provided), one-line description.
- Empty: *"The forge is cold. No work in the fire. Set something to hammer."*

### Task 11 — Daily Rites panel

**Concept:** Three daily disciplines — Body / Mind / Craft. Tracked with Activity Rings.

**Files:**
- `app/daily-rites/page.tsx`
- `components/DailyRitesPanel.tsx` (home version, compact)
- `lib/rites.ts`
- `data/rites.json` (current day log)

**Spec:**
- Home panel: 3 rings + small "today's check-in" text.
- Full page: 30-day rings calendar (like Apple Watch month view).
- Click any ring to log progress (toggle done / partial / missed).
- Empty: *"No rites yet. Even the gods begin with one small offering."*

### Task 12 — Saga panel + Today's Saga

**Concept:** The day's journal — written reflections, decisions, key moments. Markdown-backed in Obsidian.

**Files:**
- `app/saga/page.tsx`
- `components/SagaPanel.tsx` (home version)
- `lib/saga.ts` (reads/writes Obsidian Daily Notes)
- `data/` — n/a, reads live from `~/Documents/Obsidian Vault/`

**Spec:**
- Home panel: today's saga title + first 2 lines.
- Full page: card list of daily sagas, search + filter by month.
- Click → opens markdown editor (in-page, simple textarea) that writes to Obsidian.
- "Pin to memory" button on each saga → triggers `lib/memory-actions.ts:saveToSaga` reverse flow.
- Empty: *"The saga is unwritten. Nothing recorded today. The chronicle waits for your hand."*

---

## Rules of engagement

1. **Read the spec for the task before touching code.** Specs are in `docs/`.
2. **Each task is shippable independently.** Don't bundle.
3. **Each task ends with a review doc** in `docs/codex-to-claude-review-slice-{N}-{task-name}-{date}.md`.
4. **Don't push to remote** — local commits only. User reviews and pushes manually.
5. **Don't modify Claude-owned files** without flagging:
   - `lib/agent-status.ts`
   - `lib/personas.ts`
   - `personas/*.md`
   - `content/norse-copy.json` (Claude maintains the source-of-truth copy library; Codex may read but not edit)
6. **Use copy from `norse-copy.json`** wherever applicable. Do not invent new Norse phrasing without flagging.

---

## Patterns to follow

- Async server components for data loading
- Suspense + shimmer fallback for slow data
- `panel` utility class for cards
- 62/38 grid splits on home/dashboard surfaces
- Asymmetric layouts (never equal grids)
- Cinzel display ≥24px only
- Read fonts from `app/layout.tsx` (already wired via Next/font)
- Use `Image` from `next/image` for all art assets, with `fill` + `priority` for hero banners
- Color tokens: see `tailwind.config.ts` + `styles/tokens.css`

---

## Open questions for the user

If you're back and have a moment:

1. Should we begin migrating data from `data/*.json` files to a SQLite table for cross-session continuity? (Currently mixed.)
2. Should the agent chat pages save to a `conversations` SQLite table, or stay in-memory until v2?
3. For Hoard data: comfortable manually editing `data/hoard.json` monthly, or want a small admin form?
4. Should the Forge sync with `~/.claude/projects/` to auto-discover projects, or stay manually curated?

None of these block the queue above. Mark TBD answers as you reach them and pick the conservative default in the meantime.
