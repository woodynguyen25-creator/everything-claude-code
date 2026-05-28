# Hermes Agent Deployment — Session State 2026-05-26
> The actual Hermes Agent (NousResearch, 168K★) is now live on your $6 DigitalOcean Droplet, replacing the homemade cron daemon and the PC-side `bot.js` Telegram bridge.

---

## What's running RIGHT NOW

### On the Droplet (`100.78.199.123` Tailscale, `142.93.12.177` public)

**Hermes Agent v0.14.0** — Python 3.11, installed at `/home/hermes/.hermes/`
- Installed via `curl -fsSL .../install.sh | bash --skip-browser` (no Chromium = saved ~500MB + faster install)
- 168K-star self-improving agent platform from Nous Research
- MIT licensed, fully open source

**Hermes Agent Gateway** — systemd user service `hermes-gateway.service`
- Status: `active (running)`, enabled on boot
- PID 23900, 133 MB RAM (well within 961MB total)
- Survives Droplet reboots via `loginctl enable-linger hermes`
- Listening on Telegram with your existing bot `@LeBotJamesAiosBot`
- Default model: `gemini/gemini-2.0-flash` (free tier — preserves your Claude Max minutes)

**Identity loaded** (`/home/hermes/.hermes/SOUL.md`)
- 159 lines covering: who you are, your goals, current life situation, trading style, finances, philosophy, council structure, scheduled jobs
- Persona: LeBot James, the All-Father
- Tone rules: direct, push back when warranted, no sycophancy

**Operations env** (`/home/hermes/.hermes/.env`, mode 600)
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALLOWED_USERS=2019823847`
- All API keys (Groq, Gemini, Cerebras, DeepSeek, Obsidian)
- `HERMES_TOKEN` (legacy from old daemon — harmless)

### Retired this session
- ❌ Old `hermes-server.js` cron daemon — `pm2 delete hermes` (replaced by Hermes Agent's built-in scheduler)
- ❌ PC `bot.js` Telegram poller — killed PID 8980 (replaced by Hermes Agent gateway)

---

## What's available but NOT yet started

Hermes Agent ships with way more than the gateway. These are sitting idle, ready to flip on:

| Subcommand | What it does | When to start |
|---|---|---|
| `hermes dashboard --host 100.78.199.123 --port 9119 --insecure` | Full web UI on the Droplet for managing config, sessions, kanban, skills | After you confirm Telegram works |
| `hermes kanban daemon` | Background worker that picks up tasks from the durable SQLite kanban board | When you start using `/goal` workflows |
| `hermes proxy start` | OAuth-authenticated OpenAI-compatible proxy (lets external apps call Anthropic/SuperGrok/Copilot via Hermes auth) | When you want apps that don't natively support OAuth providers |
| `hermes acp` | Agent Communication Protocol server for VS Code / Zed / JetBrains integration | When you want Hermes inside your IDE alongside Claude Code |
| `hermes cron add` | Native cron scheduling — replaces our retired Hermes-Cron daemon | When you migrate the morning-brief / close-ritual jobs into Hermes Agent |
| `hermes webhook` | Inbound webhook receiver (GitHub, n8n, IFTTT, etc.) | When you want external triggers |
| `hermes claw import` | OpenClaw migration tool — imports settings/memories/skills from OpenClaw if you ever used it | One-time, if relevant |

---

## How to talk to it

### From Telegram (right now)
Open Telegram on your phone, find **@LeBotJamesAiosBot**, send any message:
```
hello
what should I focus on today?
plan my week given internship hunt + classes
```
- Default model is Gemini Flash — fast and free
- Persona is loaded from SOUL.md so it knows you're Woody
- 24/7 from anywhere — PC can be off

### From the Droplet CLI (when you SSH in)
```bash
ssh root@142.93.12.177
sudo -u hermes /home/hermes/.local/bin/hermes
```
Interactive TUI opens. Has slash commands: `/help`, `/new`, `/model`, `/personality`, `/goal`, `/compress`, `/usage`, `/insights`.

### From the dashboard `/hermes` page
Currently the dashboard polls the old `:3001` endpoint which is dead. Two options for next session:
1. Point dashboard at Hermes Agent's REST API (it has one — `/v1/chat/completions`)
2. Or: just embed Hermes' built-in dashboard via iframe at `http://100.78.199.123:9119`

---

## Migration map (old → new)

| Old (now retired) | New (Hermes Agent) | Notes |
|---|---|---|
| `bot.js` on PC | `hermes-gateway.service` on Droplet | Same Telegram token, 24/7, full persona |
| `hermes-server.js` cron on Droplet | `hermes cron` subcommand (built-in) | Native; reads jobs from `~/.hermes/cron/` |
| `/api/chat/lebot-james` dashboard route | Hermes Agent's `/v1/chat/completions` | OpenAI-compatible; can swap models with `/model` |
| `hermes-server-running` PM2 process | systemd user service | More robust, restarts on crash, persists across reboot |
| Direct Claude CLI calls (burns Max minutes) | Configurable per-message (Gemini default) | Saves Max budget; switch to Claude when you actually need it via `/model anthropic/claude-sonnet-4-6` |

---

## Next steps (priority order)

### 1. **You: test Telegram** (2 min)
Send a message to @LeBotJamesAiosBot. Should respond within ~5-15s via Gemini Flash. Reply here with what it said.

### 2. Migrate scheduled jobs to Hermes Agent's native cron (30 min next session)
The morning-brief, close-ritual, weekly-summary, obsidian-sync jobs from our old `hermes-jobs.json` need to be re-registered via `hermes cron add`. This unifies everything under Hermes Agent's own scheduler.

### 3. Start Hermes Agent's web UI + embed in our dashboard (45 min next session)
```bash
sudo -u hermes /home/hermes/.local/bin/hermes dashboard \
  --host 100.78.199.123 --port 9119 --insecure --no-open --skip-build
```
Then add an iframe / "Open Hermes UI" button to our dashboard's `/hermes` route.

### 4. Wire dashboard `/api/chat/lebot-james` to optionally route through Hermes Agent (30 min)
This way the Norse dashboard chat surface can use Gemini Flash by default (free) and only fall through to Claude when you ask for deep reasoning.

### 5. Move PC-side ops scripts (morning-brief, etc.) to the Droplet (~1 hr)
Right now those scripts call Obsidian REST API at `localhost:27123` (PC). On the Droplet we'd call PC's Tailscale IP `100.69.115.98:27123` instead. Then they run truly server-side.

---

## Operator commands cheat sheet

```bash
# SSH in
ssh root@142.93.12.177

# Switch to hermes user
sudo -u hermes -i

# Hermes Agent CLI
hermes                          # Start TUI
hermes status                   # Overall status report
hermes doctor                   # Diagnostics

# Gateway control
hermes gateway status           # Is Telegram alive?
hermes gateway restart          # Restart the gateway
systemctl --user status hermes-gateway      # Lower-level systemd status
journalctl --user -u hermes-gateway -f      # Live logs

# Model switching
hermes model                    # List configured models
hermes model anthropic/claude-sonnet-4-6    # Switch default (if API key configured)

# Memory + skills (Hermes Agent will auto-populate these as you use it)
ls ~/.hermes/memories/
ls ~/.hermes/skills/
cat ~/.hermes/MEMORY.md
cat ~/.hermes/USER.md           # Hermes' evolving model of you

# Kanban
hermes kanban init              # Initialize the durable task board
hermes kanban boards            # List boards

# Cron (native scheduling)
hermes cron list                # List scheduled jobs
hermes cron add ...             # Add a new job
```

---

## Risk register

| Risk | Mitigation |
|---|---|
| Hermes Agent v0.14 has bugs | systemd auto-restarts on crash; logs in journalctl |
| Gemini API rate limit | Fallback chain: Gemini → Cerebras → Groq via `hermes model` |
| Token leaks if `--insecure` ever exposed publicly | Bound to Tailscale IP specifically; UFW blocks 9119/3001 from public |
| Memory pressure on 1GB box | 2GB swap already added; Hermes at 133MB has headroom |
| Telegram polling lock conflicts | Only one bot instance allowed per token; we explicitly stopped PC bot |
| You forget the SSH key | Backed up in `Command Center/AIOS/ssh-keys.md` |

---

## Files added this session

| File | Purpose |
|---|---|
| `/home/hermes/.hermes/SOUL.md` | Hermes Agent persona + Woody context (159 lines) |
| `/home/hermes/.hermes/.env` | Merged env with Telegram token + model API keys |
| `/home/hermes/.hermes/config.yaml` | Default model + Telegram platform enabled |
| `/home/hermes/.config/systemd/user/hermes-gateway.service` | systemd unit |
| `dashboard/hetzner/hermes-soul.md` | Master copy of SOUL.md (push to Droplet on changes) |
| `dashboard/hetzner/HERMES-AGENT-DEPLOYED.md` | This document |

---

*Deployed by Claude (Sonnet) on 2026-05-26 during AIOS hub session.*
