# HERMES on HETZNER — Architecture Plan
**Date:** 2026-05-25 (Opus 4.7 research pass)  
**Goal:** Move Hermes daemon to a $5/month Hetzner VPS so background automation runs 24/7, dashboard always has fresh data, Obsidian always gets synced — even when Woody's PC is off.

---

## Why Now

Hermes currently runs on Woody's Windows PC via Task Scheduler. This works most of the time but has three failure modes:
1. **PC off = no jobs.** Morning brief at 09:30 CT doesn't run if the PC is asleep.
2. **VSCode/dashboard crashes can cascade.** A frozen extension can wedge the scheduler.
3. **No public surface.** External webhooks (Telegram, GitHub, n8n, IFTTT) can't trigger anything because there's no public endpoint.

Moving Hermes to Hetzner solves all three with one cheap, stable machine.

---

## The Architecture (Hybrid Model)

```
┌──────────────────────────────────────────────────────┐
│  WOODY'S PC (Windows 11)                              │
│  ├─ Obsidian + REST API plugin (:27123)              │
│  ├─ Dashboard (Next.js :3737)  — reads local SQLite  │
│  │   └─ Polls Hetzner /api/hermes/status              │
│  └─ Tailscale agent (lets Hetzner reach :27123)      │
└──────────────────────────────────────────────────────┘
                       ↑ Tailscale (private VPN, free)
                       ↓
┌──────────────────────────────────────────────────────┐
│  HETZNER CX22 (Ubuntu 24.04) — $4.15/month           │
│  ├─ Hermes daemon (PM2)                               │
│  │   └─ Cron-style jobs from hermes-jobs.json         │
│  ├─ Telegram bot (Hermes-managed, voice transcription)│
│  ├─ Caddy reverse proxy (auto-HTTPS via Let's Encrypt)│
│  ├─ Hermes API (GET /status, POST /trigger/:job)      │
│  └─ Public webhook receiver                           │
└──────────────────────────────────────────────────────┘
                       ↑
           HTTPS at hermes.<your-domain>
                       ↓
       Telegram · GitHub · external systems
```

**Key decision: Hybrid state model.**  
DBs (habits, internships, finances, workouts, tasks) stay local on the PC so the dashboard reads them at SQLite speed. Hermes pushes *outputs* (Obsidian notes, Telegram messages, webhooks) but doesn't own *state*. This keeps the dashboard fast and the deployment simple.

---

## Cost Breakdown

| Item | Monthly | Notes |
|------|---------|-------|
| Hetzner CX22 (2 vCPU · 4GB RAM · 40GB SSD · 20TB transfer) | $4.15 | Ashburn, VA location (closest to Houston) |
| Daily snapshots (backups) | $0.83 | Optional but recommended |
| Domain (.com) | $1.00 | $12/year — Cloudflare Registrar |
| Cloudflare DNS + tunnel | $0.00 | Free tier |
| Tailscale (3 devices) | $0.00 | Free tier |
| Caddy / Let's Encrypt | $0.00 | Auto-HTTPS, free |
| **TOTAL** | **~$6/month** | Includes backups & domain |

If you skip backups + already own a domain, **$4.15/month flat**.

---

## What Hermes on Hetzner Unlocks

### Reliability wins (immediate)
- **Morning brief always runs** at 09:30 CT, PC or no PC
- **Close ritual always runs** at 16:15 CT weekdays
- **Weekly summary always runs** Friday 16:45 CT
- **Obsidian sync always succeeds** (Hermes retries via Tailscale)

### New jobs that become possible
1. **Internship follow-up Hermes** — daily scan of InternshipPanel; Telegram nudge for any follow-up due
2. **Application deadline alerts** — 24h before any internship deadline
3. **Savings goal tracker** — paycheck day arrives → auto-update finances.json, calculate progress
4. **Daily note auto-creation** — midnight every day, fresh daily note in `Command Center/Daily Notes/`
5. **Telegram voice → Obsidian** — speak into Telegram, Groq transcribes, appended to daily note (no PC needed)
6. **Overnight research** — kick off Sauron deep-research at 11 PM, results in Obsidian by 6 AM
7. **Market open prep** — at 9:00 CT, generate trading brief 30 min before bell
8. **Habit reminder** — if you haven't checked off habits by 8 PM, Telegram nudge
9. **GitHub webhook → redeploy** — push to ECC main → Hermes pulls + restarts
10. **n8n integration** — n8n flows trigger Hermes jobs, or vice versa

### Public surface
You can finally have URLs like:
- `https://hermes.woodyrealm.com/status` — public status page
- `https://hermes.woodyrealm.com/api/trigger/morning-brief` — webhook to manually fire
- `https://hermes.woodyrealm.com/api/inbox` — Telegram/email/whatever can POST here

---

## Why Tailscale (and not Cloudflare Tunnel)

Both are free. Tailscale wins because:
- **Private mesh** — Hetzner reaches your PC via internal `100.x.x.x` IP, no exposing Obsidian to the public internet
- **Magic DNS** — your PC is always `woody-pc.tail-net.ts.net` regardless of network
- **Auto-reconnects** — works behind NAT, VPN, mobile hotspot
- **Three-device free tier** — covers PC + Hetzner + your iPhone

Cloudflare Tunnel is fine if you want public access to Obsidian, but Tailscale is the right call for private machine-to-machine.

---

## Deployment in 5 Phases (each ~30 min)

### Phase 1 — Bootstrap server (Day 1, ~30 min)
1. Create Hetzner account at hetzner.com → Cloud project "AIOS"
2. Generate SSH key on PC: `ssh-keygen -t ed25519 -C "woody-aios"`
3. Spin up CX22 (Ubuntu 24.04, Ashburn VA), paste SSH key
4. SSH in: `ssh root@<ip>`
5. Initial hardening:
   ```bash
   apt update && apt upgrade -y
   apt install -y ufw fail2ban
   ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
   ```
6. Install Node 20 + PM2 + Caddy:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs caddy
   npm install -g pm2
   pm2 startup systemd
   ```

### Phase 2 — Tailscale mesh (Day 1, ~15 min)
1. On PC: `winget install Tailscale.Tailscale` → log in via browser
2. On Hetzner: `curl -fsSL https://tailscale.com/install.sh | sh && tailscale up`
3. Both devices now reachable at their Tailscale IPs
4. Verify: from Hetzner SSH, `curl http://<pc-tailscale-ip>:27123` should return Obsidian REST API response

### Phase 3 — Deploy Hermes (Day 1-2, ~45 min)
1. From PC, sync Hermes files to server:
   ```bash
   scp -r "C:/Users/woody/TradingView Assistant/hermes.js" root@<ip>:~/hermes/
   scp -r "C:/Users/woody/TradingView Assistant/hermes-jobs.json" root@<ip>:~/hermes/
   scp -r "C:/Users/woody/.claude/scripts/morning-brief.js" root@<ip>:~/hermes/scripts/
   scp -r "C:/Users/woody/.claude/scripts/close-ritual.js" root@<ip>:~/hermes/scripts/
   scp -r "C:/Users/woody/.claude/scripts/weekly-summary.js" root@<ip>:~/hermes/scripts/
   scp -r "C:/Github Repos/everything-claude-code/dashboard/scripts/sync-workouts-obsidian.js" root@<ip>:~/hermes/scripts/
   ```
2. On server, install deps + add env:
   ```bash
   cd ~/hermes && npm init -y && npm install node-cron better-sqlite3 node-fetch dotenv
   nano .env  # paste GROQ_API_KEY, GEMINI_API_KEY, OBSIDIAN_KEY, TELEGRAM_BOT_TOKEN, etc.
   ```
3. Update all scripts: replace `http://localhost:27123` with `http://<pc-tailscale-ip>:27123`
4. Launch: `pm2 start hermes.js --name hermes && pm2 save`

### Phase 4 — Public API + Caddy (Day 2, ~30 min)
1. Buy domain (or use existing): Cloudflare Registrar `.com` = $9/year
2. Point DNS A record to Hetzner IP
3. Configure Caddy (`/etc/caddy/Caddyfile`):
   ```
   hermes.<your-domain>.com {
     reverse_proxy localhost:3001
   }
   ```
4. `systemctl reload caddy` — auto-HTTPS in 30s
5. Add minimal HTTP API to hermes.js:
   - `GET /api/hermes/status` → reads hermes-status.json
   - `POST /api/hermes/trigger/:jobId` → fires job (auth via Bearer token)
6. Update dashboard `.env.local`:
   ```
   HERMES_ENDPOINT=https://hermes.<your-domain>.com
   HERMES_TOKEN=<random-secret>
   ```
7. Update dashboard `/api/hermes/route.ts` to fetch from `HERMES_ENDPOINT` instead of local file

### Phase 5 — Migrate Telegram bot + new jobs (Day 3+, ongoing)
1. Stop telegram-inbox.js on PC, move to Hetzner
2. Merge voice handler (downloadBuffer, transcribeWithGroq, appendToObsidianDaily)
3. PM2 manages it: `pm2 start telegram-inbox.js --name telegram-bot`
4. Add new jobs to hermes-jobs.json:
   - `internship-followups` (daily 09:00 CT)
   - `savings-paycheck-update` (cron based on payday)
   - `daily-note-create` (midnight every day)

---

## Hermes Job Catalog (post-migration)

| Job | Schedule | What it does | Writes to |
|-----|----------|-------------|-----------|
| `morning-brief` | 09:30 CT daily | Market + watchlist digest | Obsidian + Telegram |
| `market-open-prep` | 09:00 CT weekdays | 30-min pre-bell trading brief | Telegram |
| `close-ritual` | 16:15 CT weekdays | P/L + position review | Obsidian + Telegram |
| `weekly-summary` | Fri 16:45 CT | Full week-in-review | Obsidian + Telegram |
| `obsidian-sync` | 20:00 CT daily | Habits + workout sync | Obsidian |
| `daily-note-create` | 00:01 CT daily | Fresh daily note | Obsidian |
| `internship-followups` | 09:00 CT daily | Scan InternshipPanel for due follow-ups | Telegram |
| `deadline-alerts` | 08:00 CT daily | 24h-before alerts for deadlines | Telegram |
| `habit-nudge` | 20:00 CT daily | Telegram if habits incomplete | Telegram |
| `savings-paycheck-update` | Per-paycheck | Auto-log paycheck, update progress | finances.json + Obsidian |
| `health-check` | Every 5 min | Self-monitoring | hermes-status.json |

---

## Security Hardening Checklist

- [x] SSH key only (PasswordAuthentication no)
- [x] UFW firewall (only 22, 80, 443 open)
- [x] Fail2ban for SSH brute-force protection
- [x] Caddy auto-HTTPS via Let's Encrypt
- [x] Bearer token auth on Hermes trigger API
- [x] Tailscale for private PC↔Hetzner traffic (no public exposure of Obsidian)
- [x] Daily snapshot backups ($0.83/mo)
- [x] No secrets in git — all in `.env` on server
- [x] PM2 logs rotated (`pm2 install pm2-logrotate`)

---

## Dashboard Integration Changes

After Hermes is on Hetzner, update these dashboard files:

### `app/api/hermes/route.ts`
```ts
export const dynamic = 'force-dynamic';

export async function GET() {
  const endpoint = process.env.HERMES_ENDPOINT;
  if (!endpoint) {
    // fallback: read local hermes-status.json (dev mode)
    return NextResponse.json(readLocalStatus());
  }
  try {
    const res = await fetch(`${endpoint}/api/hermes/status`, {
      headers: { Authorization: `Bearer ${process.env.HERMES_TOKEN}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ daemonRunning: false, jobs: [], error: 'remote-unreachable' });
  }
}
```

### `components/HermesStrip.tsx` (NEW, for SystemPulseStrip)
Shows: green dot if remote Hermes reachable, last job time, next job ETA.

### `app/hermes/page.tsx`
Already works — just pulls from `/api/hermes` which now hits remote.

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| PC IP changes (different network) | Tailscale Magic DNS — `woody-pc.tail-net.ts.net` resolves anywhere |
| Obsidian closed = REST API unreachable | Hermes queues writes, retries every 15 min until success |
| Hetzner outage | Status page shows red dot; jobs queue locally on PC as fallback (Phase 6) |
| Forgot to renew domain | Cloudflare auto-renew ($1/mo on card) |
| Secrets leaked | All `.env`, never in git; rotate quarterly |
| Cron job failure silently | Telegram alert on any job exception |

---

## What I Need From You to Build This

1. **Domain name** — do you own one already? If yes, what? If no, what name do you want? (suggestions: `woodyrealm.com`, `woodyos.dev`, `aios.wn`, `woodynguyen.dev`)
2. **Hetzner account** — do you have one? If not, you'll need to create it and add a card. I can't do this for you.
3. **Bot token storage** — `TELEGRAM_BOT_TOKEN` will move from PC to Hetzner `.env`. Confirm you're OK with that token being on a cloud server.
4. **Backup decision** — $0.83/month for daily snapshots? (recommend yes)
5. **Scope for v1** — should I include the Telegram voice merge in the initial migration, or defer to v2?

---

## Build Path Forward

Once you confirm the 5 questions above, I write:
1. **`scripts/hetzner-bootstrap.sh`** — automated server setup (run once after SSH'ing in)
2. **`scripts/deploy-hermes.sh`** — runs from PC, pushes files to server, restarts PM2
3. **`hermes-jobs.json` (v2)** — expanded job catalog
4. **`app/api/hermes/route.ts`** updated for remote
5. **`HERMES-RUNBOOK.md`** — ops manual (how to restart, view logs, add jobs, recover from outage)
6. **`CODEX-PASS-6.md`** — codex instructions to refactor the dashboard side

Total estimated time: ~3 hours of your active involvement spread over 2-3 days, mostly waiting for things to install.

---

## Future (post-v1, on the same $5 box)

- **PostgreSQL** instead of scattered SQLites (when scale demands)
- **n8n self-hosted** instead of $20/mo SaaS plan
- **Public status page** with auth via Cloudflare Access
- **MCP server hosting** — host your own custom MCP servers publicly
- **Internship application bot** — scrapes career pages, auto-creates InternshipPanel entries when new postings match your filters
