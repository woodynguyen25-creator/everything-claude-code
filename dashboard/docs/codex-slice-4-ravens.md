# Codex Slice 4 — Ravens

Date: 2026-05-18
Author: Codex
Status: implemented, verified in live dev flow, ready for Claude critique

## What shipped

### Ravens drawer

Implemented the Ravens drawer as a global surface:

- [components/RavensRoot.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/RavensRoot.tsx>)

Behavior:

- opens from `⌘K` / `Ctrl+K`
- closes on `Esc`
- supports forced-agent opening through the global `ravens:open` event
- shows:
  - search input
  - 5 agent override pills
  - memory results
  - file results
  - recent queries
  - primary escalate button
  - secondary Sauron escalation button when the query looks research-heavy

### Backend search + escalation

Added:

- [lib/ravens.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/ravens.ts)
- [app/api/ravens/route.ts](</C:/Github Repos/everything-claude-code/dashboard/app/api/ravens/route.ts)
- [lib/ravens-history.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/ravens-history.ts)
- [lib/conversations.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/conversations.ts)

What it does:

- `GET /api/ravens?q=...`
  - returns:
    - top memory hits
    - top file hits
    - detected agent
    - preamble
    - estimated costs
    - recent query history
    - Claude CLI availability

- `POST /api/ravens`
  - escalates to Claude CLI using the selected persona system prompt
  - streams the response text back
  - persists the final response into:
    - `dashboard/data/conversations/{agent}.db`

### Persona prompt consumption

Updated:

- [lib/personas.ts](</C:/Github Repos/everything-claude-code/dashboard/lib/personas.ts)

Added:

- `readPersonaSystemPrompt(slug)`

This now lets Ravens use the persona file as the system prompt source while still keeping the persona markdown Claude-owned.

### Panel Ask buttons

Added:

- [components/AskAgentButton.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/AskAgentButton.tsx)

Wired into:

- [components/TradingPanel.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/TradingPanel.tsx)
  - `Ask Perseus`
- [components/DoctorPanel.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/DoctorPanel.tsx)
  - `Ask Lebot`
- [components/TasksPanel.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/TasksPanel.tsx)
  - `Ask Lebot`

These buttons open the Ravens drawer pre-populated with:

- forced agent
- panel-specific query context

### Sidebar Ravens trigger

Updated:

- [components/Sidebar.tsx](</C:/Github Repos/everything-claude-code/dashboard/components/Sidebar.tsx)

Behavior:

- small raven trigger button in the sidebar brand block
- opens the Ravens drawer via the same `ravens:open` event used by panel buttons

## Verified

### Typecheck

Ran:

```bash
npm run typecheck
```

Result:

- pass

### Build

Ran:

```bash
npm run build
```

Result:

- pass

### Route/API health

Verified:

```bash
GET /                -> 200
GET /lebot-james     -> 200
GET /fenrir          -> 200
GET /thor            -> 200
GET /perseus         -> 200
GET /sauron          -> 200
GET /skills          -> 200
GET /trading         -> 200
GET /api/doctor      -> 200
GET /api/trading     -> 200
GET /api/tasks       -> 200
GET /api/ravens      -> 200 (dev runtime)
```

### Ravens search verification

Tested:

```bash
GET /api/ravens?q=parlay slate
```

Observed:

- real memory hits from `claude-mem`
- detected agent = `perseus`
- preamble = `💰 Perseus consults the books.`
- recent query history persisted
- `claudeAvailable = true`

### Ravens escalation verification

Tested:

```bash
POST /api/ravens
body: { text: "Say ready in one sentence.", agent: "lebot-james" }
```

Observed:

- streamed Claude response started successfully
- response text returned
- conversation persisted to:
  - `dashboard/data/conversations/lebot-james.db`

## What is still mocked / incomplete

1. **Save to Saga / Pin as memory / Continue conversation buttons**
   - not yet implemented in the drawer response section

2. **Cost confirmation over $0.50**
   - not yet implemented

3. **Arrow-key result navigation**
   - partial keyboard handling exists
   - not fully polished to the exact spec quality yet

4. **Route-local search focus for `/memory` and `/activity`**
   - not implemented

5. **Ravens visual refinement**
   - functionally good
   - may still want Claude taste pass on density / spacing / visual hierarchy

## Important implementation notes

1. The most fragile part was the Claude escalation path on Windows.
   - `claude` itself works
   - shell-based invocation was unreliable
   - switching to direct `claude.exe` resolution + `stdio: ignore/pipe/pipe` made it behave much better

2. `Invoke-WebRequest` was misleading earlier for route verification.
   - direct `curl.exe` and live API tests were more trustworthy

3. Production `next start` background launch on Windows was quirky.
   - build passes cleanly
   - live Ravens verification was done through the dev runtime

## Open questions for Claude

1. Is Slice 4 accepted as the new baseline Ravens implementation?
2. Is the current Ravens drawer dense enough, or should it be visually calmer before we extend it?
3. Should the next slice prioritize:
   - Ravens polish/completion
   - Life-dashboard foundation
   - `/memory` and `/activity` real surfaces
4. Are the per-panel Ask buttons phrased and placed correctly?
5. What are the exact next 3 implementation priorities from here?
