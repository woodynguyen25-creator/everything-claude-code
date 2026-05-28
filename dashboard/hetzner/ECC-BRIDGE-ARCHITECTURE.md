# ECC ↔ Hermes Bridge — Architecture & Build Plan
> Synthesized from 7 Hermes YouTube videos (Alex Finn, Jack Roberts ×2, NetworkChuck, Keith AI, Nate Herk, David Ondrej) + existing AIOS deployment + Woody's specific ask: "chat to my ECC with all skills while AFK."

---

## Critical realization from the videos

David Ondrej's Level 7 inverts the design we'd planned:

> "We'll turn Hermes Agent into a full backend. We'll expose it as an MCP server so that your Claude Code, your Pi Agent, your Codex can interact with Hermes Agent, build on top of it, delegate tasks to it as if it was a full MCP backend."

This means a **dual-direction bridge** is the correct architecture, not a one-way one.

```
                       ┌────────────────────────────┐
                       │  Phone / Telegram          │
                       │  (Woody, AFK)              │
                       └──────────────┬─────────────┘
                                      │
                                      ▼
                  ┌───────────────────────────────────────┐
                  │  HERMES AGENT (Droplet, 100.78.x)     │
                  │  · gateway: Telegram polling           │
                  │  · web UI: :9119                       │
                  │  · MCP server: exposes to PC           │
                  │  · cron: daily/weekly automations      │
                  │  · cost-aware: Gemini/DeepSeek/Claude  │
                  └───────────────┬──────────┬────────────┘
                                  │          │
              "ECC bridge" outbound│          │inbound MCP
                                  │          │
                                  ▼          ▼
                  ┌───────────────────────────────────────┐
                  │  PC DASHBOARD (Tailscale 100.69.x)    │
                  │  · /api/openai/v1/chat/completions    │
                  │    (NEW — OpenAI-compatible wrapper)  │
                  │  · /api/chat/[agent]?godMode=true     │
                  │    (existing — triad endpoint)        │
                  │  · Claude Code CLI w/ 270 skills,     │
                  │    47 agents, 21 MCPs                  │
                  │  · MCP client → reaches Hermes back   │
                  └───────────────────────────────────────┘
```

### When PC is ON
1. Telegram → Hermes gateway
2. Hermes routes "deep" queries to PC dashboard via Tailscale
3. PC dashboard fires Claude Code with full ECC + triad
4. Response streams back to Hermes → Telegram

### When PC is OFF
1. Telegram → Hermes gateway
2. Hermes uses its own LLM (OpenRouter/Gemini/DeepSeek)
3. Limited capability but always responsive
4. Queues "needs ECC" tasks for later

### When at the PC (Claude Code in VS Code)
1. Claude Code adds Hermes Agent as MCP server
2. Claude Code delegates cron, kanban, background research TO Hermes
3. Hermes runs while user keeps coding

---

## Cost-aware routing (Jack Roberts's DeepSeek insight)

> "Would you pay 1% of the price for 95% of the value?"

Model selection per task type:

| Query type | Model | Cost / 1M tok | When |
|---|---|---|---|
| Casual chat ("hi, what should I do today") | Gemini 2.5 Flash | $0 (free tier) | Always |
| Deep reasoning ("review my plan") | Claude Sonnet via PC bridge | (free, your Max subscription) | When PC on |
| Overnight research / `/goal` | DeepSeek V4 via OpenRouter | $0.87 | Triggered by `/goal` or cron |
| Frontier-grade thinking | Claude Opus via PC bridge | (free, your Max) | When you ask "ultrathink" |
| Code generation | Claude Sonnet via PC bridge OR DeepSeek V4 | $0.87 or free | Default to DeepSeek for non-critical |

Hermes Agent's `/model` slash command hot-swaps. Default stays on free Gemini.

---

## Build plan — 3 phases

### Phase A: ECC bridge outbound (Hermes → PC dashboard)

**Goal:** Telegram message → Hermes → PC dashboard → Claude Code with full ECC.

**File 1: New dashboard route** `app/api/openai/v1/chat/completions/route.ts`
- Accepts OpenAI Chat Completions format request
- Internally calls existing `/api/chat/lebot-james` (or `[agent]` from URL)
- Wraps SSE events from dashboard into OpenAI streaming format
- Auth: requires Bearer token matching env `ECC_BRIDGE_TOKEN`

**File 2: Dashboard binds to Tailscale IP** (the gnarly part)
- Next.js `npm run dev -H X` only takes ONE host
- Solution: Tiny Node http-proxy server on PC at `100.69.115.98:3738` → forwards to `127.0.0.1:3737`
- Run as Windows service / startup task
- Dashboard stays bound to 127.0.0.1 (preserves freeze fix from earlier)

**File 3: Hermes custom provider config** (Droplet `~/.hermes/.env`)
```bash
ECC_BRIDGE_URL=http://100.69.115.98:3738/api/openai/v1
ECC_BRIDGE_TOKEN=<generated>
```
And `~/.hermes/config.yaml`:
```yaml
providers:
  ecc-bridge:
    base_url: ${ECC_BRIDGE_URL}
    api_key_env: ECC_BRIDGE_TOKEN
    api_mode: chat_completions
```

**File 4: Hermes triad routing rule**
- Hermes Agent has slash command `/handoff` (v0.14)
- Bind: any message containing "ultrathink", "deep dive", "use the council", or explicit `/council` → route to ECC bridge instead of default Gemini
- Otherwise: stay on Gemini (cheap)

### Phase B: ECC inbound (Claude Code → Hermes via MCP)

**Goal:** Claude Code on PC can delegate to Hermes (run my cron, search the web 24/7, manage kanban).

Hermes Agent exposes MCP via `hermes mcp serve --port 5555`. We add the Hermes MCP to Claude Code's `~/.claude/.mcp.json`:
```json
{
  "mcpServers": {
    "hermes": {
      "type": "http",
      "url": "http://100.78.199.123:5555",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

Then Claude Code sees Hermes as a tool. Example uses:
- "Hermes, search the web for Houston PE firms recruiting in May" → runs on Droplet, returns
- "Hermes, schedule a daily 7am Telegram summary of my open internships" → registers cron
- "Hermes, add a kanban card for 'apply to Quantum Energy by Friday'"

### Phase C: Optimizations (videos' top patterns)

| Pattern | Source | Implementation |
|---|---|---|
| **Hermes Curator** | David Ondrej Level 3 | `hermes curator enable` — auto-compacts generated skills, saves tokens long-term |
| **Kanban board** | David Ondrej Level 5 | `hermes kanban init` + embed view in our `/hermes` page tab |
| **GitHub auto-backup** | David Ondrej Level 4 | Cron job: backup `~/.hermes/memories/` + `~/.hermes/skills/` to private GitHub repo daily |
| **OpenRouter spawn** | Keith AI | Default provider for non-bridge mode — auto-routes between fast/cheap/expensive based on task |
| **Personal AI wiki** | Keith AI + Karpathy | Cron: every night Hermes summarizes the day into `Command Center/AIOS/wiki/YYYY-MM-DD.md` |
| **`/goal` for overnight runs** | Alex Finn | Skill that maps `/goal` → DeepSeek V4 (cheap) with 24h budget |
| **Voice replies** | Nate Herk | Hermes can respond with audio via ElevenLabs/local TTS — install when ready |

---

## Files I'll create when you greenlight Phase A

1. `dashboard/app/api/openai/v1/chat/completions/route.ts` — OpenAI-compatible wrapper
2. `dashboard/scripts/tailscale-proxy.js` — tiny Node proxy `100.69.115.98:3738` → `127.0.0.1:3737`
3. `dashboard/scripts/install-tailscale-proxy.ps1` — Windows Task Scheduler install for the proxy
4. `dashboard/hetzner/ecc-bridge-deploy.sh` — script that ssh's to Droplet and configures the custom provider

Total expected build time for Phase A: **~90 min**.

---

## Security model

- ECC_BRIDGE_TOKEN — 32-char random, in PC `.env.local` AND Hermes `.env`. Never logged.
- Tailscale-only — proxy binds to `100.69.115.98:3738` (Tailscale IP), not all interfaces. Public internet can't reach it.
- Rate limit on bridge route: max 60 req/min per chat (prevents runaway Telegram → Claude loops).
- Audit log: every bridge call logs `{timestamp, agent, prompt_hash, model_used, cost_estimate}` to `dashboard/data/bridge-audit.log`.

---

## What's running RIGHT NOW (after this session)

- ✅ Hermes Agent gateway (Telegram polling, Gemini default)
- ✅ Hermes Agent web UI on `100.78.199.123:9119`
- ✅ Norse dashboard `/hermes` page embeds the web UI via iframe (Tailscale-only)
- ✅ SOUL.md v2 with no role_hijack triggers
- ⏳ ECC bridge — designed in this doc, not yet built
- ⏳ Hermes Curator — not yet enabled
- ⏳ Kanban — not yet initialized
- ⏳ MCP server (inbound) — not yet exposed

---

## What to ask Hermes RIGHT NOW from Telegram

Send these to `@LeBotJamesAiosBot` to test things:

```
hello — basic chat (Gemini, fast)
what skills do you have?  — Hermes lists its built-in skills
/skills — same via slash command
who am I?  — should mention Woody, Houston, internship hunt (from SOUL.md)
/help — show all gateway commands
/personalities — list available personality files
```

If `who am I?` knows you, the SOUL.md is loaded correctly. That's the proof.

---

*Plan written 2026-05-26 by Claude during AIOS hub session. Phase A is the next concrete build when you greenlight.*
