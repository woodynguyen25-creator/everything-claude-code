# AIOS Dashboard — Mobile Deployment Plan

**Status:** FOUNDATION ONLY. Do NOT execute until Woody gives explicit go-ahead.
**Target:** Droplet via Tailscale (http://100.78.199.123:3737)
**Date planned:** 2026-05-27

---

## Phase 1 — Tailscale Dev Access (Local Machine)

Already available. Run:

```bash
cd "c:/Github Repos/everything-claude-code/dashboard"
npm run dev:tailscale
```

Then connect from phone (on Tailscale): `http://100.78.199.123:3737`

- Default `npm run dev` stays bound to 127.0.0.1 (safe, never breaks Claude Code panel)
- `dev:tailscale` binds to 0.0.0.0 — all network interfaces, including Tailscale

---

## Phase 2 — Droplet Production Deploy (PENDING EXECUTION)

### Prerequisites
- [ ] Woody confirms mobile deploy go-ahead
- [ ] SSH access to root@142.93.12.177 verified
- [ ] Node.js 18+ on Droplet: `node --version`
- [ ] UFW rule: `ufw allow 3737/tcp`

### Build & Upload

```bash
# Local: build production bundle
cd "c:/Github Repos/everything-claude-code/dashboard"
cp .env.local .env.production.local  # merge secrets
npm run build

# Package (PowerShell)
tar -czf dashboard-build.tar.gz .next package.json public node_modules app lib components

# Upload to Droplet
scp dashboard-build.tar.gz root@142.93.12.177:/home/hermes/dashboard-build.tar.gz
```

### Install on Droplet

```bash
ssh root@142.93.12.177
mkdir -p /home/hermes/dashboard
cd /home/hermes/dashboard
tar -xzf ~/dashboard-build.tar.gz

# Create .env.local on Droplet with same vars as local
cat > .env.local << 'EOF'
OLYMPUS_ENDPOINT=http://127.0.0.1:8085
OLYMPUS_STATE_TOKEN=f5a34cf3ec44d3303afe72b8c7a87456bf1616086dc7a2cfb7a47b28c08e60a8
NEXT_PUBLIC_TAILSCALE_MODE=true
NEXT_PUBLIC_DEPLOY_TARGET=droplet
EOF

npm install --production
```

### systemd Service

Create `/etc/systemd/system/olympus-dashboard.service`:

```ini
[Unit]
Description=AIOS Dashboard Next.js
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/hermes/dashboard
ExecStart=/usr/bin/node_modules/.bin/next start -p 3737 -H 0.0.0.0
Restart=on-failure
EnvironmentFile=/home/hermes/dashboard/.env.local

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable olympus-dashboard
systemctl start olympus-dashboard
systemctl status olympus-dashboard
```

### Access from Phone

1. Install Tailscale on iPhone/Android
2. Connect to Woody's tailnet
3. Open: `http://100.78.199.123:3737`

---

## Security Notes

- The dashboard is NOT exposed to the public internet — only available on Tailscale
- UFW allows port 3737 ONLY on the Tailscale interface (100.x.x.x)
- All Olympus state requests still go through Bearer token auth

---

## Rollback

If the Droplet dashboard breaks:
1. `systemctl stop olympus-dashboard`
2. Local `npm run dev` (127.0.0.1) is unaffected — use that
3. Investigate on Droplet logs: `journalctl -u olympus-dashboard -n 50`

---

*Planned 2026-05-27. Do not execute without Woody's explicit confirmation.*
