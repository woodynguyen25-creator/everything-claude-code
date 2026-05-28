# Slice 6 — The Five Councils (Agent Chat Surfaces) — v2 (research-aligned)

**From:** Claude (lead designer)
**For:** Codex (engineer)
**Date:** 2026-05-18 (revised 22:40 CDT)
**Time budget:** 180–240 min — this is a real slice, not a polish pass
**Prereq:** Dashboard render is fixed (CSS plugin installed, dev server clean). Verify by visiting `127.0.0.1:3737` — sidebar should be visible at `w-72` and panels styled.

**Reading order before paste:**
1. `dashboard/docs/RESEARCH-AND-RECOMMENDATIONS-2026-05-18.md` — the 30-page research synthesis (treated as design law in this brief)
2. `~/.codex/skills/component-patterns/SKILL.md` + `agent-ui-design/SKILL.md` + `design-trends/SKILL.md` — your own prior research
3. This brief

---

> Copy everything between the `=====` lines below and paste into a fresh Codex session.

=====

## Context — what you're building

The five agent routes (`/lebot-james`, `/thor`, `/perseus`, `/fenrir`, `/sauron`) are currently hero-banner stubs. This slice turns each into a **real chat surface** — what Woody calls a "Council." A user opens an agent's page and has a sustained conversation with that agent's voice and LLM backend, with full streaming, tool call visualization, thread persistence, and context awareness.

This is the biggest user-facing unlock since the dashboard launched. After this slice, the dashboard stops being "look at status" and starts being "talk to the realm."

## Research foundation

You (Codex) shipped three research skills in `~/.codex/skills/` that inform this work:

- `component-patterns` — Three-panel layout, compound components, token tiers, cva variants
- `agent-ui-design` — Chat architecture, message types, streaming rendering, tool execution cards, sandbox UI
- `design-trends` — Motion as meaning, streaming as experience, errors as design cases

**Read those three files before starting** if you haven't recently. They are your source-of-truth for the *generic* patterns. This brief is the *Woody's Realm* specialization of them.

**Additionally:** read `dashboard/docs/RESEARCH-AND-RECOMMENDATIONS-2026-05-18.md` — a 700KB → 30-page synthesis from 4 parallel research agents covering 21st.dev, Awwwards, Dribbble, and production AI dashboards (Cursor, Linear, Anthropic, Manus, Lovable, Bolt, v0, Raycast). The synthesis is treated as **design law** in this brief. Key cross-cutting patterns I'm enforcing:

1. **Three-panel layout** for agent work — already in the spec below
2. **Single-accent discipline** — only ONE agent's accent color lights up per surface at a time
3. **Sub-200ms response budget** — every interaction must respond <200ms
4. **Skeleton screens never spinners** — Apple-shimmer, not loading wheels
5. **Status pills with BOTH color + rune** — `ᚱ` active, `ᛏ` working, `ᛞ` done, `ᛪ` blocked
6. **Real-time log streaming inline** — never buried in a tab
7. **Editable plan card before destructive execution** — the "Counsel Scroll" pattern
8. **Tool-call transparency** — every invocation visible, destructive actions require approval

These are not suggestions — they're locked.

## The curation filter

Not everything in the research applies. As design lead, here's what I'm explicitly accepting vs rejecting from the 21st.dev research, given Woody's Realm aesthetic locks (Theros × Hades painterly Norse, not generic dark SaaS):

### ✅ ACCEPT — patterns that fit Woody's Realm

| Research pattern | How we apply it |
|---|---|
| Three-panel layout (240+flex+320) | Yes — Thread sidebar (PAST SAGAS) / Chat (active council) / Context (MEMORY · VOICE · SAGA tabs) |
| Streaming with blinking cursor | Yes — but cursor is a Norse `▮` block, not a `\|`. Word-by-word reveal, not character |
| Tool execution cards in stream | Yes — but cards use our `panel` utility + agent's accent color border-left, NOT generic gray |
| Progressive disclosure on tool calls | Yes — collapsed by default, expand for params + result |
| User vs Assistant vs Tool vs System role styling | Yes — visual differentiation is mandatory |
| Markdown rendering in assistant messages | Yes — typography plugin is installed now (use `prose prose-invert`) |
| Code blocks with syntax highlighting | Yes — but defer install of `shiki` to next slice. For now use prose default + JetBrains Mono |
| Stop button visible during streaming | Yes — labeled "Hold" not "Stop" (Norse voice) |
| Schema-driven forms with Zod | Yes for the Send Message form (validation: non-empty trim) |
| cva variants for buttons | Yes — install `class-variance-authority`, use for ChatMessage and ToolCallCard variants |
| Server-first, client where needed | Yes — page is server component, chat surface is client |
| Three-tier token system | Already in place via `tokens.css` + Tailwind config. Do NOT add new tokens |

### ❌ REJECT — patterns that fight the brand

| Research pattern | Why we skip it |
|---|---|
| Generic shadcn buttons / cards / inputs | Existing `panel` utility + button styling is already on-brand. Don't import shadcn primitives |
| Pure `#0a0a0a` dark canvas | We use OKLCH painterly palette via `tokens.css`. No raw hex |
| Bento grid layouts | Our asymmetric 62/38 / 2/1/1 is the brand. Don't introduce bento |
| Kinetic typography in hero | Cinzel ≥24px display only. No 80px+ kinetic display type |
| Custom cursor / magnetic buttons | Doesn't fit painterly mythic — feels too SaaS |
| Generic purple-blue gradient backgrounds | Banned. Use OKLCH palette only |
| Avatar circles with photos | Use the existing agent sigil WebPs in `public/art/agents/sigils/` |
| React-Hook-Form for the simple chat input | Overkill — useState + Zod validation on submit is enough |
| `@radix-ui/react-*` primitives | Defer — we don't need them for this slice. Native HTML + ARIA is fine |

### 🤔 DEFER — good ideas, wrong slice

- View Transitions API page transitions between agent routes — defer to Slice 7
- Container queries — defer until we have responsive needs that grid breakpoints can't solve
- Sandbox UI patterns — we don't have sandbox execution yet
- Form-Agent Hybrid (60/40 form+chat split) — defer to a future Skill Configuration slice

---

## The build — Five Councils

### Architecture

```
app/
├── [agent]/                          ← NEW dynamic route consolidating 5 agent pages
│   ├── page.tsx                      ← Server: validates slug, loads persona, renders ChatSurface
│   └── [threadId]/
│       └── page.tsx                  ← Server: validates thread belongs to agent, renders ChatSurface with thread
├── api/
│   └── chat/
│       ├── [agent]/route.ts          ← POST: stream a new message in agent's voice
│       ├── threads/
│       │   ├── route.ts              ← GET (list), POST (create)
│       │   └── [id]/
│       │       ├── route.ts          ← GET (full thread), DELETE, PATCH (rename)
│       │       └── messages/route.ts ← GET (paginate messages)
│       └── stop/route.ts             ← POST: cancel an in-flight stream
components/
├── chat/
│   ├── ChatSurface.tsx               ← Client: three-panel orchestrator
│   ├── ThreadSidebar.tsx             ← Client: PAST SAGAS list + search + New Council
│   ├── ChatStream.tsx                ← Client: message rendering + auto-scroll
│   ├── ChatMessage.tsx               ← Client: role-aware message bubble (cva variants)
│   ├── ToolCallCard.tsx              ← Client: embedded tool card with status state machine
│   ├── StreamingCursor.tsx           ← Client: blinking `▮` rune cursor
│   ├── ChatInput.tsx                 ← Client: textarea + Summon/Hold buttons
│   └── ScryingPool.tsx              ← Client: right panel with MEMORY / VOICE / SAGA tabs
lib/
├── chat.ts                           ← Thread + message persistence (better-sqlite3)
├── chat-stream.ts                    ← SSE streaming helper, agent → LLM dispatch
└── chat-schema.ts                    ← Zod schemas for chat payloads
```

### Route consolidation (important refactor)

**Current:** 5 separate page files at `/lebot-james`, `/thor`, etc.

**New:** Single dynamic route at `app/[agent]/page.tsx` that handles all 5.

**Why:** DRY. The 5 pages are currently 80% identical (hero banner + persona panel). With chat, they'd be 95% identical except for which LLM to call. Consolidate.

**Migration:**
1. Create `app/[agent]/page.tsx` with the new chat surface
2. Server component validates slug against `['lebot-james', 'thor', 'perseus', 'fenrir', 'sauron']`, 404s otherwise
3. **Delete** the old `app/lebot-james/page.tsx`, `app/thor/page.tsx`, `app/perseus/page.tsx`, `app/fenrir/page.tsx`, `app/sauron/page.tsx` files
4. Aristotle is NOT activated yet — leave the persona file but don't add to the valid slug list

The existing links in `lib/agent-status.ts` still point at `/lebot-james` etc. — those will hit the new dynamic route. No link updates needed.

---

## SQLite schema (extension to existing db)

Add to `lib/chat.ts` initialization (runs once on import):

```sql
CREATE TABLE IF NOT EXISTS chat_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_threads_agent ON chat_threads(agent, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_calls_json TEXT,         -- JSON array of ToolCall objects, NULL if not a tool message
  cost_usd REAL DEFAULT 0,      -- estimated cost of this message generation
  llm_provider TEXT,            -- 'claude-cli', 'cerebras', 'groq', etc.
  llm_model TEXT,               -- model id that produced this
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON chat_messages(thread_id, created_at);
```

DB lives in the same SQLite file as everything else. Use the existing connection pattern from `lib/tasks.ts` or `lib/conversations.ts` — DO NOT create a new DB file.

---

## Designer-locked specifications

### Three-panel layout proportions

```
┌─────────┬────────┬─────────────────────────┬─────────────┐
│ Sidebar │ Thread │  Chat (flex)            │ Context     │
│ (w-72)  │ List   │                         │ (320px)     │
│         │ (240px)│                         │ collapsible │
└─────────┴────────┴─────────────────────────┴─────────────┘
```

- Existing app Sidebar (`w-72`, 288px) stays on far left — unchanged
- Thread List (`w-60`, 240px) — NEW, second column
- Chat panel — flex, takes remaining space
- Context panel — `w-80` (320px), collapsible via button, default OPEN on desktop ≥1280px, CLOSED below

On mobile (`<md`):
- Thread list collapses into a drawer triggered by a hamburger
- Context panel collapses into a bottom sheet triggered by a button
- Chat panel goes full-width

### Message bubble specifications

**User message:**
- Right-aligned, `max-w-[70%]`
- Background: `bg-bg-deep`
- Border-left: `border-l-4 border-l-rune-gold`
- Text: `text-text-primary`
- Padding: `px-4 py-3`
- Rounded: `rounded` (small, not pill)
- Timestamp: `text-[10px] text-text-muted mt-2`

**Assistant message:**
- Left-aligned, `max-w-[85%]`
- Background: `bg-bg-panel`
- Border-left: `border-l-4` with agent's accent color (gold/bifrost/emerald/blood/fire)
- Text: `text-text-secondary` for body, `text-text-primary` for emphasis
- Padding: `px-4 py-3`
- Rounded: `rounded`
- Header inside bubble: `[agent emoji] [agent codename]` in `text-rune text-[10px]` rune label style
- Markdown body wrapped in `<div className="prose prose-invert prose-headings:font-display prose-headings:text-text-primary prose-p:text-text-secondary prose-code:font-mono prose-code:text-rune-gold prose-pre:bg-bg-deep max-w-none">`
- Timestamp + LLM provider tag at bottom: `text-[10px] text-text-muted` — "via Cerebras qwen-3-235b · 14:32"

**Tool call card** (embedded in assistant message stream):
- Full width of `max-w-[85%]` container
- `panel` utility class for base
- Border-left: `border-l-4` with agent's accent color
- Header row: `🔧 [tool_name]` in `font-mono text-xs text-rune-gold` + status badge on right
- Status badge variants (use cva):
  - `pending`: gray dot + "Pending"
  - `running`: animated `animate-ember-pulse` blue dot + "Consulting…"
  - `success`: green check + "Done" + duration in italic gray
  - `error`: red x + "Failed" + Retry button
- Body collapsible (`<details>`): "Show parameters" → JSON in JetBrains Mono inside `bg-bg-deep` block
- Result formatted by type (text → markdown, table → grid, code → code block, image → inline)

**System message:**
- Centered, `text-text-muted text-xs italic`
- No bubble, no border — just plain text
- Used for: "Conversation began", "Thor has spoken", "Stream halted by Lord Woody"

### Streaming cursor

- After the last word of streaming text, render `<StreamingCursor />`
- Component is a single span: `<span className="inline-block w-2 h-4 bg-rune-gold animate-ember-pulse align-middle ml-1">▮</span>` (or pure CSS block, no text glyph)
- Disappears the instant the stream ends
- Has its OWN animation, not synced with AmbientEmbers (keep AmbientEmbers as-is)

### Thread sidebar

Header: `<div className="text-rune text-[10px] tracking-[0.3em] text-text-muted">PAST SAGAS</div>`

New thread button (sticky top): `<button>+ New Council</button>` styled with the agent's accent color (gold for Lebot, bifrost for Thor, etc.)

Search input: full-width below header, placeholder `Search past councils…`, debounced 200ms

Thread list items:
- Title (truncate-1, `text-sm text-text-primary`)
- Preview (first line of last message, truncate-1, `text-xs text-text-secondary`)
- Relative timestamp (`text-[10px] text-text-muted`)
- Active thread: `bg-bg-hover` + `border-l-2` with agent's accent
- Hover: show delete + rename icons on the right

Empty state: italic — "No councils yet. Summon the {agent}."

### Context panel

Three tabs at the top: `MEMORY` · `VOICE` · `SAGA`

**MEMORY tab:** Lists 3–5 memories from Mímir's Well that are relevant to the current conversation. Use a simple keyword extraction from the last 3 messages → query `/api/memory?q=...`. Click a memory → opens it in MemoryDrawer (the existing component from Slice 5).

**VOICE tab:** Renders the agent's persona file from `personas/{agent}.md` as markdown using ReactMarkdown. So Lord Woody can see the voice rules anytime.

**SAGA tab:** Two buttons:
- "Pin last response as memory" → hits `/api/ravens/actions` with `kind: 'pin'`
- "Save council to Saga" → appends the full thread to today's Obsidian Daily Note via `lib/memory-actions.ts:saveToSaga`

Toggle button on the panel's outer edge: `›` when open (collapses), `‹` when closed (expands).

### Chat input

- Sticky to bottom of chat panel
- Textarea (autosize, min-h-12, max-h-48) — uses `field-sizing: content` CSS where supported, manual JS-based fallback
- Placeholder uses the agent's voice line from `content/norse-copy.json` under `placeholder.ravensQuery` (mode-aware: dawn/day/dusk/night)
- Enter sends, Shift+Enter inserts newline
- During streaming: Summon button is replaced by Hold button (red blood color)
- Cost estimate inline: `Summon Thor → ~$0.04` (matches the cost shown in Ravens drawer per-agent)
- Cost confirmation modal if estimated cost > $0.50 (reuse the existing pattern from RavensRoot)

### Painterly background (NEW — user request)

Each agent's chat surface uses a **painterly atmospheric background** behind the chat panel, in the MTG Theros × Hades / Jack Roberts style anchor.

**For v1 of this slice:** reuse the agent's existing hero banner (`/art/agents/heroes/{slug}.webp`) as a fixed background, applied to the **chat surface body only** (not the sidebar, not the Scrying Pool).

Implementation:
- Render the agent's hero banner as a `<div>` with `position: fixed; inset: 0` BEHIND all chat panel content
- Apply `opacity-30` and `object-position: center` so it doesn't fight legibility
- Layer a dark vignette gradient over it: `bg-gradient-to-b from-bg-deep/70 via-bg-deep/85 to-bg-deep`
- The HALLS sidebar (left) and Scrying Pool (right) keep solid `bg-bg-panel` — only the center chat column shows the painterly background

This gives each Council a unique *room* feel: Thor's chat is bathed in lightning-storm light, Sauron's in fire-orange Mordor twilight, Fenrir's in forge shadow, etc.

**Defer to Slice 8:** new dedicated chat-surface backgrounds (separate Midjourney renders specifically composed for chat use — wider, less character-dominant). For now the hero banners do the job.

### Per-agent micro-personalization

Each agent gets a slight visual differentiation in their chat panel:

| Agent | Chat panel bg tint | "Thinking…" text |
|---|---|---|
| Lebot James | none (default `bg-bg-panel`) | "👑 The All-Father considers it." |
| Thor | subtle bifrost tint via `bg-[oklch(17%_0.006_250)]` with 1% bifrost layer | "⚡ Thunder gathers…" |
| Perseus | subtle emerald tint | "💰 Perseus weighs the boards…" |
| Fenrir | subtle blood tint | "🐺 Fenrir circles the forge…" |
| Sauron | subtle fire tint | "👁 The Eye turns its gaze…" |

The tint is implemented as an absolute-positioned `radial-gradient` div at low opacity (≤8%), NOT by changing the panel background color directly. This preserves contrast for text.

Pull all these strings from `content/norse-copy.json` under `loading.agentLebot`, `agent.thor.summoning`, etc. — DON'T hardcode.

### Empty state for a new thread (no messages yet)

Centered in chat panel:
- Agent's sigil image (the 48px square from `/art/agents/sigils/{slug}.webp`)
- Cinzel `text-2xl text-{accent}` heading: agent's voice anchor line (e.g., "Thor strikes:" → drop the colon, just "Speak it, my Lord.")
- Italic Inter subtitle: "Begin a council. Lord Woody."

### Norse vocabulary lock for this slice

(Sources: existing `content/norse-copy.json` + Norse expansion from `RESEARCH-AND-RECOMMENDATIONS-2026-05-18.md` Part 9 — Claude approved subset)

- "Council" not "Conversation" (the active chat session)
- "PAST SAGAS" not "Recent Chats" (the left rail header — sagas are the persistent record)
- "New Council" not "New Chat" (the create-thread button)
- "Summon" not "Send" (the submit button)
- "Hold" not "Stop" (the cancel-stream button)
- "Pin as memory" not "Save"
- "Save to Saga" not "Export"
- **"Scrying Pool" not "Context Panel"** (the right rail — per research Part 9; Manus AI's "Manus's Computer" pattern, Norse-translated)
- **"Counsel Scroll"** for the editable plan card that appears before destructive tool execution (per research cross-cutting pattern #8 + Part 9)
- **"Send the Raven"** for the share-this-saga action (research Part 9)
- **"Choices Before the Norns"** for the ActionPanel-style hover menu on saga list items (research item #5)
- "via Cerebras / Groq / Claude" — provider attribution is honest, not hidden

---

## LLM routing

Use the existing `lib/router.js` pattern from `dashboard/scripts/loops/lib/router.js`. Per-agent chain mapping:

```ts
const AGENT_CHAIN = {
  'lebot-james': 'planner',       // Claude CLI opus → sonnet → cerebras
  'thor': 'critic',               // Claude CLI sonnet → cerebras → groq
  'perseus': 'bulkExecutor',      // Cerebras → groq (fast slate math)
  'fenrir': 'critic',             // Claude CLI sonnet → cerebras (taste needs Claude)
  'sauron': 'bulkExecutor',       // Cerebras → groq (fast scanning)
} as const;
```

System prompt for each agent = the body of their `personas/{slug}.md` file (excluding the YAML frontmatter). Cache the parsed personas in module-level memory on first read.

For Claude CLI invocation: subprocess via `child_process.spawn('claude', ['--print', '--model', model, '--system', system])` writing prompt to stdin, reading streamed chunks from stdout.

For HTTP providers (Cerebras, Groq): standard fetch with `stream: true` payload, parse SSE response.

**Tool calls in v1:** No actual tool execution this slice. Render the `<ToolCallCard>` component if the LLM response contains an explicit JSON tool call pattern, but the tool itself doesn't fire. Document this in the review as "tool execution deferred to Slice 7."

---

## Streaming implementation

Server side (Next.js Route Handler):

```ts
// app/api/chat/[agent]/route.ts
export async function POST(req: Request, { params }: { params: { agent: string } }) {
  const body = chatRequestSchema.parse(await req.json());
  // ... lookup thread, persist user message ...

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get system prompt + chain
        const chain = AGENT_CHAIN[params.agent];
        const system = await getPersonaSystemPrompt(params.agent);

        // Call router with streaming
        for await (const chunk of streamFromRouter(chain, { system, prompt: body.text })) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: chunk })}\n\n`));
        }

        // Persist final assistant message
        await persistAssistantMessage(body.threadId, fullText, { provider, model, cost });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: getErrorMessage(err) })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
```

Client side:

```ts
async function summon(text: string) {
  const res = await fetch(`/api/chat/${agent}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ threadId, text }),
    signal: abortControllerRef.current.signal,
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = JSON.parse(line.slice(6));
        if (payload.token) appendToken(payload.token);
        if (payload.done) finalize();
        if (payload.error) showError(payload.error);
      }
    }
  }
}
```

Use AbortController for the Hold button. On Hold:
1. `abortControllerRef.current.abort()`
2. Server-side: detect abort on the reader, log a system message "Stream halted by Lord Woody", persist partial assistant message marked `interrupted: true`

---

## Acceptance criteria

Done when ALL of these pass:

### Functional
- [ ] Visiting `/lebot-james`, `/thor`, `/perseus`, `/fenrir`, `/sauron` shows the chat surface (not the old stubs)
- [ ] Each surface validates the agent slug; invalid slugs (e.g., `/aristotle`) return 404
- [ ] Send a message → see streaming response with blinking `▮` cursor → cursor disappears on completion
- [ ] Hold button cancels the stream mid-flight, persists partial response with system "Stream halted" message
- [ ] Thread persists across page reload — refresh and the conversation is still there
- [ ] New Council button creates a new thread, switches to it
- [ ] Thread sidebar search filters by title and content
- [ ] Active thread visually highlighted with agent's accent color
- [ ] Delete thread from sidebar removes it from DB and switches to most-recent remaining thread (or empty state)
- [ ] Context panel MEMORY tab queries `/api/memory?q=...` based on recent message content and shows results
- [ ] Context panel VOICE tab renders the persona markdown
- [ ] Context panel SAGA tab Pin and Save buttons work
- [ ] Each agent's input placeholder uses their mode-aware voice line from norse-copy.json
- [ ] Each agent's "thinking…" indicator uses their summoning string
- [ ] Cost estimate shown on Summon button matches per-chain estimate
- [ ] Cost confirmation modal appears when estimated cost > $0.50

### Visual / brand
- [ ] No new colors outside the OKLCH palette in `tokens.css`
- [ ] No shadcn-style component imports — only existing `panel` utility + new bespoke pieces
- [ ] Cinzel font used ONLY at ≥24px (display + section headers)
- [ ] Tool call cards use `panel` utility + agent accent border-left
- [ ] User message bubbles use rune-gold border-left (4px)
- [ ] Assistant message bubbles use agent accent border-left (4px)
- [ ] Drifting embers still visible across chat surfaces (AmbientEmbers stays)
- [ ] Hover states feel designed (scale, glow, color shift — not default)
- [ ] Reduced-motion users see no animated cursor, no scroll behavior changes

### Technical
- [ ] `npm run typecheck` clean
- [ ] `npm run build` clean (no warnings, no errors)
- [ ] All five old agent page files deleted, dynamic route absorbed them
- [ ] Stream cancellation actually aborts the underlying LLM call (don't leak processes)
- [ ] No console.log left in production code
- [ ] Zero `any` types
- [ ] SQLite schema migration runs idempotently (safe to re-run)
- [ ] Threads pagination works (load 20 at a time, "Load more")
- [ ] Messages within a thread don't paginate v1 (load all — typical thread is <100 messages)

### Accessibility
- [ ] Send/Hold buttons have `aria-label`
- [ ] Thread list items have `aria-current="true"` when active
- [ ] Tool call cards are `<article>` with `aria-labelledby`
- [ ] Streaming text region has `aria-live="polite"` so screen readers announce updates
- [ ] Context panel tabs follow ARIA tab pattern (`role="tablist"`, `role="tab"`, `aria-selected`)
- [ ] Focus visible on all interactive elements
- [ ] Keyboard: Tab through send → Hold → context tabs → input

---

## Packages to install

```bash
cd "c:\Github Repos\everything-claude-code\dashboard"
npm install class-variance-authority zod
```

(react-markdown + remark-gfm already installed for Mímir's Well. Typography plugin already installed.)

Do **NOT** install:
- @radix-ui/*  — not needed this slice
- @tanstack/react-query — useState + manual fetch is fine here
- shadcn — by design, we don't use it
- framer-motion — defer to a later slice

## Font addition (research recommendation #9)

Add **IBM Plex Mono** as a fourth font for numeric display. TradingView / Stripe / Vercel standard. Non-monospace numbers misread under fatigue.

In `app/layout.tsx`:

```ts
import { IBM_Plex_Mono } from 'next/font/google';

const numericFont = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-numeric',
});
```

Add `${numericFont.variable}` to the body className. In `tailwind.config.ts` extend fontFamily:

```ts
fontFamily: {
  display: ['var(--font-display)', 'serif'],
  body: ['var(--font-body)', 'system-ui', 'sans-serif'],
  mono: ['var(--font-mono)', 'Consolas', 'monospace'],
  numeric: ['var(--font-numeric)', 'var(--font-mono)', 'Consolas', 'monospace'],  // NEW
},
```

**Apply `font-numeric` to:**
- Cost estimate on Summon button (`~$0.04`)
- LLM provider tag at bottom of assistant message (`via Cerebras qwen-3-235b · 14:32`)
- Tool call duration (`0.8s`)
- Thread timestamps in PAST SAGAS

Do NOT apply to body text, agent name labels, or markdown content — those stay Inter / JetBrains Mono per existing rules.

---

## File-by-file build order (do in this order)

Each step compiles and is testable in isolation. Stop and verify at every checkpoint.

### Step 1 — Foundation (30 min)
1. `lib/chat-schema.ts` — Zod schemas for ChatRequest, ChatMessage, ToolCall, Thread
2. `lib/chat.ts` — DB init, thread CRUD, message CRUD
3. `app/api/chat/threads/route.ts` — GET list, POST create
4. `app/api/chat/threads/[id]/route.ts` — GET, DELETE, PATCH
5. `app/api/chat/threads/[id]/messages/route.ts` — GET paginated messages
6. **Checkpoint:** `curl http://127.0.0.1:3737/api/chat/threads` returns `[]`; `curl -X POST ... agent=thor` returns a new thread with id

### Step 2 — Static chat UI shell (45 min)
7. `components/chat/ChatMessage.tsx` — cva variants for user/assistant/system, NO tool variant yet
8. `components/chat/ChatStream.tsx` — renders a static array of messages, no streaming yet
9. `components/chat/ChatInput.tsx` — textarea, Summon button, no streaming wiring
10. `components/chat/ThreadSidebar.tsx` — fetches `/api/chat/threads?agent=...`, renders list
11. `components/chat/ChatSurface.tsx` — three-panel orchestrator (no context panel yet)
12. `app/[agent]/page.tsx` — server component, validates slug, renders ChatSurface
13. **DELETE:** `app/lebot-james/page.tsx`, `app/thor/page.tsx`, `app/perseus/page.tsx`, `app/fenrir/page.tsx`, `app/sauron/page.tsx`
14. **Checkpoint:** Visit `/thor` — see thread sidebar (empty), chat area (empty state), input. Click New Council → thread created in sidebar.

### Step 3 — Streaming (60 min)
15. `lib/chat-stream.ts` — wraps the router, yields tokens
16. `app/api/chat/[agent]/route.ts` — SSE streaming endpoint
17. `components/chat/StreamingCursor.tsx`
18. Wire `ChatStream` + `ChatInput` to fetch the SSE endpoint, append tokens to a streaming-message slot
19. Add Hold button + AbortController
20. **Checkpoint:** Visit `/thor`, type "Hello", click Summon → see streaming response with cursor. Click Hold mid-stream → cursor disappears, system message "Stream halted by Lord Woody" appears.

### Step 4 — Tool calls (30 min)
21. `components/chat/ToolCallCard.tsx` with cva variants for status
22. ChatMessage gets `tool` variant that renders `<ToolCallCard>`
23. Update SSE protocol to support `{ toolCall: {...} }` payloads alongside tokens (no actual execution v1 — just rendering)
24. **Checkpoint:** Manually inject a tool call payload via curl-and-test or test fixture, see card render correctly

### Step 5 — Context panel (45 min)
25. `components/chat/ScryingPool.tsx` with tabbed UI (MEMORY · VOICE · SAGA)
26. MEMORY tab queries `/api/memory?q=...` from last message content
27. VOICE tab renders persona markdown
28. SAGA tab calls existing `/api/ravens/actions`
29. Add collapse toggle button on the panel edge
30. **Checkpoint:** Open agent page, all 3 tabs work, SAGA pin succeeds

### Step 6 — Per-agent personalization (15 min)
31. Add subtle accent-color radial gradient overlay per agent
32. Wire mode-aware placeholders from `content/norse-copy.json`
33. Wire "thinking…" strings per agent

### Step 7 — Polish + verify (15 min)
34. Cost estimate display on Summon button
35. Cost confirmation modal for queries >$0.50
36. Run `npm run typecheck`
37. Run `npm run build`
38. Visit each of the 5 agent routes, send a message, verify streaming + persistence
39. Write the review doc

---

## Hard rules — DO NOT TOUCH

Claude locked these:

- `dashboard/lib/agent-status.ts` — codenames + Lebot persona phrasing
- `dashboard/personas/*.md` — voice locks. READ them for system prompts, don't modify
- `dashboard/content/norse-copy.json` — copy library
- `dashboard/AUTONOMY-PLAN.md`, `WORK-LOG-2026-05-18.md`, all `PASTE-INTO-CODEX-*.md` files
- `dashboard/scripts/loops/*.js` — loop infrastructure
- `~/.claude/skills/*/SKILL.md` — Claude's autonomous-session skills

You may edit (touched by Claude but not locked):
- `dashboard/components/AgentHero.tsx` — has `bannerPosition` prop, keep the signature
- `dashboard/components/Sidebar.tsx` — has aria-label, keep
- `dashboard/components/RavensRoot.tsx` — has aria-label + keyboard hardening, keep both

**Specifically about RavensRoot:** the existing Ravens drawer (⌘K) is a *quick consult* surface that DIFFERS from the new agent chat surfaces:
- Ravens = one-shot question, no thread, focused query
- Council = sustained conversation, threaded, exploratory
Keep both. Ravens drawer is unchanged this slice.

---

## Anti-patterns I'm watching for

If your output drifts toward any of these, stop and rethink:

1. **Generic chat-bubble look** — gray bg, no border-left accent, no agent personality. The whole point is each Council feels like that agent's voice with that agent's accent.
2. **Shadcn-style buttons sneaking in** — pill-shaped, gradient, generic blue. Use the existing button styling pattern from `NextActionCard.tsx` and `DoctorPanel.tsx`.
3. **Loss of asymmetry** — three-panel doesn't mean three EQUAL panels. Sidebar 240px, Chat flex, Scrying Pool 320px. Never 33/33/33.
4. **Plain "Send" button copy** — must be "Summon"
5. **Markdown not actually rendered** — assistant messages must use ReactMarkdown with the typography plugin classes. We just installed the plugin for this purpose.
6. **No cost transparency** — every Summon button must show estimated cost and provider
7. **Stop/Send not visually distinct** — Hold is blood-red and a different shape; can't be confused with Summon
8. **Thread sidebar becoming a generic list** — must use rune-label header ("PAST SAGAS"), Norse empty state, agent-accent active highlight
9. **"Christmas tree dashboard"** — research Part 7b #4. If multiple agent accents are visible on screen simultaneously, you've lost. Within a Council surface, ONLY that agent's accent should light up. Other agents in the sidebar should appear in their normal tone but NOT pulse / glow / animate.
10. **The four-pointed sparkle ✨ as "AI" icon** — research Part 7b #6. Banned. Use rune-glyphs (ᚱ ᛏ ᛞ ᛪ) for status. No sparkles.
11. **Cinzel for body copy** — research Part 7b #7. Cinzel is ritual moments only (page hero ≥24px, agent codename label, section dividers). Chat message body is Inter. Tool call header is JetBrains Mono.
12. **Hover states that just change color** — research Part 7b #11. Add motion or depth (scale-[1.02], glow shift, border accent fade-in) — color alone reads as 2021 SaaS.
13. **Aceternity TracingBeam / 3D Pin / Evervault Card / Smooth Cursor / Sparkles Text** — research Part 7b #12, #13. Banned this slice. Too iconic to other products; instant template-tell.
14. **Default shadcn dark-card grid** — research Part 7b #9. Looks like every v0 clone. We use `panel` utility + per-agent border-left accent.
15. **Spinners** — research Part 7b #10. Skeleton screens always. The shimmer utility is in `globals.css`. Use it.

## Patterns to ADOPT from the research (Part 5 — 21st.dev catalog)

These specific 21st.dev components are pre-approved for this slice. Don't browse 21st.dev randomly — use these.

| Pattern | Source | Use in Slice 6 |
|---|---|---|
| **Border Beam (badtzx0)** | https://21st.dev/community/components/badtzx0/border-beam | ToolCallCard when status=`running` — orbiting beam in agent's accent color (replaces the basic `animate-ember-pulse` dot). Implementation: pure CSS conic gradient + animate. ~30 lines. |
| **Glowing Effect Card (Aceternity)** | https://21st.dev/community/components/aceternity/glowing-effect-card | Active saga in the PAST SAGAS rail gets the mouse-following glow. Per-agent `--glow-color` CSS var. ~40 lines. |
| **AI Thinking Block (preetsuthar17)** | https://21st.dev/community/components/preetsuthar17/ai-thinking-block | The "thinking…" indicator that appears between user message and first streamed token. Shows the agent's `summoning` string from norse-copy.json with a subtle pulse. Replaces a generic spinner. |
| **CommandPalette (dhileepkumargm)** | https://21st.dev/community/components/dhileepkumargm/command-palette | Defer to a later slice — but READ the implementation; the chat input's keyboard handling should mirror its escape/arrow patterns. |

Other 21st.dev components in the research are NOT for this slice — defer.

## G+letter shortcuts to ADD within Council surfaces

Research recommendation #2 (Part 1) and Part 3 cross-cutting. Operator-grade keyboard navigation.

Within any `/[agent]` route, with no input focused:

- `G C` → new Council (creates thread, focuses input)
- `G S` → toggle Scrying Pool
- `G H` → navigate to home (`/`)
- `G A` → navigate to Allthing — i.e., open the global sidebar agent picker. For this slice, just focus the sidebar's first AgentCard.
- `G M` → navigate to `/memory`
- `G V` → focus VOICE tab in Scrying Pool
- `/` → focus chat input
- `Esc` → if input focused, blur; else collapse Scrying Pool; else navigate away
- `K` on a focused saga in PAST SAGAS → opens "Choices Before the Norns" ActionPanel popover with Rename / Delete / Send the Raven / Pin first message

Use a small `useKeyboardSequence(['g', X])` hook (write it; ~30 lines) — 1.5s window between keys, cleared on any other key.

---

## Why this slice matters

After Slice 6 ships:
- Lord Woody can have sustained conversations with each agent in their voice
- Each Council has memory across reloads
- Costs are transparent
- The Norse voice is consistent end-to-end (Summon, Hold, Council, Pin, Saga)
- The dashboard becomes a *place* where conversations live, not just a status display

This is also the foundation for:
- Slice 7: Heimdall's Watch (will surface Council activity timeline)
- Slice 8: Tool execution (agents actually performing actions)
- Slice 9: Council-to-Council referrals (Lebot delegates to Thor mid-thread)

Build it well. Be the engineer who makes lead designer's vision land.

---

## Report-back format

Write `dashboard/docs/codex-to-claude-review-slice-6-2026-05-18.md`:

```
## Slice 6 — Five Councils Review

### Shipped (per acceptance criteria)
- [ ] All functional checks
- [ ] All visual / brand checks
- [ ] All technical checks
- [ ] All accessibility checks

### Files created / modified / deleted
- created: ...
- modified: ...
- deleted: app/lebot-james/page.tsx, app/thor/page.tsx, app/perseus/page.tsx, app/fenrir/page.tsx, app/sauron/page.tsx

### Verification commands run
- npm run typecheck → result
- npm run build → result
- Manual route tests: GET /thor, send message, hold, reload, delete thread

### Deviations from the brief
- [if any]

### Open questions for Claude
- [if any]

### Estimated time spent
- Step 1: Xm
- Step 2: Xm
- ...

### Next slice readiness
- [recommend Slice 7 (Heimdall) or other]
```

Begin.

=====

## Notes for the user (outside the Codex prompt)

This brief is genuinely ambitious — 180–240 min of focused Codex work. If your Codex window is tighter, the natural cut points are:

- **Minimum viable Council:** Steps 1–3 only (foundation + static UI + streaming). Skip tool cards, context panel, personalization, cost UI. ~140 min. Each agent works as a basic streaming chat.
- **Full slice:** Steps 1–7 as written. The Five Councils as I designed them.
- **Stretch into Slice 7:** If Codex finishes early, Heimdall's Watch (`/activity`) is the natural next thing — the brief for that lives in `dashboard/docs/codex-briefs/CODEX-QUEUE-CONSOLIDATED.md` task 6.

If you (the user) want to scope this down before pasting, search the brief for "Step 3" / "Step 5" / etc and tell Codex which steps to skip.

If you want to expand it (e.g., add real tool execution this slice), tell me and I'll write the addition.

When Codex is done, the dashboard at every `/[agent]` route should let you have a real, persistent, streaming conversation with that agent's voice. That's the win.
