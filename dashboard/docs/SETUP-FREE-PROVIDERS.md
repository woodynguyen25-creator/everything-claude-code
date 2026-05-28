# Free Providers Setup — Step-by-Step Tutorial

**Goal:** Get the maximum free + ultra-cheap LLM + research stack wired up so loops can run for ~$0/month.
**Time to complete:** ~45 minutes once you sit down to do it.
**Status:** Ready to follow when you're ready.

---

## What you ALREADY have (no action needed)

| Provider | Status | Cost |
|---|---|---|
| **Claude Max** | Active — Opus 4.7, Sonnet 4.6, Haiku 4.5 available | Your existing subscription |
| **ChatGPT Plus** | Active — GPT-5.5 + Codex CLI access | Your existing $25/mo |
| **Codex CLI** | Installed + wired | Free (uses Plus subscription) |
| **21 MCPs wired** | context7, playwright, firecrawl, github, exa, fal-ai, sequential-thinking, e2b, mcpcontrol, mem0, obsidian, tradingview, + more | Free (running locally) |
| **AIOS Doctor scheduled task** | Running at logon, healing NPX caches, monitoring MCP duplicates | Free (your machine) |
| **claude-mem** | Cross-session memory layer active | Free |
| **Whisper-Dictate** | Push-to-talk local dictation, RTX 5070 CPU mode | Free |
| **ParlayBot + Morning Brief scripts** | Cron-scheduled | Free |

You're already running a meaningfully heavy AI stack at $0 marginal cost beyond your existing subscriptions.

---

## What to sign up for NEW (in order — total ~30 minutes)

### 1. Groq — fast LLM inference (5 min)

**Why:** Free tier 30 requests/min, ~6,000/day, sub-100ms first-token. Llama 3.3 70B / Mixtral / DeepSeek-R1 distilled. The fastest free inference in the world thanks to their LPU hardware.

**What you'll use it for:** Fast Executor role in loops — quick classification, triage, low-latency agent tool calls.

**Steps:**
1. Go to **[console.groq.com](https://console.groq.com)**
2. Sign in with Google or GitHub
3. Navigate to "API Keys" in the left sidebar
4. Click "Create API Key"
5. Name it `aios-dashboard`
6. Copy the key — starts with `gsk_...`
7. Save it — you can't view it again after closing the modal

**Test:** Once you have the key, run this quick check from PowerShell (replace `YOUR_KEY`):
```powershell
curl -X POST https://api.groq.com/openai/v1/chat/completions `
  -H "Authorization: Bearer YOUR_KEY" `
  -H "Content-Type: application/json" `
  -d '{"model":"llama-3.3-70b-versatile","messages":[{"role":"user","content":"say hi"}]}'
```

---

### 2. Cerebras — highest free throughput (5 min)

**Why:** 1M tokens/day FREE — biggest single free token allowance in the industry. 3,000 tokens/sec throughput from WSE wafer hardware. Most setups don't know about this yet.

**What you'll use it for:** Bulk Executor role — long-context research scans (Sauron), document processing, batch summaries. When you need to chew through a LOT of text fast.

**Steps:**
1. Go to **[cloud.cerebras.ai](https://cloud.cerebras.ai)**
2. Click "Get Started Free"
3. Sign up with Google or email
4. Once in the dashboard, go to "API Keys"
5. Generate a new API key — starts with `csk-...`
6. Copy and save it

**Test:**
```powershell
curl -X POST https://api.cerebras.ai/v1/chat/completions `
  -H "Authorization: Bearer YOUR_KEY" `
  -H "Content-Type: application/json" `
  -d '{"model":"llama-3.3-70b","messages":[{"role":"user","content":"say hi"}]}'
```

---

### 3. Google AI Studio (Gemini) — multimodal swiss army knife (5 min)

**Why:** 1,500 requests/day free, 1M token context window, multimodal (reads images, PDFs, video, audio). Best free option for anything involving visual content.

**What you'll use it for:** Multimodal role — analyze trading charts, parse PDF research, read Lucky Dog screenshots for design critique.

**Steps:**
1. Go to **[aistudio.google.com](https://aistudio.google.com)**
2. Sign in with your Google account
3. Click "Get API key" in the top-right
4. Click "Create API key" in a new project (or existing project)
5. Copy the key — starts with `AI...`
6. Save it

**Test:** Easiest via Google AI Studio's web UI itself — just paste a screenshot and ask Gemini to describe it. Confirms your account works before wiring the API key.

---

### 4. DeepSeek — 5M free signup tokens, then very cheap (5 min)

**Why:** Best $/quality ratio in the LLM market. DeepSeek-Coder is state-of-the-art for code tasks. After free trial: $0.14/M input, $0.28/M output. You'd spend ~$5/month for serious agentic use.

**What you'll use it for:** Code generation in loops, fallback Executor when free tiers are exhausted, DeepClaude proxy later (Codex routing).

**Steps:**
1. Go to **[platform.deepseek.com](https://platform.deepseek.com)**
2. Sign up with email
3. Verify email
4. Navigate to API Keys
5. Generate a key — starts with `sk-...`
6. You automatically get 5M tokens free for 30 days
7. **Important:** DO NOT add a payment method yet. Use the free trial, evaluate in 30 days.

**Test:**
```powershell
curl -X POST https://api.deepseek.com/v1/chat/completions `
  -H "Authorization: Bearer YOUR_KEY" `
  -H "Content-Type: application/json" `
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"say hi"}]}'
```

---

### 5. Ollama — local models on your RTX 5070 (10 min)

**Why:** Run real LLMs locally for free, forever. Private (nothing leaves your machine). No rate limits. Good for sensitive work or when free APIs are exhausted.

**What you'll use it for:** Private/sensitive workflows, ad-hoc experimentation, fallback when everything else is rate-limited.

**Steps:**
1. Download Ollama for Windows: **[ollama.com/download](https://ollama.com/download)**
2. Run the installer — installs as a Windows service
3. Open a new PowerShell terminal (Ollama auto-starts on install)
4. Pull a model:
   ```powershell
   ollama pull qwen2.5:14b
   ```
   (~8 GB download, takes 5-15 min depending on connection)
5. Optional: also pull a code-specific model:
   ```powershell
   ollama pull deepseek-coder-v2:16b
   ```
   (~9 GB)
6. Test:
   ```powershell
   ollama run qwen2.5:14b "say hi"
   ```

Ollama runs at `http://localhost:11434` by default.

---

### 6. GitHub Student Developer Pack — if not already claimed (10 min)

**This is HUGE value.** As a student you get:

| Benefit | Value |
|---|---|
| **GitHub Copilot Pro Free** | $10/mo value — premium code completion in VS Code |
| **DigitalOcean $200 credits** | Run servers / cloud workloads for ~6-12 months free |
| **Microsoft Azure credits** | Cloud access without credit card |
| **MongoDB Atlas credits** | Free managed database |
| **JetBrains IDEs free** | IntelliJ, PyCharm, etc. ($249/yr value) |
| **GitHub Codespaces hours** | Cloud dev environments |
| **Notion Personal Pro** | Free upgrade to paid tier |
| **Figma Education** | Premium features unlocked |
| **Bootstrap Studio / Domain.com / Heroku credits** | Various extras |

**Steps:**
1. Go to **[education.github.com/pack](https://education.github.com/pack)**
2. Click "Get the Pack" / "Sign up for Student Developer Pack"
3. Verify with:
   - Your school-issued email (`.edu` or international equivalent), OR
   - Proof of enrollment document (student ID, transcript, schedule)
4. Wait for approval (usually instant if school email, 1-3 days for document proof)
5. Once approved, redeem each benefit individually from the pack page

**Highest-priority redemptions to do immediately:**
- **GitHub Copilot Pro Free** — enable in VS Code, gives you premium code completion daily
- **JetBrains IDE** — if you ever use IntelliJ/PyCharm/WebStorm, this is $249/yr free
- **DigitalOcean $200** — useful for any future hosting needs

---

## Bonus: Social media scraping options (deep research findings)

**Honest 2026 truth on X/Twitter:** the free-API era is gone. Nitter is dead (public instances shut down). Twscrape works but is fragile (requires account pool maintenance). Here's the real landscape:

### Free / strict-budget X scraping

| Method | Cost | Reliability | Effort |
|---|---|---|---|
| **ExA semantic search via X queries** | Free (already in your stack) | Medium — finds public tweets via search, not real-time | Zero (already wired) |
| **twscrape** (Python lib) | Free | Low — breaks every 2-4 weeks when X changes things | High — manage account pool, restart often |
| **Apify Twitter Scraper Actor** | $5 free monthly credit on free plan | Medium-high | Low — managed service |
| **Nitter self-hosted** | Free if you can keep it running | Very low in 2026 — X blocks guest tokens | High |

### Ultra-cheap X options (worth it for ~$5/mo)

| Service | Pricing | Notes |
|---|---|---|
| **TwitterAPI.io** | **100K free credits on signup**, then $0.15/1K tweets | Widely considered best unofficial API in 2026. Worth signing up — the free credits alone cover months of personal use. |
| **Bright Data Twitter Scraper** | Free tier exists | More enterprise-y, less personal-friendly |
| **socialdata.tools** | $0.0002/tweet (~$0.20 for 1000 tweets) | Ultra-cheap |

### Other social media (genuinely free)

| Source | Method | Status |
|---|---|---|
| **Reddit** | Reddit's official API — free, 1000 calls/day, 60/min | Wire as MCP or direct HTTP. Works great. |
| **Reddit (deeper)** | Scrape `old.reddit.com` via Firecrawl | Free. Already in your stack. |
| **YouTube** | YouTube Data API v3 free tier (10K req/day) | Sign up at Google Cloud Console. Generous. |
| **YouTube (deep)** | `yt-dlp` (already powering your `/watch` skill) | Free. Already in your stack. |
| **YouTube (channel monitoring)** | Channel RSS feeds at `youtube.com/feeds/videos.xml?channel_id=X` | Free. No auth. Just hit the URL. |
| **HackerNews** | Algolia HN API | Completely free, no auth. Already in your stack via Firecrawl + ExA. |
| **GitHub** | GitHub API (authenticated 5K req/hour) | Free. Already wired via `github` MCP. |
| **ArXiv** | ArXiv API + RSS feeds | Free, generous. |
| **Most public websites** | Firecrawl + ExA | Free tiers, already in your stack. |

### Sauron's actual scrape strategy (the cheap+free path)

1. **Trading news**: Bloomberg/FT/Reuters via **Firecrawl** (already wired) → free
2. **AI news**: HN Algolia API + ArXiv RSS + r/LocalLLaMA via **ExA + Firecrawl** → free
3. **YouTube monitoring**: Channel RSS feeds for Jack Roberts, Cole Medin, Nate Herk → free
4. **Twitter sentiment**: **TwitterAPI.io 100K free credits** → free for first ~3-6 months
5. **Reddit deep dive**: Reddit API (free 1000/day) → free
6. **Competitive intel**: Public dashboards via Firecrawl → free

**Total monthly cost for Sauron's full scope: $0 for the first 3-6 months, then maybe $5-10/mo if TwitterAPI.io credits run out (which they won't at personal-use volume).**

---

## After signing up — what to do with the keys

### Store keys in `.env.local`

Create `dashboard/.env.local` (gitignored — never commits):
```
# Free providers
GROQ_API_KEY=gsk_xxx
CEREBRAS_API_KEY=csk-xxx
GEMINI_API_KEY=AI_xxx
DEEPSEEK_API_KEY=sk-xxx
OLLAMA_HOST=http://localhost:11434

# Optional — when you want X scraping
TWITTERAPI_IO_KEY=ta-xxx
```

### Send me the keys when ready

Once you have them, paste them into chat — I'll wire up the loop scripts properly and confirm each provider responds. Then we run a test scan to verify everything's working before the first cron fires.

**Security note:** Don't commit `.env.local` to git. The `.gitignore` should already exclude it (Codex set this up during Slice 1).

---

## Recommended order to actually do this

1. **Right now (5 min):** Groq signup — fastest setup, biggest immediate utility
2. **Right now (5 min):** Cerebras signup — gives you the biggest free token allowance
3. **Right now (5 min):** Gemini signup — multimodal everything
4. **Today (10 min):** Ollama install — local fallback, no API needed
5. **Today (10 min):** GitHub Student Pack — if you haven't claimed it
6. **Within a week (5 min):** DeepSeek signup — use the 5M trial tokens to test before deciding
7. **Optional (when needed):** TwitterAPI.io for X scraping

Total: ~45 minutes if you do it in one sitting. Permanent capability for ~$0/month after that.

---

## Skeleton scripts I'm shipping alongside this

While you sign up, I'll write:
1. **`dashboard/scripts/loops/lib/router.js`** — the multi-provider routing skeleton
2. **`dashboard/scripts/loops/nightly-surveillance.js`** — Loop 5 (Sauron's watch) skeleton

Both will be stubbed but runnable — fill in the API keys and they work.

When you have all the keys, paste them and I'll wire the final connections.
