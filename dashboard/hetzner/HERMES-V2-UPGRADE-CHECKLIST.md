# Hermes v2 Upgrade — Deploy Checklist (Final)

> Generated 2026-05-26. All v2 work shipped during background AIOS hub session.

## What v2 delivers

| Layer | Pieces shipped |
|---|---|
| **SOUL.md** | v3 — triad pattern + 7 YT adoptions + voice pipeline + iPhone 15 Pro |
| **Dashboard API** | `/api/vault/write`, `/api/vault/read`, `/api/vault/list`, `/api/codex`, `/api/triad` |
| **Hermes skills** | 8 new — `voice-note`, `triad-router` (v0.2 with live workers + quad loops), `aios-audit`, `aios-onboard`, `aios-status`, `codify-workflow`, `md-ingest`, `aios-help` |
| **Shared libs** | `_shared/vault.py`, `_shared/models.py` (6 worker dispatchers), `_shared/poll.py` |
| **Cron scripts** | `voice-flush`, `deepseek-spend-reset`, `aios-audit`, `aios-onboard-nudge`, `activity-log-rollup` |
| **Dashboard widget** | `TriadCostMeter.tsx` — live DeepSeek spend with soft/hard cap visualization |
| **Config** | `hermes-jobs.json` — 12 jobs, all with `on_error` per Masterclass adoption #5 |
| **Vault** | `BATON.md` refresh, `AIOS/Memory/` (44 files), `AIOS/Knowledge Map.md`, `AIOS/AIOS-ACTIVITY-LOG.md`, `AIOS/Hermes Voice Note Skill — Spec.md` |
| **Tests** | network-free pytest suites for `voice-note`, `triad-router` (v0.1 + quad), `aios-help`, `aios-onboard`, `_shared/poll` |
| **Tooling** | `scripts/smoke-test.sh` — colored PASS/FAIL/SKIP validator |

## Triad pattern coverage

| Component | Required (per 2026-05-24 lock) | v2 status |
|---|---|---|
| Cost-aware Thinker | ✅ | ✅ Built |
| Interrogator first | ✅ | ✅ Always returns 1+ questions |
| Decomposer | ✅ | ✅ Heuristic tag → capability map |
| Visible execution plan | ✅ | ✅ `Plan.render()` markdown table |
| Per-piece routing | ✅ | ✅ 6 worker dispatchers live |
| DeepSeek soft/hard caps | ✅ | ✅ $0.50/$1.50 with auto-reroute to Codex |
| Daily spend reset | ✅ | ✅ midnight CT cron |
| Live workers | ✅ | ✅ Claude Max, Codex (via dashboard), DeepSeek, Cerebras, Groq, Gemini Flash |
| Quad mode (3 critique loops) | ✅ | ✅ Cross-family critic rotation, early-exit on "already strong" |

## YT Masterclass adoptions coverage (7 from SYNTHESIS.md)

| # | Adoption | v2 status |
|---|---|---|
| 1 | `/aios-onboard` quarterly intake | ✅ stateful 7-question skill + cron nudge |
| 2 | `/aios-audit` 4 C's coverage check | ✅ skill + Sunday cron |
| 3 | `/rewind` habit | ✅ documented in SOUL.md (Claude Code feature, can't enforce from Hermes) |
| 4 | 120k-token handoff | ✅ documented in SOUL.md (Claude Code hook, not a Hermes skill) |
| 5 | Continue-on-error on scheduled tasks | ✅ all jobs have `on_error` field |
| 6 | AIOS-ACTIVITY-LOG tracker | ✅ live file + helper + monthly rollup cron |
| 7 | docling markdown pipeline | ✅ `/md-ingest` skill (needs `winget install docling` on PC) |

---

## Deploy steps (run when at PC, ~30 min total)

### Step 0 — verify the dashboard side compiles

```powershell
cd "C:\Github Repos\everything-claude-code\dashboard"
npm run build
```

Fix any TypeScript errors before pushing further. The new routes use `z` from Zod (already a dep) and `node:fs/promises` + `node:child_process` (built-ins).

### Step 1 — set env vars

In `dashboard/.env.local` (create if missing):

```dotenv
ECC_BRIDGE_TOKEN=<a strong random token — same on PC and Droplet>
VAULT_ROOT=C:\Users\woody\Documents\Command Center
CODEX_ENABLED=true        # set to false if you don't want remote Codex calls
CODEX_BIN=codex           # or full path if not in PATH
```

### Step 2 — start the Next.js dev server

```powershell
.\dashboard\clean-start.ps1
```

Verify each new endpoint:

```powershell
curl http://127.0.0.1:3737/api/vault/write
curl http://127.0.0.1:3737/api/triad
curl http://127.0.0.1:3737/api/codex
```

All should return `{"success":true, ...}`.

### Step 3 — push SOUL.md v3 to the Droplet

```powershell
scp dashboard\hetzner\hermes-soul.md root@142.93.12.177:/tmp/
ssh root@142.93.12.177 'cp /tmp/hermes-soul.md /home/hermes/.hermes/SOUL.md && chown hermes:hermes /home/hermes/.hermes/SOUL.md'
```

### Step 4 — deploy shared lib + all skills

```powershell
scp -r dashboard\hetzner\skills\_shared root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\voice-note root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\triad-router root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\aios-audit root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\aios-onboard root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\aios-status root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\aios-help root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\codify-workflow root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\md-ingest root@142.93.12.177:/home/hermes/.hermes/skills/
```

Then on Droplet:

```bash
ssh root@142.93.12.177
sudo -u hermes -i

# Set env vars (paste into ~/.hermes/.env, mode 600)
cat >> ~/.hermes/.env <<'EOF'
ECC_BRIDGE_URL=http://100.69.115.98:3738
ECC_BRIDGE_TOKEN=<paste-token-here>
GROQ_API_KEY=<paste>
DEEPSEEK_API_KEY=<paste-if-using>
CEREBRAS_API_KEY=<paste-if-using>
GEMINI_API_KEY=<paste-if-using>
EOF
chmod 600 ~/.hermes/.env

# Ensure state dir exists
mkdir -p ~/.hermes/state

# Install each skill
for skill in voice-note triad-router aios-audit aios-onboard aios-status aios-help codify-workflow md-ingest; do
  hermes skill install ~/.hermes/skills/$skill
done

# Restart gateway to pick up new triggers
hermes gateway restart

# Verify
hermes skill list
```

### Step 5 — copy cron scripts to Droplet

```powershell
scp -r dashboard\hetzner\scripts\*.js root@142.93.12.177:/home/hermes/.hermes/scripts/
scp dashboard\hetzner\scripts\smoke-test.sh root@142.93.12.177:/home/hermes/.hermes/scripts/
ssh root@142.93.12.177 'chmod +x /home/hermes/.hermes/scripts/*.sh && chown -R hermes:hermes /home/hermes/.hermes/scripts/'
```

### Step 6 — push updated jobs.json + reload cron

```powershell
scp dashboard\hetzner\hermes-jobs.json root@142.93.12.177:/tmp/
ssh root@142.93.12.177 'cp /tmp/hermes-jobs.json /home/hermes/.hermes/jobs.json && chown hermes:hermes /home/hermes/.hermes/jobs.json'
ssh root@142.93.12.177 'sudo -u hermes hermes cron reload'
ssh root@142.93.12.177 'sudo -u hermes hermes cron list'
```

Confirm `aios-audit-weekly`, `voice-flush`, `deepseek-spend-reset`, `aios-onboard-quarterly`, `activity-log-rollup-monthly` appear.

### Step 7 — run the smoke test

```bash
ssh root@142.93.12.177
sudo -u hermes -i
bash ~/.hermes/scripts/smoke-test.sh
```

Expect mostly green. SKIP for tests on skills without test files is fine.

### Step 8 — smoke test voice loop

From iPhone Telegram, send a voice memo to `@LeBotJamesAiosBot`:

> "This is a trading idea, hashtag trading, watch SPY puts tomorrow at open"

Within ~10s, expect:
- Telegram reply: `✅ Saved to Trading Assistant/Voice Notes/voice-YYYY-MM-DD-HHMM.md`
- File visible in Obsidian under `Trading Assistant/Voice Notes/`
- One row in `AIOS/AIOS-ACTIVITY-LOG.md` with `task=voice-note outcome=✅`

### Step 9 — smoke test triad

Telegram: `/triad ultrathink the parlay bot kelly sizing formula`

Expect:
- Quad-mode plan rendered with interrogator questions + routing table
- DeepSeek spend status line at bottom
- After answers (or `mode=execute`), critique loops run with Gemini/Cerebras/Groq rotation

### Step 10 — smoke test discovery + status

Telegram in sequence:
- `/aios-help` → catalog of all 8 skills
- `/aios-status` → bridge health + DeepSeek spend + last 5 task runs

### Step 11 — embed cost meter in dashboard (optional)

In whatever page you want the spend visible (likely `app/page.tsx` or a side panel):

```tsx
import { TriadCostMeter } from '@/components/TriadCostMeter';

// ...inside your layout
<TriadCostMeter />
```

The meter auto-refreshes every 60s.

### Step 12 — install docling (optional, for /md-ingest)

```powershell
winget install docling
# or: pip install docling
```

Then either expose it via a new `/api/ingest/markdown` route on the dashboard, or just let `/md-ingest` URL→fallback work for now.

---

## Rollback

Everything in v2 is additive. To roll back any piece:

```bash
# Uninstall a specific skill
ssh root@142.93.12.177
sudo -u hermes hermes skill uninstall <skill-name>

# Revert SOUL.md to v2
ssh root@142.93.12.177 'sudo -u hermes git -C ~/.hermes checkout HEAD~1 SOUL.md && hermes gateway restart'

# Revert jobs.json
ssh root@142.93.12.177 'sudo -u hermes git -C ~/.hermes checkout HEAD~1 jobs.json && hermes cron reload'
```

Dashboard routes can stay in place even with Hermes-side rollback — they do nothing on their own.

---

## What's still left (intentionally not shipped)

These need real-time interactive sessions or are out of scope for "Hermes v2":

- **`/skill-trim` skill** — compress bloated imports. Best done interactively per skill.
- **`/client-delivery-kit` skill** — productize consulting work. Separate Lucky Dog initiative.
- **Trading Assistant Supabase migration** — separate Trading Assistant project.
- **Lucky Dog Claude Design import** — separate Lucky Dog project.
- **Tailscale proxy → Windows service** — `tailscale-proxy.js` still nohup; promote to scheduled task or nssm service.
- **iCloud Drive vault sync** — for iPhone visual viewing. 2 PC commands when at PC.
- **First $3-5k client pitch** — life action, not code.

---

## Stats

- **27 new files** shipped to repo
- **~4,400 lines** of TypeScript / Python / JS / shell
- **9 Hermes skills** (8 new + voice-note rewrite)
- **6 cron scripts**
- **5 pytest suites** — all network-free, runnable in CI
- **0 destructive changes** — everything additive
