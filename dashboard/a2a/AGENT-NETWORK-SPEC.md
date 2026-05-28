# AIOS Council — A2A Agent Network Spec

> Status: **Foundation laid** — AgentCards defined, A2A server wiring is the next implementation milestone.
> Last updated: 2026-05-25

---

## What This Is

The A2A (Agent-to-Agent) protocol (Google, v1.0 April 2026) enables each Council member to become an independently addressable agent that other agents can invoke directly — not through shared memory or a database, but via HTTP + JSON-RPC 2.0.

This transforms the AIOS Council from "5 agents rendered in a sidebar" to "5 agents that actually coordinate across tasks."

---

## Current State vs Target State

| Layer | Current (v1) | Target (A2A) |
|---|---|---|
| Agent discovery | Dashboard sidebar only | AgentCard at `/.well-known/agent-card.json` per agent |
| Coordination | Woody routes manually | Ravens orchestrator dispatches via A2A tasks |
| Debate pattern | Serial (one agent at a time) | Fan-out: all 5 receive same context, return Artifacts |
| Cross-agent handoff | Not supported | Agent A decides → hands off with full context to Agent B |
| Task state | None | submitted → working → completed (streamable) |

---

## Council AgentCard Registry

| Agent | Port (future) | Card file | Primary skills |
|---|---|---|---|
| LeBotJames | 3741 | `agent-cards/lebot-james.json` | orchestration, routing, memory, debate synthesis |
| Thor | 3742 | `agent-cards/thor.json` | trading, options, morning brief, bear-case debate |
| Perseus | 3743 | `agent-cards/perseus.json` | DFS, parlay-bot, finances, Kelly sizing |
| Fenrir | 3744 | `agent-cards/fenrir.json` | frontend, design critique, Lucky Dog, shaders |
| Sauron | 3745 | `agent-cards/sauron.json` | deep research, competitive intelligence, design extraction |

---

## Orchestration Patterns for AIOS

### 1. Sequential Pipeline (current-compatible)
```
Woody → LeBotJames (scope) → Thor (analysis) → Perseus (sizing) → output
```
Each agent receives the prior agent's Artifact as context. No fan-out.

### 2. Fan-Out Council Debate (NOFX Debate Arena pattern)
```
Woody → LeBotJames
  LeBotJames fan-out →
    Thor:    "What's the bull case for PLTR options?"
    Sauron:  "What does recent news say about PLTR?"
    Perseus: "What sizing does Kelly suggest at this edge?"
  LeBotJames ← collect 3 Artifacts → synthesize → deliver
```
Use when the question benefits from multiple independent perspectives.

### 3. Handoff (task transfer)
```
Woody → Sauron (research)
  Sauron: "I have the design data. Handing to Fenrir."
  Fenrir ← receives Sauron's Artifact as starting context
  Fenrir → builds component using extracted design tokens
```
Use when an agent determines the next step belongs in a different lane.

### 4. Hierarchical (Orchestrator + Workers)
Each sub-agent defined as 4-tuple per AORCHESTRA pattern:
```
(INSTRUCTION, CONTEXT, TOOLS, MODEL)

LeBotJames orchestrates:
  Thor worker:    ("analyze PLTR setup", market_data, [trading-brief, tv-mcp], sonnet)
  Sauron worker:  ("scan PLTR news last 72h", web_context, [exa, firecrawl], sonnet)
  Perseus worker: ("size PLTR position", portfolio_data, [kelly-sizer], haiku)
```

---

## A2A Task Lifecycle (Applied to AIOS)

```
submitted  — Woody (or Ravens) dispatches a task to an agent
working    — Agent is processing; streams intermediate updates if long-running
input-req  — Agent needs clarification before proceeding (asks Woody or LeBotJames)
completed  — Agent returns an Artifact (the deliverable)
failed     — Agent reports failure + reason
```

The Ravens drawer (⌘K) becomes the task status UI: shows live state per agent.

---

## Implementation Roadmap

### Phase 1 — Foundation (DONE ✓)
- [x] AgentCard specs defined for all 5 Council members
- [x] AGENT-NETWORK-SPEC.md written
- [x] AgentCard JSON files at `dashboard/a2a/agent-cards/`

### Phase 2 — Static AgentCard Serving
- [ ] Add Next.js API routes: `GET /api/agents/[id]/agent-card.json`
- [ ] Serve each agent's AgentCard from the dashboard
- [ ] Test discovery with a local A2A client

### Phase 3 — Task Dispatch via Ravens
- [ ] Wire Ravens orchestrator to dispatch A2A tasks
- [ ] Implement fan-out for Council debates (all 5 in parallel)
- [ ] Implement handoff pattern (agent-to-agent context passing)
- [ ] Add task lifecycle state to Ravens drawer UI

### Phase 4 — Cross-Model A2A (Stretch)
- [ ] Install AgentDM (MCP ↔ A2A bridge)
- [ ] Test Claude agent invoking GPT/Gemini agent via A2A
- [ ] Evaluate Debate Arena: DeepSeek as Bear, Claude as Analyst

---

## AgentCard Well-Known URI (Next.js implementation target)

```typescript
// app/api/agents/[id]/agent-card.json/route.ts
import { NextResponse } from 'next/server';
import lebot from '@/a2a/agent-cards/lebot-james.json';
import thor from '@/a2a/agent-cards/thor.json';
import perseus from '@/a2a/agent-cards/perseus.json';
import fenrir from '@/a2a/agent-cards/fenrir.json';
import sauron from '@/a2a/agent-cards/sauron.json';

const cards: Record<string, unknown> = { 'lebot-james': lebot, thor, perseus, fenrir, sauron };

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const card = cards[params.id];
  if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(card, {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## Resources

- A2A Protocol spec: `https://a2a-protocol.org/latest/specification/`
- A2A GitHub: `https://github.com/a2aproject/A2A`
- AgentDM (MCP↔A2A bridge): `https://agentdm.ai/`
- NOFX Debate Arena pattern: `C:\Users\woody\Documents\Command Center\youtube\sources\nofx-ai-trading-terminal.md`
- Source video: `https://www.youtube.com/watch?v=-we7iVySwkM`
