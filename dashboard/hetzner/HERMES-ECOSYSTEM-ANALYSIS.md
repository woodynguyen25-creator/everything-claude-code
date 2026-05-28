# Hermes Ecosystem — GitHub Repos Worth Looking At
> Analysis of the popular Hermes-adjacent repos. Date: 2026-05-26.

---

## Skip these (not relevant)

- **facebook/hermes** (11.1k★) — JavaScript engine for React Native. Unrelated to AI agents. Same name only.
- **NousResearch/hermes-paperclip-adapter** — Adapter for running Hermes "as a managed employee" in a paperclip-style sandbox. SaaS pattern; not relevant for personal use.

---

## The 4 worth seriously considering (ranked by your goal)

### 🥇 #1: garrytan/gbrain (18k★, TypeScript) — **install this**

**What it is:** A self-wiring knowledge graph for AI agents. Built by Garry Tan (CEO of Y Combinator) to run his actual personal AI agents. **Designed to work directly with Hermes Agent.**

**What it gives you that Hermes doesn't:**
- **34 skills** scaffolded into your Hermes workspace, including: `soul-audit` (interview-driven SOUL.md), `import` (bulk markdown ingest), `entity extraction` (auto-creates typed links: `attended`, `works_at`, `invested_in`, `founded`, `advises`)
- **Self-wiring knowledge graph** — every markdown page you write extracts entity references and creates typed links with ZERO LLM calls (cheap + fast)
- **Hybrid search** — vector + BM25 + backlink-boosted ranking → P@5 49.1% on 240-page corpus (Hermes' default memory is just text-search)
- **Daily autonomous enrichment** — overnight the brain ingests new people/companies, fixes citations, consolidates memory

**Why this is GAME-CHANGING for your break-even goal:**

For internship hunt:
- Every Houston company you research becomes a typed `Company` page
- Every recruiter you contact becomes a typed `Person` page linked via `works_at`
- You can ask: *"Who works at Exxon in finance roles I've talked to? What was the last touchpoint?"* and get an answer Hermes can't currently give you.

For trading:
- Every news event becomes a `News` entity linked to tickers via `mentioned_in`
- Every trade becomes a `Trade` page linked to thesis/article/news
- Ask: *"What was my last reason for buying GOOGL? What news preceded the last 3 SPY trades I made?"*

For Lucky Dog Marketing (future):
- Every prospect becomes a `Person` linked to `Company` linked to `Industry`
- Auto-tracks the AI consulting funnel as a graph

**Install:**
```bash
# On the Droplet (where Hermes lives):
curl -fsSL https://bun.sh/install | bash
bun install -g github:garrytan/gbrain
gbrain init --pglite   # 2-second local brain, no server
gbrain skillpack scaffold --all   # adds 34 skills to ~/.hermes/skills/
gbrain doctor
```

**API keys needed:**
- ZeroEntropy or OpenAI for embeddings (free tier on either)
- Anthropic optional (improves query expansion — you have this via Max)

**Effort:** ~30 min install + initial import of existing markdown notes. Then it self-maintains overnight.

**Cost:** Free (open source). Embeddings on ZeroEntropy free tier = $0 for your scale.

---

### 🥈 #2: farion1231/cc-switch (81.7k★, Rust) — **install for the Max downgrade**

**What it is:** Cross-platform desktop "All-in-One assistant" that lets you switch between Claude Code, Codex, OpenCode, OpenClaw, Gemini CLI, and Hermes Agent from one window.

**Why it matters for your $100 → $20 Max downgrade:**
When you hit Max rate limits, you can hot-swap mid-task to Codex or Gemini CLI without losing context. Currently you'd have to manually open a different terminal and re-explain the task. This is one keystroke.

**Install:** Standalone desktop app, no server. Native Rust binary. Probably `winget install cc-switch` or grab from releases page.

**Effort:** ~5 min.

**Risk:** With 81k stars but a niche use case, worth checking commit recency before deep-trusting.

---

### 🥉 #3: nesquena/hermes-webui (8.8k★, Python) — **maybe install**

**What it is:** "The best way to use Hermes Agent from the web or from your phone." Alternative to Hermes's built-in `hermes dashboard` web UI.

**Compared to current setup:**
- We have Hermes's built-in dashboard at `100.78.199.123:9119` (iframe-embedded in `/hermes`)
- Plus our native chat panel (left side of `/hermes`)

**What hermes-webui adds:** If it's mobile-optimized, it'd let you chat with Hermes from iPhone Safari **without Telegram as the relay**. Direct browser → Tailscale → Droplet.

**Question to answer before installing:** does it offer anything our native chat panel + iframe doesn't? If it's mobile-first PWA quality, yes. If it's "another iframe-able dashboard," no.

**Effort:** ~20 min install + verify; could be skipped entirely.

---

### #4: outsourc-e/hermes-workspace (4.9k★, JS) — **inspect, maybe steal patterns**

**What it is:** "Native web workspace for Hermes Agent — chat, terminal, memory, skills, inspector."

**Most interesting:** the **skills inspector**. We have 22 ECC skills + 85 builtin = 107 enabled. We don't have a great UI for browsing/editing them. If their inspector is good, we can either embed it or steal the patterns into our `/hermes-skills` page.

**Effort:** Probably worth a 10-min inspection of their GitHub, not necessarily an install.

---

## Skip-for-now (lower fit)

- **fathah/hermes-desktop** (7.6k★, TS) — Desktop system tray companion. Marginal value for you because you already have the iframe + native chat in the Norse dashboard.

---

## Recommended install order for break-even goal

1. **gbrain** (30 min) — Knowledge graph that compounds over time. ROI per hour spent: extremely high. Every research session you do automatically enriches the graph.
2. **cc-switch** (5 min) — Insurance policy for the Max downgrade. Lets you hot-swap to Codex/Gemini when Claude hits limits.
3. (Optional) **hermes-webui inspection** (10 min reading) — Decide if it gives you mobile-direct access.
4. (Optional) **hermes-workspace inspection** (10 min reading) — Steal the skills inspector pattern for our `/hermes-skills` page.

**Total time investment:** 45 min for #1+#2, which gives you a self-wiring knowledge graph + multi-agent failover. That's the highest leverage 45 min you can spend this week.

---

## How gbrain fits with what we've already built

| Layer | What it does | Source |
|---|---|---|
| **Hermes Agent** (NousResearch v0.14) | Inference, gateway, skills, cron | Already running on Droplet |
| **SOUL.md v6 + USER.md** | Static identity context | Already deployed |
| **22 ECC skills (SKILL.md wrappers)** | Documents your skills to Hermes | Deployed this session |
| **ECC bridge** (Tailscale → PC dashboard) | Routes deep queries to Claude on PC | Already wired |
| **Native chat panel** (Norse dashboard `/hermes`) | Direct chat from dashboard | Already wired |
| **gbrain** ⬅ NEW | Self-wiring knowledge graph; entity extraction; hybrid search | Install next |

gbrain doesn't replace anything. It **adds a brain layer underneath everything else** so memory compounds.

---

*Researched 2026-05-26. Garry Tan's gbrain README + benchmarks read in detail; others assessed via star count + tagline + my knowledge of the patterns.*
