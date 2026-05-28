# Hermes → Break-Even → Profit
> Path from $5/mo Hermes infrastructure to first dollar earned.
> Synthesized from Sharbel's "5 Ways I Make Money With Hermes" + Alex Finn's setup video + your stated goal: *turn paid AI subscriptions into break-even, then profit.*

---

## Sharbel's core framing (steal this mindset)

> *"Don't try to build a money machine on day one. Build one workflow that saves time and creates opportunities. Then have it pay for itself."*

> *"I would treat Hermes like a junior operator, not some magic money printer."*

> *"Hermes does not remove the need for a real offer. What it can do is remove a lot of the repetitive operator work that happens in the background around a real opportunity."*

**Translation:** Hermes isn't your business. Hermes is the assistant that makes whatever you're already doing 10x more efficient. The break-even path = pair Hermes with a real income channel.

---

## Your three income channels (mapped to Sharbel's 5 patterns)

| Income channel | Sharbel pattern | What Hermes does | Time to first $ |
|---|---|---|---|
| **Land a business internship** (immediate $) | #1 Lead gen + outreach (repurposed for internship hunt) | Researches 5 Houston companies/day, drafts personalized application angles | 4-12 weeks |
| **Trading edge** (options swing on SPY/GOOGL/PLTR) | #4 Polymarket/trading alerts (research-only) | Monitors unusual options flow, IV/HV spikes, news catalysts; alerts via Telegram | Immediate (smaller losses = saved $) |
| **Lucky Dog AI consulting** (later) | #2+#3 Content research + trend scout | Daily X/YT trend monitor for AI agent niche; surfaces topics to react to | 3-6 months (audience build) |

**Priority order for the next 30 days:**
1. **Internship pipeline scout** — direct line to $25-40k/summer internship comp
2. **Trading alerts research-only** — protects existing money, supports trade discipline
3. **Lucky Dog content scout** — audience building for future consulting clients

---

## What we haven't implemented yet (from these 2 videos)

### From Alex Finn (setup video)

| Gap | Why it matters | Effort |
|---|---|---|
| Nous Portal as a provider | Hermes's own built-in models, may be cheaper than OpenRouter for some tasks | 15 min |
| Active kanban board use | We have it discoverable; not initialized or used | 10 min |
| "Hermes builds its own tooling" workflow | Tell Hermes to build a skill for itself based on a request | conversation-only |
| Prototyping-from-gym pattern | Voice memo via Telegram → Hermes builds a working prototype overnight | already wired, just unused |

### From Venice (computer use + private inference video — `xCPSRkmNNWY`)

| Gap | Direct $ impact | Effort |
|---|---|---|
| **Venice + Kimi K2.6 as cheaper provider** | $0.85/M in + $4.66/M out vs GPT-5.5 at $6.25/$37.50 — **~7x cheaper** | 10 min — add as a Hermes provider, switch model |
| **Skill pruning** (107 enabled → ~30 we'll actually use) | Reduces context tokens per Hermes call by 60-80%, cuts model costs proportionally | 15 min — ask Hermes itself to prune via Venice demo workflow |
| Computer use toolset (file organization, desktop) | Marginal — saves you minutes per week | 5 min to enable |
| Diem token $1/day API credit | $30/mo free Venice API credits IF you stake their token (paid) | requires buying token — defer |

Key Venice provider details:
- Endpoint: `https://api.venice.ai/api/v1` (OpenAI-compatible)
- Best models for our use: **Kimi K2.6** (256K context, function calling + reasoning + vision + code), **Qwen 3.6 27B** (even cheaper, fully private), **Gemma 4 Uncensored** (cheap private)
- Zero data retention by Venice — privacy-aligned
- Add via `hermes auth add custom --type api-key --label Venice` then set base_url in config

### From Sharbel (monetization video)

| Gap | Direct $ impact | Effort |
|---|---|---|
| **Internship pipeline scout** | Lands you an internship faster ($25-40k summer) | 45 min |
| **Trading alerts** (unusual options flow on SPY/GOOGL/PLTR) | Better entry/exit timing | 30 min (uses existing tv_data.py) |
| **Content trend scout** (X + YouTube AI agent niche) | Builds Lucky Dog audience | 30 min |
| **Client ops workflow** | When you have AI consulting clients (later) | defer |
| **Lead-gen-as-service** (sell prospecting to other founders) | Productized service income | defer until you have a first client |

---

## What to build FIRST: Internship Pipeline Scout

This is the highest-leverage, most directly $-producing thing we can build today.

### What it does (daily, 8am CT, automatic)

1. Hermes scans Indeed, LinkedIn, Handshake, and the careers pages of your top 15 Houston targets (ExxonMobil, Chevron, Shell, Halliburton, etc.)
2. Filters for: business / finance / consulting / corp finance / ops intern roles
3. For each match, captures:
   - Company + role + location + deadline
   - Why this matches Woody (finance major, UH, Bauer track, Houston-based)
   - One personalized opening angle for the cover letter
4. Posts a Telegram digest each morning: "3 new today: ExxonMobil Finance Intern Summer 2027 (deadline Jul 1), Halliburton Corp Dev Intern, ..."
5. Each ✅ you react adds it to your InternshipPanel dashboard
6. Each ❌ reaction trains Hermes (memory) on what you're NOT interested in

### How it uses what we have

- ✅ Hermes scheduled cron (already on Droplet)
- ✅ Telegram gateway (already wired)
- ✅ ECC bridge to dashboard (writes to InternshipPanel SQLite)
- ✅ Hermes memory + SOUL.md (already has your context)
- ⏳ Web search skill (Hermes has built-in `web` toolset — just needs cron-wrapping)

### Build plan (~45 min)

1. Create cron-friendly Hermes skill: `internship-scout.skill.md` on Droplet
2. Add cron entry: 8am CT daily, runs the scout
3. Output: writes JSON to ECC bridge `/api/internships/draft` (new endpoint — drafts that need your ✅/❌)
4. Telegram digest sent simultaneously
5. New dashboard widget on `/hermes` shows pending draft applications

---

## Next two builds after internship scout

### #2 Trading Alerts (30 min)
- Hermes cron at 9:00 CT weekdays (before market open) + 3:30 CT (last hour)
- Calls `tv_data.py slate SPY GOOGL PLTR` (already exists at `C:\Users\woody\TradingView Assistant\src\tv_data.py`)
- Looks for: RSI <30 or >70, unusual volume, IV spike >2σ, news headlines
- Telegram alert if anything triggers
- **Research only — never trades. Per Sharbel: "That is how people get wrecked."**

### #3 Lucky Dog Content Scout (30 min)
- Hermes cron at 7am CT daily
- Monitors: X (AI agent + Hermes + OpenClaw + Claude Code + Cursor terms), YouTube (AI agent niche, breakout videos), Hacker News (front page filter for "agent" / "claude" / "MCP")
- Outputs: 3 ideas Lucky Dog could film/post about this week
- Drafts hook + brief outline
- When you start building Lucky Dog AI consulting audience, this is the engine

---

## Things we should also adopt (process-level)

From Sharbel's framing:
- ✅ "Always sell the outcome, never the method" — when pitching Lucky Dog AI consulting later, sell *"I'll build you a weekly lead pipeline"* not *"I'll set up Hermes for you"*
- ✅ "Speed is money in content" — trend scout pattern matters
- ✅ "Make sure nothing falls through the cracks" — client ops pattern (defer until needed)

From Alex Finn's framing:
- ✅ "Hermes is your general chief of staff, not your code builder" — use Claude Code for big builds, Hermes for orchestration + memory + daily ops
- ✅ "It learns and edits its own skills" — let it self-improve; don't over-script

---

## Suggested model routing (cost-aware, post-Venice video)

| Use case | Model | Cost / 1M tokens | When |
|---|---|---|---|
| Casual Telegram chat ("hi") | Gemini 2.5 Flash | $0 (free tier) | Default — already wired |
| Internship scout (research-heavy) | Venice Kimi K2.6 | $0.85 in / $4.66 out | Add as new cron job's model |
| Trading alerts (low-context lookups) | Gemini 2.5 Flash | $0 | Triggered by cron |
| Deep reasoning ("ultrathink", "council", `/goal`) | Claude Opus via PC bridge | $0 (your Max subscription, until downgrade) | When you explicitly ask |
| Overnight `/goal` 24h runs | Venice Qwen 3.6 27B or DeepSeek V4 | Pennies for hours of work | Triggered by `/goal` slash command |

**Smart routing decision:** when your Max downgrade happens, **Kimi K2.6 via Venice becomes the default** for any task that doesn't need Claude. ~7x cheaper than OpenAI, function calling + vision + code = covers ~90% of Hermes operator work.

---

## The honest math on break-even

| Cost | Monthly |
|---|---|
| Hermes infrastructure (Droplet + backups) | $5 |
| Tailscale, OpenRouter free tier, Gemini free tier | $0 |
| Claude Max (current $100, downgrading to $20 soon) | $20-100 |
| **Total** | **$25-105/mo** |

| Break-even path | Time | $$ |
|---|---|---|
| **Internship landed** (priority #1) | 4-12 weeks | $25-40k for summer = full year of infra +Claude Max paid 200x over |
| **One trade saved** by alert ($500 loss avoided) | Immediate | Pays 5-10 months of infra |
| **One Lucky Dog AI consulting client** ($2-5k retainer) | 3-6 months | Pays 1-2 years of all costs |

**The honest answer: if Hermes helps land ONE internship interview, it's already paid for itself for life.**

---

*Document created 2026-05-26 after watching `RoBD7Lc-0MI` (Alex Finn) + `2WZAcWtwoDI` (Sharbel A.).*
