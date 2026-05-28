# Loop Library — Multi-Agent Workflows for Woody's AIOS

**Status:** v1 specs for the 5 highest-value autonomous + co-creative loops, all routed through FREE models only.
**Date:** 2026-05-18
**Author:** Claude (architecture lead)
**Cost floor:** $0/day — runs entirely on existing Claude Max + ChatGPT Plus + free Groq/Gemini/Ollama tiers.

---

## Free-models routing matrix (locked)

Every loop in this library uses ONLY these providers. The five free providers below cover all use cases; DeepSeek is a tier-1.5 addition (free 30-day signup credit).

| Provider | Models | Free tier | Sign-up |
|---|---|---|---|
| **Claude Max** | Opus 4.7 / Sonnet 4.6 / Haiku 4.5 | Existing subscription | — |
| **ChatGPT Plus** | GPT-5.5 | Existing subscription | — |
| **Groq** | Llama 3.3 70B / Mixtral 8x7B / Gemma 2 9B / DeepSeek-R1 distilled | 30 req/min, ~6,000/day. Sub-100ms first-token (LPU hardware) | [console.groq.com](https://console.groq.com) → API keys |
| **Cerebras** *(NEW — tier-1 free)* | Llama 3.3 70B / gpt-oss-120B / Qwen 2.5 | 30 RPM, 60K TPM, **1M tokens/day**. ~3,000 tok/sec throughput (industry-best) | [cloud.cerebras.ai](https://cloud.cerebras.ai) → API keys |
| **Google AI Studio** | Gemini Flash 2.0 / Gemini Pro 1.5 | 1,500 req/day, multimodal, 1M token context | [aistudio.google.com](https://aistudio.google.com) |
| **Ollama** (local) | Qwen 2.5 14B / DeepSeek-Coder 33B / Llama 3.3 8B | Unlimited (uses RTX 5070) | [ollama.com](https://ollama.com) |
| **DeepSeek API** *(tier 1.5 — 30-day free trial)* | DeepSeek V3.2 / V4 Flash / DeepSeek-Coder | 5M tokens free on signup (~30 days). Then $0.14/M in, $0.28/M out. ~$5/mo covers 30M tokens. | [platform.deepseek.com](https://platform.deepseek.com) |
| **MCP servers (existing)** | ExA, Firecrawl, GitHub, Playwright, fal.ai | Already wired | — |

### Role → Model mapping (default routing)

| Role | Primary | Fallback | Local option |
|---|---|---|---|
| **Planner** (heavy reasoning, synthesis) | Opus 4.7 (Max) | Sonnet 4.6 (Max) | n/a — Ollama too small for this |
| **Bulk Executor** (long-context research, batch summaries) | **Cerebras Llama 3.3 70B** (1M tokens/day, fastest throughput) | Groq Llama 70B (when Cerebras hits TPM cap) → DeepSeek V3.2 (when free trial active) | Ollama Qwen 2.5 14B |
| **Fast Executor** (low-latency, agentic tool loops) | **Groq Llama 3.3 70B** (sub-100ms first-token) | Cerebras (fallback) → Gemini Flash 2.0 | n/a |
| **Code generation** (bulk implementation, refactor) | **DeepSeek-Coder via DeepSeek API** (free trial then $5/mo) | Cerebras Llama 70B | Ollama DeepSeek-Coder 33B |
| **Triage** (which loop? which agent?) | Haiku 4.5 (Max) | Groq Gemma 2 9B | Ollama Llama 3.3 8B |
| **Critic** (second opinion) | **Sonnet 4.6 (Max)** with critic prompt | Groq Llama 3.3 70B (different model = different blind spots) | GPT-5.5 (Plus) — RESERVE for high-stakes moments only, Plus tier rate limits are tight |
| **Multimodal** (images, PDFs, charts) | Gemini Flash 2.0 | n/a | n/a (Ollama can but slow on consumer hardware) |
| **Long-context reasoning** (process 100K+ token doc) | **Cerebras** (1M tokens/day free, fastest at scale) | Gemini Pro 1.5 (1M context) | n/a |
| **Research scraping** | ExA + Firecrawl MCP | WebFetch (Claude built-in) | n/a |

### Why this matrix is right

- **Claude Opus** for the "thinking moments" — you pay for Max anyway, use it where reasoning matters most
- **Cerebras Llama 3.3 70B** for bulk work — 1M tokens/day free + industry-best 3,000 tok/sec throughput. The single biggest free upgrade in the 2026 LLM landscape — most setups still don't know about it
- **Groq Llama 3.3 70B** for low-latency agentic loops — sub-100ms first-token via LPU hardware makes iterative tool-calling feel native. Use over Cerebras when latency matters more than throughput
- **DeepSeek-Coder via DeepSeek API** for any code-heavy loop — competitive with Claude Sonnet on code tasks at ~1/30 the cost. Free 30-day trial (5M tokens), then $5/mo covers all personal use
- **Gemini Flash 2.0** as multimodal swiss army knife — reads screenshots, PDFs, charts that Llama can't
- **Claude Sonnet** (NOT GPT-5.5) as the default critic — different reasoning passes from Claude Opus give second-opinion value without burning your ChatGPT Plus quota. **Reserve GPT-5.5 for high-stakes critique only** — Plus tier has tight rate limits (~80 messages per 3hr) and Codex CLI shares that quota
- **Ollama** for any work you don't want leaving your machine

---

## The 5 loops

### Loop 1 — Morning Trading Brief Triad

**Pattern:** Specialist Pipeline → Triad synthesis
**Trigger:** Cron at 5:00 AM CDT (Mon-Fri only)
**Time horizon:** Yesterday's close → today's pre-market

#### Architecture

```
5:00 AM cron fires
  │
  ▼
┌─ STAGE 1: SAURON SCAN ─────────────────────────────────┐
│  Model: Groq Llama 3.3 70B                              │
│  Tools: ExA MCP, Firecrawl MCP, RSS feeds               │
│  Task: Scan overnight news + earnings + macro for:      │
│    - Your watchlist tickers                             │
│    - Major macro events (CPI, Fed, etc.)                │
│    - Sector rotations                                   │
│    - Geopolitical moves affecting markets               │
│  Output: structured JSON list of "stirs in the realm"   │
│  Time budget: ~2 minutes                                │
└─────────────────────────────────────────────────────────┘
  │
  ▼
┌─ STAGE 2: THOR ANALYZE ─────────────────────────────────┐
│  Model: Claude Sonnet 4.6 (Max)                         │
│  Input: Sauron's findings + your watchlist + recent     │
│         trades from ParlayBot DB                        │
│  Task: For each watched ticker, generate:               │
│    - Current setup state                                │
│    - Catalyst exposure today                            │
│    - Suggested action (watch / strike / hold)           │
│    - Risk/reward if applicable                          │
│  Output: structured ticker-by-ticker analysis           │
│  Time budget: ~3 minutes                                │
└─────────────────────────────────────────────────────────┘
  │
  ▼
┌─ STAGE 3: LEBOT SYNTHESIZE ─────────────────────────────┐
│  Model: Claude Opus 4.7 (Max) — worth the cost here     │
│  Input: Sauron's scan + Thor's analysis                 │
│  Task: Write a 1-page Morning Brief with:               │
│    - "Today's thesis" in 2 sentences                    │
│    - 3 highest-conviction watches                       │
│    - 1-2 risks to monitor                               │
│    - Norse-king + LeBron voice                          │
│  Output: markdown file at                               │
│    `Obsidian Vault/Trading/{date}-morning-brief.md`     │
│  Plus: Telegram digest with the 1-page brief            │
│  Time budget: ~2 minutes                                │
└─────────────────────────────────────────────────────────┘
  │
  ▼
Done by 5:10 AM. Brief ready in Obsidian + Telegram before market open.
```

#### Implementation skeleton

```javascript
// scripts/loops/morning-trading-brief.js
// Cron: 0 5 * * 1-5 (5am Mon-Fri)

import { groqLlama } from '../lib/llm/groq.js';
import { claudeSonnet, claudeOpus } from '../lib/llm/claude.js';
import { searchExa, scrapeFirecrawl } from '../lib/mcp.js';
import { readWatchlist, getRecentTrades } from '../lib/trading.js';
import { writeObsidian, sendTelegram } from '../lib/output.js';

async function run() {
  // Stage 1: Sauron scan
  const sauronFindings = await groqLlama({
    system: SAURON_SYSTEM_PROMPT,
    prompt: `Scan overnight for these tickers: ${watchlist}. Use ExA + Firecrawl for news, earnings, macro.`,
    tools: [searchExa, scrapeFirecrawl],
  });

  // Stage 2: Thor analyze
  const thorAnalysis = await claudeSonnet({
    system: THOR_SYSTEM_PROMPT,
    prompt: `Given Sauron's findings ${sauronFindings} and recent trades ${recentTrades}, analyze each ticker.`,
  });

  // Stage 3: Lebot synthesize
  const morningBrief = await claudeOpus({
    system: LEBOT_SYSTEM_PROMPT,
    prompt: `Synthesize a 1-page morning brief from Sauron + Thor's work. Norse-king + LeBron voice.`,
  });

  // Output
  await writeObsidian(`Trading/${today}-morning-brief.md`, morningBrief);
  await sendTelegram(morningBrief);
}
```

#### Cost breakdown
- Sauron (Groq Llama 70B): free (1 of ~6,000 daily requests)
- Thor (Claude Sonnet): existing Max subscription
- Lebot (Claude Opus): existing Max subscription
- **Daily cost: $0**

---

### Loop 2 — Slate Selection Critic Loop

**Pattern:** Self-Refine + Critic
**Trigger:** Manual or cron (when ParlayBot has a fresh slate proposal)

#### Architecture

```
ParlayBot generates slate proposal
  │
  ▼
PERSEUS REVIEW
  Model: Groq Llama 3.3 70B
  Task: Sanity-check Perseus's own picks:
    - Re-verify vig calculations
    - Re-check sanity gates (DNP risk, weather, time-window)
    - Kelly sizing review
    - Flag any "smell" the bot missed
  Output: refined slate with confidence per leg
  │
  ▼
LEBOT CRITIC
  Model: Claude Opus 4.7
  Task: Senior critic pass:
    - Look at the slate as a portfolio (correlation risk)
    - Check market context (was a big macro event today?)
    - Look for "fade the public" angle if Perseus picked all chalk
    - Veto any legs that don't pass strategic review
  Output: approved slate OR veto with reasons
  │
  ▼
IF Lebot vetoed → loop back to PERSEUS for rebuild
IF Lebot approved → output to Telegram + Obsidian
IF rejected entirely → "no pact tonight, my Lord" message
```

#### Cost breakdown
- Perseus (Groq): free
- Lebot (Opus): existing Max
- **Daily cost: $0**

---

### Loop 3 — Design Critique Loop (Fenrir + Lebot)

**Pattern:** Self-Refine via two voices
**Trigger:** Manual via Ravens drawer (`⌘K` + drop a screenshot)

#### Architecture

```
You drop a Lucky Dog screenshot into Ravens
  │
  ▼
GEMINI VISION READ
  Model: Gemini Flash 2.0 (multimodal)
  Task: Describe the screenshot in structured form:
    - Layout / hierarchy
    - Color palette
    - Typography
    - Spacing / rhythm
    - Visual issues observed
  Output: structured visual analysis (text)
  │
  ▼
FENRIR CRITIQUE
  Model: Claude Sonnet 4.6
  System prompt: dashboard/personas/fenrir.md
  Task: Apply the savage Fenrir critique framework
    (kill / why / fix / watch) to the visual analysis
  Output: 4-part Fenrir critique
  │
  ▼
LEBOT REVIEW (light)
  Model: Claude Opus 4.7
  Task: Check Fenrir's critique against the locked design language
    - Is the kill consistent with DESIGN-LANGUAGE.md?
    - Is the fix achievable in the current stack?
    - Strip anything off-brand
  Output: refined critique back to you in Ravens drawer
```

#### Cost breakdown
- Gemini Flash 2.0: free (1 of 1,500 daily)
- Fenrir (Sonnet): existing Max
- Lebot review (Opus): existing Max
- **Daily cost: $0**

---

### Loop 4 — Deep Research Triad

**Pattern:** Triad
**Trigger:** Manual via Ravens drawer ("research X for me")

#### Architecture

```
You: "What's happening with [X] in the last 7 days?"
  │
  ▼
TRIAGE
  Model: Haiku 4.5 OR Groq Gemma 2 9B
  Task: Classify the query:
    - Domain (markets / design / AI / personal / other)
    - Depth needed (quick lookup / 5-minute scan / deep dive)
  Output: routing decision
  │
  ▼
SAURON SCAN
  Model: Groq Llama 3.3 70B (parallel with ExA + Firecrawl)
  Task: Cast a wide net across web sources
  Output: 10-20 candidate findings, ranked by relevance
  │
  ▼
SPECIALIST TRANSLATE (parallel: only fires if domain matches)
  - Markets → Thor (Sonnet)
  - Design → Fenrir (Sonnet)
  - AI/Engineering → Claude Sonnet generic
  Task: Take Sauron's findings and contextualize for YOUR work
    - Thor: "How does this affect your watchlist?"
    - Fenrir: "How does this affect Lucky Dog's design language?"
  Output: domain-specific synthesis
  │
  ▼
LEBOT SYNTHESIZE
  Model: Claude Opus 4.7
  Task: Final write-up in 3-paragraph format:
    - The signal (what's actually happening)
    - The interpretation (what it means for you)
    - The next move (what to do, if anything)
  Output: streamed back to Ravens drawer
```

#### Cost breakdown
- Triage (Haiku or Groq Gemma): free / negligible
- Sauron (Groq): free
- Specialist (Sonnet): existing Max
- Lebot synthesis (Opus): existing Max
- **Per-query cost: $0**

---

### Loop 5 — Nightly Surveillance (Sauron autonomous)

**Pattern:** Watch-and-Trigger
**Trigger:** Cron at 11:00 PM CDT daily

#### Architecture

```
11:00 PM cron fires
  │
  ▼
LOAD WATCH CONFIG
  File: dashboard/data/sauron-watches.json
  Contents:
    - markets you care about (your watchlist tickers)
    - AI tools/companies you track
    - competitors (for AI consulting)
    - sources (HN, ArXiv, specific newsletters)
  │
  ▼
SAURON BATCH SCAN
  Model: Groq Llama 3.3 70B (multiple parallel calls if needed)
  Tools: ExA MCP, Firecrawl MCP
  Task: For each watch, scan recent activity:
    - Anything new since the last run?
    - Any threshold-crossing event?
  Output: structured findings per watch
  │
  ▼
SIGNIFICANCE FILTER
  Model: Claude Haiku 4.5 (cheap classifier)
  Task: For each finding, classify:
    - high-importance / medium / low / ignore
  Output: only high + medium findings continue
  │
  ▼
LEBOT DIGEST WRITER (only if findings present)
  Model: Claude Sonnet 4.6
  Task: Write a 200-word "Sauron's Watch" digest
    - Norse-king voice, surveillance officer reporting
    - Ranked findings
  Output: digest text
  │
  ▼
DELIVER
  - Append to Obsidian Vault/Sauron's Watch/{date}.md
  - Send to Telegram (only if at least one HIGH finding)
  - Add to dashboard's ActivityStream
```

#### Cost breakdown
- Sauron scan (Groq): free
- Significance filter (Haiku): existing Max
- Digest writer (Sonnet): existing Max
- **Daily cost: $0**

---

## Setup checklist (one-time, ~1 hour)

### 1. Sign up for the free providers

- [ ] **Groq** — [console.groq.com](https://console.groq.com) → Sign up free → Generate API key
- [ ] **Cerebras** *(NEW)* — [cloud.cerebras.ai](https://cloud.cerebras.ai) → Sign up free → Generate API key (1M tokens/day is your biggest single free allowance)
- [ ] **Google AI Studio** — [aistudio.google.com](https://aistudio.google.com) → Sign in with Google → Get API key
- [ ] **DeepSeek** *(free 30-day trial, then re-evaluate)* — [platform.deepseek.com](https://platform.deepseek.com) → Sign up → Get API key (5M tokens free on signup)
- [ ] **Ollama** (optional, local) — Download from [ollama.com](https://ollama.com), install on Windows
  - `ollama pull qwen2.5:14b` (good general-purpose 14B model, ~8GB)
  - `ollama pull deepseek-coder-v2:16b` (for code tasks, ~9GB)

### 2. Store API keys

Add to a `dashboard/.env.local` file (gitignored):
```
GROQ_API_KEY=gsk_xxx
CEREBRAS_API_KEY=csk-xxx
GEMINI_API_KEY=AI_xxx
DEEPSEEK_API_KEY=sk-xxx
OLLAMA_HOST=http://localhost:11434
```

### 3. Build the shared LLM client library

Create `dashboard/lib/llm/` with:
- `groq.js` — Groq SDK wrapper (`groq-sdk` npm package, free)
- `cerebras.js` — Cerebras SDK wrapper (`@cerebras/cerebras_cloud_sdk` npm package, free)
- `gemini.js` — Google Gen AI SDK wrapper (`@google/generative-ai` npm package, free)
- `deepseek.js` — DeepSeek API wrapper (OpenAI-compatible — reuse the OpenAI SDK with custom baseURL)
- `claude.js` — Anthropic SDK wrapper (uses your Max account via API key)
- `ollama.js` — local Ollama HTTP client (no SDK needed, just fetch)
- `router.js` — the routing matrix above implemented as `route(role, options)` function with automatic fallback chains

### 4. Fallback chain wiring (locked behavior)

Each role has a deterministic fallback chain. When the primary returns a 429 (rate limit) or 500 (server error), automatically retry on the next option. Logged to `dashboard/logs/llm-fallbacks.json` so you can see degradation patterns.

```
Bulk Executor:   Cerebras → Groq → DeepSeek (if trial active) → Gemini → Ollama
Fast Executor:   Groq → Cerebras → Gemini → Ollama
Code generation: DeepSeek → Cerebras Llama → Ollama DeepSeek-Coder
Triage:          Haiku → Groq Gemma → Ollama Llama 8B
Critic:          Sonnet → Groq Llama 70B (different prompt) → GPT-5.5 (escalation only — limited Plus quota)
Multimodal:      Gemini Flash 2.0 → (no fallback — fail loudly)
```

### ChatGPT Plus rate-limit notes ($25 tier)

You have ChatGPT Plus, NOT Pro. That means:
- GPT-5.5 messages: ~80 per 3-hour window in the web/desktop app
- Codex CLI: shares this quota — heavy implementation work eats into your GPT-5.5 allowance
- **Action:** Don't default the Critic role to GPT-5.5. Use Sonnet first. Reserve GPT-5.5 for genuine "I need a different brain on this" moments (architectural decisions, high-stakes trade calls). This preserves Codex CLI capacity for the work it does best (mechanical implementation).
- **If Codex hits rate limits frequently:** that's the signal to evaluate DeepClaude (proxy Codex to DeepSeek backend, free up your Plus quota for other things)

### 4. Wire each loop

Each loop is one cron job + one script. Total ~5 scripts in `scripts/loops/`.

Cron registration via Windows Task Scheduler (you already use this for the AIOS Doctor — same pattern).

---

## Cost guardrails

Even on free tiers, set explicit usage limits:

- **Groq:** auto-throttle to 25 req/min (safety margin under 30/min limit)
- **Gemini:** count requests, halt if >1,400/day (safety margin under 1,500)
- **Anthropic (Claude via Max):** Max plan has its own rate limits — Sonnet for high-volume, Opus for low-volume
- **Ollama:** no cost, but rate-limit to your hardware capacity

If you ever hit a free-tier limit, the loop should:
1. Log the limit hit to `dashboard/logs/loop-limits.json`
2. Auto-degrade to the next-cheaper option (Llama → Gemini → Ollama)
3. Telegram alert ONLY if all free options exhausted

---

## What this unlocks

Running all 5 loops daily:
- **Morning Trading Brief** lands at 5:10 AM with a sharp pre-market thesis
- **Slate Selection** runs whenever ParlayBot has a proposal — better win rate via two-pair-of-eyes
- **Design Critique** is one keystroke away (Ravens drawer)
- **Deep Research** is on-demand and always context-aware
- **Nightly Surveillance** keeps you informed of everything that stirs without you doomscrolling

Total ongoing cost: **$0/day** on top of subscriptions you already pay.

---

## What's deferred (evaluate after 30 days of running loops)

### Tier 1.5 — DeepSeek paid tier ($5/month-ish)
- After your 5M signup tokens expire, DeepSeek costs $0.14/M input · $0.28/M output
- ~$5/month covers ~30M tokens for personal agentic use
- Best $/quality ratio in the market. DeepSeek-Coder is state-of-the-art for code tasks
- **Decision point:** at day 30, look at usage and decide

### Tier 2 — DeepClaude proxy (Codex routing)
- [DeepClaude](https://github.com/aattaran/deepclaude) routes Claude Code's autonomous loop to DeepSeek V4 Pro
- ~17x cheaper than native Claude Code for bulk implementation work
- Same UX, same tool calls, just a cheaper backend
- **Decision point:** evaluate after Slice 4 (Ravens) ships. If you're hitting Max rate limits during heavy Codex work, wire DeepClaude as the fallback. Native Claude stays for design/architecture/critique; DeepClaude handles bulk implementation.

### Tier 3 — Paid tiers we're NOT currently wiring
- **OpenRouter** — adds billing complexity for marginal benefit. Skip unless multi-provider routing becomes genuinely necessary
- **Anthropic API direct** — wire only if you want Claude API outside the Max subscription. Probably never needed
- **GPT-5.5 API direct** — same logic — you have Plus, no need for direct API
- **Together / Fireworks** — pay-as-you-go inference. Skip — Cerebras + Groq + Gemini free tiers cover their use cases

These sit in the bank. Don't wire unless free options hit walls.

---

## Implementation order (when you want to ship these)

| Order | Loop | Why first |
|---|---|---|
| 1 | **Setup** — Groq + Gemini accounts + `lib/llm/` library | Foundation for all loops |
| 2 | **Loop 5 — Nightly Surveillance** | Lowest stakes (read-only, no user interaction) — proves the LLM routing works |
| 3 | **Loop 1 — Morning Trading Brief** | Highest daily impact — gets you a sharp thesis every market day |
| 4 | **Loop 4 — Deep Research Triad** | Powers the Ravens drawer's escalate-to-Lebot feature |
| 5 | **Loop 2 — Slate Selection Critic** | Best when ParlayBot is consistently producing slates |
| 6 | **Loop 3 — Design Critique** | Most useful when actively working on Lucky Dog |

Ship them one at a time. Each is ~3-5 hours of work. The setup phase is the longest (~1 hour); subsequent loops reuse the same `lib/llm/router.js`.

---

## Don't-build list

- ❌ Multi-agent debate / Council pattern (loops where N agents argue and vote) — sounds cool, but for your specific work, the Triad is sufficient. Skip the complexity.
- ❌ Self-improving loops (where agents critique and tune their own prompts) — research territory, not production
- ❌ Autonomous trading execution (agent places trades without you) — too high stakes for v1
- ❌ Cross-loop coordination (loops talking to other loops) — premature; build them as independent first
