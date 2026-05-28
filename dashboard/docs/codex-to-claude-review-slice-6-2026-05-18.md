## Slice 6 — Five Councils Review

### Shipped (per acceptance criteria)

#### Functional
- [x] Visiting `/lebot-james`, `/thor`, `/perseus`, `/fenrir`, `/sauron` now shows the new council chat surface
- [x] Invalid council slugs like `/aristotle` return `404`
- [x] Send a message streams a real SSE response with provider metadata
- [x] Threads persist in SQLite and reload across route refresh
- [x] `New Council` creates a new thread
- [x] Thread sidebar search filters by title and message content
- [x] Active thread is visually highlighted with the agent accent
- [x] Delete thread API exists and UI wiring is in place
- [x] Context panel `MEMORY` tab queries `/api/memory?q=...`
- [x] Context panel `VOICE` tab renders persona markdown
- [x] Context panel `SAGA` tab pin/save buttons are wired to existing Ravens actions
- [x] Each council uses the mode-aware placeholder from `content/norse-copy.json`
- [x] Each agent uses its own “thinking…” line
- [x] Summon button shows a cost estimate
- [x] Cost confirmation modal appears above the threshold
- [ ] Hold/cancel is wired, but I did not get a clean unattended proof that the underlying long-running council stream aborts every provider path reliably

#### Visual / brand
- [x] No new palette outside the existing OKLCH token set
- [x] No shadcn imports
- [x] Cinzel remains ritual/display only
- [x] User bubbles use rune-gold border-left
- [x] Assistant bubbles use the active agent accent
- [x] Ambient embers remain present
- [x] Markdown messages render with `prose prose-invert`
- [x] Code blocks now have a copy affordance
- [x] PAST SAGAS / New Council / Scrying Pool / Summon / Hold vocabulary is in place
- [ ] Tool-call UI exists, but real tool execution is still deferred by design

#### Technical
- [x] `npm run typecheck` clean
- [x] `npm run build` clean
- [x] Five old agent page files deleted and replaced by dynamic `[agent]` routes
- [x] SQLite migration is idempotent
- [x] Thread list pagination is supported (`limit` / `offset`)
- [x] Messages load fully for v1 as intended
- [x] No `console.log` introduced
- [x] Zero `any` types introduced
- [ ] Stream cancellation path needs another live stress pass before I’d call it fully proven

#### Accessibility
- [x] Send/Hold buttons have `aria-label`
- [x] Active threads use `aria-current`
- [x] Tool call cards are `<article>` with `aria-labelledby`
- [x] Chat stream uses `aria-live="polite"`
- [x] Scrying Pool tabs use `role="tablist"` / `role="tab"` / `aria-selected`
- [x] Focus-visible styling already comes from the global design system
- [ ] I did not do a full keyboard-only walk of every tab-stop path after the council refactor

### Files created / modified / deleted

#### Created
- `app/[agent]/page.tsx`
- `app/[agent]/[threadId]/page.tsx`
- `app/api/chat/[agent]/route.ts`
- `app/api/chat/stop/route.ts`
- `app/api/chat/threads/route.ts`
- `app/api/chat/threads/[id]/route.ts`
- `app/api/chat/threads/[id]/messages/route.ts`
- `components/chat/ChatSurface.tsx`
- `components/chat/ThreadSidebar.tsx`
- `components/chat/ChatStream.tsx`
- `components/chat/ChatMessage.tsx`
- `components/chat/ToolCallCard.tsx`
- `components/chat/StreamingCursor.tsx`
- `components/chat/ChatInput.tsx`
- `components/chat/ScryingPool.tsx`
- `components/chat/useKeyboardSequence.ts`
- `lib/chat.ts`
- `lib/chat-schema.ts`
- `lib/chat-stream.ts`
- `lib/council.ts`
- `docs/codex-slice-6-plan.md`

#### Modified
- `app/layout.tsx`
- `tailwind.config.ts`
- `components/AgentCard.tsx`

#### Deleted
- `app/lebot-james/page.tsx`
- `app/thor/page.tsx`
- `app/perseus/page.tsx`
- `app/fenrir/page.tsx`
- `app/sauron/page.tsx`

### Verification commands run
- `npm run typecheck` → pass
- `Remove-Item -Recurse -Force .next; npm run build` → pass
- Manual route tests:
  - `GET /lebot-james` → `200`
  - `GET /thor` → `200`
  - `GET /perseus` → `200`
  - `GET /fenrir` → `200`
  - `GET /sauron` → `200`
  - `GET /aristotle` → `404`
  - `GET /thor/1` → `200`
- API tests:
  - `GET /api/chat/threads?agent=thor` → returned thread data
  - `POST /api/chat/threads` → created a real thread
  - `GET /api/chat/threads/1/messages` → returned persisted user + assistant messages
  - `POST /api/chat/thor` → returned live SSE frames with `thread`, `meta`, `token`, `done`

### Deviations from the brief
- I kept tool execution deferred exactly as requested, but that means the `ToolCallCard` path is structural/UI-only in this slice.
- The “Choices Before the Norns” action popover on focused saga items is not fully realized; rename/delete are implemented inline on hover, but the richer `K` action panel is not yet built.
- I wired `Hold` to both client abort and `/api/chat/stop`, but I do not yet have a strong proof that every long-running provider path halts cleanly under real load.
- I did not implement provider-specific HTTP streaming for every possible fallback chain in production depth; the tested live path in this session was `claude-cli` streaming for Thor.

### Open questions for Claude
- Do you want the next pass to harden council cancellation/abort behavior before Slice 7?
- Is the inline hover action strip in `PAST SAGAS` good enough for v1.5, or do you want the full `Choices Before the Norns` popover immediately?
- Should the next slice be Heimdall’s Watch, or a 6.5 polish/hardening pass over the councils?

### Estimated time spent
- Step 1: ~40m
- Step 2: ~55m
- Step 3: ~45m
- Step 4: ~10m
- Step 5: ~30m
- Step 6: ~15m
- Step 7: ~25m

### Next slice readiness
- Ready for Slice 7 (`/activity` / Heimdall’s Watch)
- If you prefer a hardening pass first, the most valuable target is cancellation + keyboard completeness on the councils
