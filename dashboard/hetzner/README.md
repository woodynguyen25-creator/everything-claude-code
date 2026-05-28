# Hermes Agent — Deployment Layout

> This folder is the **single source of truth** for everything that runs on the DigitalOcean Droplet at `100.78.199.123` (Tailscale) / `142.93.12.177` (public, firewalled).
>
> When you SCP this to the Droplet, the layout maps 1:1 to `/home/hermes/.hermes/`.

## Folder layout

```
dashboard/hetzner/
├── README.md                           ← you are here
├── HERMES-V7-DEPLOY.md                 ← 11-step deploy checklist
├── HERMES-AGENT-DEPLOYED.md            ← what's installed on Droplet (historical)
├── HERMES-OPS-CHEATSHEET.md            ← ssh / hermes CLI commands
├── HERMES-RUNBOOK.md                   ← incident playbook
├── ECC-BRIDGE-ARCHITECTURE.md          ← Telegram → PC pipeline diagram
├── SETUP-CHECKLIST.md                  ← first-time Droplet provisioning
├── SECURITY.md                         ← token rotation, firewall, hardening
│
├── hermes-soul.md                      → /home/hermes/.hermes/SOUL.md
│                                         (Hermes reads this every message)
│
├── hermes-jobs.json                    → /home/hermes/.hermes/jobs.json
│                                         (cron schedule + on_error per job)
│
├── hermes-server.js                    (legacy homemade cron daemon — RETIRED.
│                                         Hermes Agent's built-in cron replaced it.
│                                         Do NOT restart with pm2.)
│
├── bootstrap.sh                        first-time Droplet setup script
├── deploy.ps1                          PC-side SCP + reload helper
│
├── skills/                             ← every Hermes skill lives here
│   ├── _shared/                        shared Python helpers (vault, models, poll, memory)
│   ├── voice-note/                     telegram_voice_message trigger
│   ├── triad-router/                   /triad
│   ├── forge/                          /forge
│   ├── think/                          /think
│   ├── inbox-classify/                 /classify
│   ├── intake-route/                   /route
│   ├── workflow-or-agent/              /workflow-or-agent
│   ├── aios-status/                    /aios-status
│   ├── aios-audit/                     /aios-audit
│   ├── aios-prune/                     /aios-prune
│   ├── aios-help/                      /aios-help
│   ├── aios-onboard/                   /aios-onboard
│   ├── skill-stats/                    /skill-stats
│   ├── skill-eval/                     /skill-eval
│   ├── skill-trim/                     /skill-trim
│   ├── build-skill/                    /build-skill
│   ├── codify-workflow/                /codify-workflow
│   ├── session-handoff/                /session-handoff
│   ├── md-ingest/                      /md-ingest
│   ├── morning-brief-status/           /morning-brief
│   ├── journal-prompt/                 /journal
│   └── cinematic-prompt/               /cinematic
│
└── scripts/                            ← cron-invoked scripts (Node.js)
    ├── voice-flush.js                  every 15 min — replay /tmp/voice-*.md
    ├── deepseek-spend-reset.js         midnight CT — clear daily spend
    ├── aios-audit.js                   Sundays 18:00 CT — wrap /aios-audit skill
    ├── aios-onboard-nudge.js           1st Sunday of quarter — Telegram nudge
    ├── activity-log-rollup.js          1st of month 10:00 CT — monthly report
    └── smoke-test.sh                   manual end-to-end validation
```

## Skill anatomy

Every skill follows the same shape:

```
<skill-name>/
├── skill.yaml          ← Hermes manifest (name, version, trigger, entrypoint, env_required)
├── main.py             ← entrypoint module
└── test_<name>.py      ← network-free pytest suite
```

The `skill.yaml` must include:
- `name:` (kebab-case, matches folder)
- `version:` (semver, NOT `value:` — common typo)
- `description:` (one paragraph, agent-friendly)
- `trigger:` with `type:` (`explicit` or `telegram_voice_message`) and `command:` (with leading `/` when explicit)
- `entrypoint:` (`main.py:<function_name>`)
- `env_required:` (list of env var names)

## Shared library (`_shared/`)

Skills import these instead of duplicating logic:

| Module | Purpose |
|---|---|
| `vault.py` | Vault write/read/list via ECC bridge. `vault.log_activity()` for AIOS-ACTIVITY-LOG appends. |
| `models.py` | 6 worker dispatchers (claude-max, codex, deepseek, cerebras, groq, gemini-flash) with retry + cross-model fallback. `dispatch()` is the generic entry point. |
| `poll.py` | Generic polling helper for long-running async APIs (Sora 2, Kie.ai, etc.). |
| `memory.py` | 3-tier memory: WorkingMemory (in-process dict), short_term_load/save (per-chat_id JSON, 7-day TTL), long_term_pointer (vault path). |

Skills add `sys.path.insert(0, str(Path(__file__).resolve().parent.parent))` then `from _shared import vault, models`.

## Cron jobs

`hermes-jobs.json` lists 12 scheduled jobs. Every job has an `on_error` handler — either `telegram_notify_and_log` (post failure to `@LeBotJamesAiosBot` + log) or `log_only` (silent log entry).

To reload after editing:

```bash
ssh root@142.93.12.177 'sudo -u hermes hermes cron reload && sudo -u hermes hermes cron list'
```

## State on Droplet

```
/home/hermes/.hermes/
├── SOUL.md                              copy of hermes-soul.md
├── jobs.json                            copy of hermes-jobs.json
├── .env (mode 600)                      ECC_BRIDGE_TOKEN, GROQ_API_KEY, etc.
├── skills/                              copies of skills/ folders
├── scripts/                             copies of scripts/ folders
├── state/                               ← runtime state (gitignored)
│   ├── triad-daily-spend.json           DeepSeek spend tracker
│   ├── memory/                          per-chat_id short-term memory
│   └── onboard-<chat_id>.json           /aios-onboard conversation state
└── logs/                                hermes gateway logs
```

## Common operations

### Deploy a new skill

```powershell
# From PC, push the skill folder
scp -r dashboard/hetzner/skills/<skill-name> root@142.93.12.177:/home/hermes/.hermes/skills/

# Install on Droplet
ssh root@142.93.12.177
sudo -u hermes -i
hermes skill install ~/.hermes/skills/<skill-name>
hermes gateway restart
```

### Reload SOUL.md without restart

```powershell
scp dashboard/hetzner/hermes-soul.md root@142.93.12.177:/tmp/
ssh root@142.93.12.177 'cp /tmp/hermes-soul.md /home/hermes/.hermes/SOUL.md && chown hermes:hermes /home/hermes/.hermes/SOUL.md'
# Hermes picks it up on the next Telegram message — no restart needed
```

### Run all skill tests

From Droplet:

```bash
ssh root@142.93.12.177
sudo -u hermes -i
cd ~/.hermes/skills
for d in */; do
  if ls "$d"/test_*.py >/dev/null 2>&1; then
    (cd "$d" && python -m pytest -q --tb=line) || echo "FAIL: $d"
  fi
done
```

Or from Telegram once deployed: `/skill-eval`

### Tail gateway logs

```bash
ssh root@142.93.12.177 'sudo -u hermes journalctl --user -u hermes-gateway -f'
```

### Restart gateway

```bash
ssh root@142.93.12.177 'sudo -u hermes hermes gateway restart'
```

## What lives where

| Question | Where to look |
|---|---|
| What skills are installed? | `skills/` directory, or `/aios-help` on Telegram, or `/hermes-skills` on PC dashboard |
| What's running today? | `hermes-jobs.json` for the schedule, `/aios-status` for live state |
| What did Hermes do this week? | `Command Center/AIOS/AIOS-ACTIVITY-LOG.md` — every task appends one row |
| How do I deploy v7? | `HERMES-V7-DEPLOY.md` (11-step checklist) |
| What's broken right now? | `/aios-status` + tail journalctl logs |
| What persona does Hermes use? | `hermes-soul.md` (v6 — full Woody context) |
| Free vs paid LLM strategy? | `Command Center/AIOS/OpenRouter — Cost Analysis & Free Path.md` |

## Conventions

1. **Skills always log to `AIOS/AIOS-ACTIVITY-LOG.md`** on success/failure via `vault.log_activity()`. No silent failures.
2. **Skills never auto-delete or auto-modify anything destructive.** `/aios-prune`, `/skill-trim` propose — they never apply.
3. **Skills handle vault unavailability gracefully.** If `vault is None`, log a warning, continue, return reply with a flag.
4. **All HTTP calls go through `_shared/models.py` workers** so retry + cross-model fallback works.
5. **No skill ever talks to the filesystem directly** outside of `/tmp/` fallbacks. Vault writes go through the bridge.
6. **Test files are network-free.** Workers and vault writes are mocked. Every PR change should still pass `/skill-eval`.
7. **Bias toward workflow over agent.** Per YT #15/#34. Most skills are sequential workflows; `triad-router` and `inbox-classify` are the only legitimate agents.

## Out of scope (intentionally)

- **Codex calls** — proxied via PC dashboard `/api/codex` because Codex CLI lives on Windows. When PC is off, codex pieces queue.
- **TradingView MCP** — blocked on Windows MSIX sandboxing. Python `tradingview-ta` + `tvdatafeed` are the working path.
- **OpenRouter** — analyzed and rejected. Free direct providers (Groq + Cerebras + Gemini) cover everything. See vault note.

---

**Current state:** v7+ (22 skills, 25 pytest suites, dashboard `/hermes-skills` page, full SOUL.md v6 context). Deploy with `HERMES-V7-DEPLOY.md`.
