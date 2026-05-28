# Hermes Ops Cheatsheet — Quick Reference
> Everything you need to operate, debug, or extend the Hermes Agent + ECC bridge stack.

---

## How to chat with Hermes RIGHT NOW

### Three ways

1. **Telegram (anywhere, AFK)** — message `@LeBotJamesAiosBot`
2. **Dashboard `/hermes` page** — http://127.0.0.1:3737/hermes (embedded Hermes web UI)
3. **Direct CLI on the Droplet** — `ssh root@142.93.12.177` then `sudo -u hermes /home/hermes/.local/bin/hermes`

All three now route through the ECC bridge to your PC's Claude Code with full 270 skills + 21 MCPs + 47 agents.

---

## Routing modes

| Telegram input | What Hermes does |
|---|---|
| Any plain message | Routes to `ecc/lebot-james` on your PC (default) |
| (future) `/thor your prompt` | Routes to `ecc/thor` |
| (future) message with "+triad" suffix | Fires God Mode interrogator + triad flow on PC |

> Slash routing isn't auto-wired yet — Hermes routes everything to `lebot-james` by default until we add a router skill. Phase B work.

---

## Common operations

```bash
# SSH in
ssh root@142.93.12.177

# As hermes user
sudo -u hermes -i

# Hermes status
hermes gateway status
systemctl --user status hermes-gateway

# Live tail logs
sudo -u hermes XDG_RUNTIME_DIR=/run/user/$(id -u hermes) journalctl --user -u hermes-gateway -f

# Restart gateway (after config changes)
sudo -u hermes XDG_RUNTIME_DIR=/run/user/$(id -u hermes) systemctl --user restart hermes-gateway

# Restart web UI
pkill -f "hermes dashboard" ; sudo -u hermes nohup /home/hermes/.local/bin/hermes dashboard --host 100.78.199.123 --port 9119 --insecure --no-open --tui > /home/hermes/dashboard.log 2>&1 &

# Switch default model on the fly (if you want to override to use Gemini for casual chat)
# Edit /home/hermes/.hermes/config.yaml, change model.default and model.provider, then restart gateway

# View Hermes' auth credentials
hermes auth list

# Hermes doctor — full diagnostics
hermes doctor
```

---

## Troubleshooting

### Telegram says "Provider authentication failed"
1. Compare tokens both sides:
   ```bash
   # PC
   grep ECC_BRIDGE_TOKEN "c:/Github Repos/everything-claude-code/dashboard/.env.local"
   # Droplet
   ssh root@142.93.12.177 "sudo -u hermes grep -E 'OPENAI_API_KEY|ECC_BRIDGE_TOKEN' /home/hermes/.hermes/.env"
   ```
2. They must match character-for-character. If not, regenerate with `openssl rand -hex 24` and sync.
3. After updating, restart BOTH the dashboard (`npm run dev`) AND the gateway (`systemctl --user restart hermes-gateway`).

### Telegram says "model provider failed" or "HTTP 404"
- Bad model name in config.yaml. Check `model.default` — for ECC bridge it must be `ecc/lebot-james` (or other agent). For Gemini, just `gemini-2.5-flash` (no prefix).

### Bot doesn't respond at all
1. Is the gateway running? `systemctl --user is-active hermes-gateway` → should say `active`
2. Is the Tailscale proxy alive on PC? `Test-NetConnection 100.69.115.98 -Port 3738` from PowerShell should succeed
3. Is the dashboard up? `curl http://127.0.0.1:3737/api/hermes` should return 200
4. Was Hermes given the Telegram bot token? Check `/home/hermes/.hermes/.env` for `TELEGRAM_BOT_TOKEN`

### "SOUL.md blocked: role_hijack"
The persona file used too many imperative "you are X" statements. Use the v2 version at `dashboard/hetzner/hermes-soul.md` which uses third-person framing.

### Memory tool error "Unknown action 'list'"
That's a model hiccup — Hermes Agent's memory tool only supports `add`/`replace`/`remove`, but the model tried `list`. Will self-correct over more uses. Not critical.

---

## The 4 critical addresses

| What | Address | Notes |
|---|---|---|
| Droplet public IP | `142.93.12.177` | Only port 22 (SSH) exposed |
| Droplet Tailscale | `100.78.199.123` | Hermes gateway, web UI, MCP |
| PC Tailscale | `100.69.115.98` | Tailscale proxy → dashboard |
| PC dashboard | `127.0.0.1:3737` | localhost-bound only |

---

## Files of interest

| File | What |
|---|---|
| `dashboard/hetzner/hermes-soul.md` | Master SOUL.md (push to Droplet on edits) |
| `dashboard/hetzner/HERMES-AGENT-DEPLOYED.md` | Full deployment history |
| `dashboard/hetzner/ECC-BRIDGE-ARCHITECTURE.md` | Architecture spec for the bridge |
| `dashboard/hetzner/HERMES-OPS-CHEATSHEET.md` | This file |
| `dashboard/app/api/openai/v1/chat/completions/route.ts` | OpenAI-compatible wrapper |
| `dashboard/scripts/tailscale-proxy.js` | PC-side proxy `100.69.115.98:3738` → `127.0.0.1:3737` |
| `/home/hermes/.hermes/SOUL.md` (on Droplet) | Live persona file |
| `/home/hermes/.hermes/USER.md` (on Droplet) | Live user model |
| `/home/hermes/.hermes/config.yaml` (on Droplet) | Live config |
| `/home/hermes/.hermes/.env` (on Droplet) | Secrets — DO NOT commit |

---

## What's persistent (survives reboots)

- ✅ Hermes Agent gateway — systemd user service, `loginctl enable-linger hermes` is on
- ✅ Hermes Agent web UI — currently nohup'd, will die on Droplet reboot. **TODO:** make it a systemd service.
- ❌ Tailscale proxy on PC — currently nohup'd, will die on PC reboot or PowerShell close. **TODO:** Windows Scheduled Task.
- ❌ Dashboard — must be manually started after PC reboot via `cd dashboard && npm run dev`. **TODO:** Task Scheduler entry.

---

## Cost picture (current)

| Service | Monthly | Notes |
|---|---|---|
| Hetzner Droplet CX22 | $4.15 | 2 vCPU ARM, 4GB RAM, 40GB SSD |
| Daily backups | $0.83 | 20% of droplet |
| Tailscale | $0 | Free tier (3 devices) |
| Gemini API (Hermes fallback) | $0 | Free tier covers casual chat |
| Claude Max (your subscription) | $100→$20 soon | Used when bridge calls into ECC |
| **Total infra** | **$4.98/mo** | (not counting your existing Claude Max) |

---

*Updated 2026-05-26.*
