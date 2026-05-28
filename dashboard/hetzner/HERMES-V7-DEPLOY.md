# Hermes v7 — Full Deploy Checklist

> Last refreshed 2026-05-26. Supersedes `HERMES-V2-UPGRADE-CHECKLIST.md`.
> v7 is the current shipped state across vault, dashboard, and Hermes Agent.

## What v7 includes

| Layer | Pieces |
|---|---|
| **Hermes skills** | 20 (voice-note, triad-router, aios-{audit,onboard,status,help,prune}, build-skill, codify-workflow, md-ingest, session-handoff, skill-trim, skill-eval, morning-brief-status, think, inbox-classify, intake-route, workflow-or-agent, forge, cinematic-prompt) |
| **Shared libs** | 4 (`_shared/{vault,models,poll,memory}.py`) — models has cross-model fallback + retry |
| **Dashboard API routes** | 6 (`/api/vault/{write,read,list}`, `/api/codex`, `/api/triad`, `/api/hermes-skills`) |
| **Dashboard pages** | `/hermes-skills` — visual skill catalog with category groups + test badges |
| **Dashboard widgets** | `TriadCostMeter` + SystemPulseStrip TRIAD cell (Norse OKLCH theme) |
| **Obsidian theme** | `woodys-realm.css` + `woodys-realm-cinema.css` cinema polish layer |
| **Vault notes** | `AIOS/Knowledge Map.md`, `AIOS/AIOS-ACTIVITY-LOG.md`, `AIOS/Memory/_index.md`, `AIOS/Memory/*.md` (44 mirrored), `AIOS/OpenRouter — Cost Analysis & Free Path.md`, BATON.md (refreshed) |
| **Cron scripts** | 5 (voice-flush, deepseek-spend-reset, aios-audit, aios-onboard-nudge, activity-log-rollup) + smoke-test.sh |
| **Tests** | 22 pytest suites — all network-free |
| **Config** | `hermes-jobs.json` v2 with `on_error` per job |
| **SOUL.md** | v5 — full Woody context: projects + state + council + ECC stack + hard rules + triad routing + YT adoptions |

---

## Deploy in 11 steps

### 0. Verify dashboard side compiles

```powershell
cd "C:\Github Repos\everything-claude-code\dashboard"
npx tsc --noEmit -p tsconfig.typecheck.json
# Expect exit 0
npm run build
# Expect successful build
```

### 1. Set env vars on PC

`dashboard/.env.local` (create if missing):

```dotenv
ECC_BRIDGE_TOKEN=<a strong random token — same on PC and Droplet>
VAULT_ROOT=C:\Users\woody\Documents\Command Center
CODEX_ENABLED=true
CODEX_BIN=codex
HERMES_SKILLS_DIR=C:\Github Repos\everything-claude-code\dashboard\hetzner\skills
```

### 2. Start the Next.js dev server

```powershell
.\dashboard\clean-start.ps1
```

Verify new endpoints:

```powershell
curl http://127.0.0.1:3737/api/vault/write
curl http://127.0.0.1:3737/api/triad
curl http://127.0.0.1:3737/api/codex
curl http://127.0.0.1:3737/api/hermes-skills
curl http://127.0.0.1:3737/hermes-skills    # the page
```

All should return `{"success":true, ...}` or HTML.

### 3. Push SOUL.md v5 to Droplet

```powershell
scp dashboard\hetzner\hermes-soul.md root@142.93.12.177:/tmp/
ssh root@142.93.12.177 'cp /tmp/hermes-soul.md /home/hermes/.hermes/SOUL.md && chown hermes:hermes /home/hermes/.hermes/SOUL.md'
# Hermes picks up SOUL changes on next message
```

### 4. Set env vars on Droplet

```bash
ssh root@142.93.12.177
sudo -u hermes -i

# Append to ~/.hermes/.env (mode 600):
cat >> ~/.hermes/.env <<'EOF'
ECC_BRIDGE_URL=http://100.69.115.98:3738
ECC_BRIDGE_TOKEN=<paste-same-token-as-PC>
GROQ_API_KEY=<paste>
DEEPSEEK_API_KEY=<paste-if-using>
CEREBRAS_API_KEY=<paste-if-using>
GEMINI_API_KEY=<paste-if-using>
EOF
chmod 600 ~/.hermes/.env

mkdir -p ~/.hermes/state ~/.hermes/state/memory
```

### 5. Deploy shared lib + all 20 skills

```powershell
# From PC, push everything in one shot
scp -r dashboard\hetzner\skills\_shared root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\voice-note root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\triad-router root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\aios-audit root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\aios-onboard root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\aios-status root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\aios-help root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\aios-prune root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\codify-workflow root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\md-ingest root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\session-handoff root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\skill-trim root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\skill-eval root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\morning-brief-status root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\think root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\inbox-classify root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\intake-route root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\workflow-or-agent root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\forge root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\cinematic-prompt root@142.93.12.177:/home/hermes/.hermes/skills/
scp -r dashboard\hetzner\skills\build-skill root@142.93.12.177:/home/hermes/.hermes/skills/
```

Then on Droplet:

```bash
ssh root@142.93.12.177
sudo -u hermes -i

# Install each skill
for skill in voice-note triad-router aios-audit aios-onboard aios-status \
             aios-help aios-prune codify-workflow md-ingest session-handoff \
             skill-trim skill-eval morning-brief-status think inbox-classify \
             intake-route workflow-or-agent forge cinematic-prompt build-skill; do
  hermes skill install ~/.hermes/skills/$skill
done

# Restart gateway to pick up new triggers
hermes gateway restart

# Verify
hermes skill list | wc -l   # expect 20+
```

### 6. Copy cron scripts to Droplet

```powershell
scp -r dashboard\hetzner\scripts\*.js root@142.93.12.177:/home/hermes/.hermes/scripts/
scp dashboard\hetzner\scripts\smoke-test.sh root@142.93.12.177:/home/hermes/.hermes/scripts/
ssh root@142.93.12.177 'chmod +x /home/hermes/.hermes/scripts/*.sh && chown -R hermes:hermes /home/hermes/.hermes/scripts/'
```

### 7. Push updated jobs.json + reload cron

```powershell
scp dashboard\hetzner\hermes-jobs.json root@142.93.12.177:/tmp/
ssh root@142.93.12.177 'cp /tmp/hermes-jobs.json /home/hermes/.hermes/jobs.json && chown hermes:hermes /home/hermes/.hermes/jobs.json'
ssh root@142.93.12.177 'sudo -u hermes hermes cron reload'
ssh root@142.93.12.177 'sudo -u hermes hermes cron list'
```

Confirm these new jobs appear:
- `aios-audit-weekly`
- `aios-onboard-quarterly`
- `deepseek-spend-reset`
- `voice-flush`
- `activity-log-rollup-monthly`

### 8. Run the smoke test on Droplet

```bash
ssh root@142.93.12.177
sudo -u hermes -i
bash ~/.hermes/scripts/smoke-test.sh
```

Expect mostly green. SKIPs on skills without test files are fine.

### 9. Run pytest across all 22 suites

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

Or just from Telegram once deployed: `/skill-eval`

### 10. Exercise the pipeline end-to-end

From iPhone Telegram to `@LeBotJamesAiosBot`:

```
/aios-status                                          # confirms bridge healthy
/aios-help                                            # lists all 20 skills
Send a voice memo ("trading idea hashtag trading")    # voice → vault
/think should I add NFL to ParlayBot now or later?    # structured reasoning
/triad ultrathink the parlay kelly formula            # quad mode + critique loops
/cinematic dragon emerging from smoke --lucky-dog     # cinematographer prompt
/workflow-or-agent classify emails into 4 buckets     # decision filter
/aios-audit                                           # 4 Cs coverage
/aios-prune                                           # deletion proposal
/skill-eval                                           # all 22 tests
```

### 11. Open dashboard pages

In a browser at PC:

- `http://127.0.0.1:3737/` — homepage with TRIAD cell in System Pulse strip
- `http://127.0.0.1:3737/hermes-skills` — visual skill catalog

---

## Rollback

All v7 changes are additive. To roll back any piece:

```bash
# Uninstall a specific skill
ssh root@142.93.12.177 'sudo -u hermes hermes skill uninstall <skill-name>'

# Revert SOUL.md
ssh root@142.93.12.177 'sudo -u hermes git -C ~/.hermes checkout HEAD~1 SOUL.md && hermes gateway restart'

# Disable specific cron job
# Edit ~/.hermes/jobs.json on Droplet, set "enabled": false for the job, hermes cron reload
```

Dashboard routes can stay in place even with Hermes-side rollback — they do nothing on their own.

---

## What's still queued (intentionally not in v7)

These need PC access or deliberate work:

- **Tailscale proxy → Windows service** — currently nohup, dies on reboot
- **iCloud Drive vault sync** — for iPhone visual viewing
- **`winget install docling`** — unlocks `/md-ingest` for PDFs
- **3-table Cole Medin RAG for Trading Assistant** (YT #33)
- **Lucky Dog Claude Design import** (YT #6)
- **First $3-5k consulting pitch** — "Personal AIOS in a Weekend"

## Cumulative stats

- 22 pytest suites, all network-free
- 0 destructive changes shipped — fully additive
- ~7,500 lines TypeScript/Python/JS net new
- Free-tier-first stack; ~$5-10/mo marginal beyond existing subscriptions
