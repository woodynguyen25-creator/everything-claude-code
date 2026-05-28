# Hermes Runbook — Operations Manual
> SSH commands assume `ssh root@<your-hetzner-ip>` then `sudo -u hermes` for the hermes user.

---

## Daily Operations

### Check status
```bash
sudo -u hermes pm2 status
sudo -u hermes pm2 logs hermes --lines 30
```

Or from your PC: open the dashboard `/hermes` page — it polls the remote Hermes every 30s.

### Restart Hermes
```bash
sudo -u hermes pm2 restart hermes
```

### Fire a job manually
```bash
curl -X POST http://woody-hermes.tail-net.ts.net:3001/trigger/morning-brief \
  -H "Authorization: Bearer $HERMES_TOKEN"
```

Or via dashboard: visit `/hermes`, click any job row → "Trigger now" button.

### View live logs
```bash
sudo -u hermes pm2 logs hermes
# Ctrl+C to exit
```

### View specific log file
```bash
tail -f /home/hermes/.pm2/logs/hermes-out.log
tail -f /home/hermes/.pm2/logs/hermes-error.log
```

---

## Common Tasks

### Add a new job

1. Edit `hermes-jobs.json` on the server:
```bash
sudo -u hermes nano /home/hermes/hermes-jobs.json
```

Add a new entry:
```json
{
  "id": "internship-followups",
  "name": "Internship Follow-ups",
  "description": "Daily scan for due follow-ups",
  "enabled": true,
  "script": "internship-followups.js",
  "schedule": { "cron": "0 9 * * *", "time": "09:00", "days": "daily", "tz": "America/Chicago" }
}
```

2. Upload the script:
```powershell
# From PC:
scp internship-followups.js root@<ip>:/home/hermes/scripts/
ssh root@<ip> "chown hermes:hermes /home/hermes/scripts/internship-followups.js"
```

3. Restart Hermes:
```bash
sudo -u hermes pm2 restart hermes
```

### Disable a job temporarily
Edit `hermes-jobs.json` → set `"enabled": false` for that job → restart Hermes.

### Update a secret (API key rotation)
```bash
sudo -u hermes nano /home/hermes/.env
# Update the key
sudo -u hermes pm2 restart hermes
```

### Sync code changes from PC
From PowerShell on your PC:
```powershell
cd "C:\Github Repos\everything-claude-code\dashboard"
.\hetzner\deploy.ps1 -ServerIp <your-ip>
```

This re-syncs all scripts + restarts Hermes.

---

## Troubleshooting

### Dashboard `/hermes` page shows "remote-unreachable"
1. Check Hermes is running: `sudo -u hermes pm2 status`
2. If not: `sudo -u hermes pm2 restart hermes`
3. Check Tailscale on PC: open Tailscale tray icon → confirm connected
4. Check Tailscale on server: `tailscale status`
5. Test directly: `curl http://woody-hermes.tail-net.ts.net:3001/health`

### A job is failing
1. View the error: `sudo -u hermes pm2 logs hermes | grep -A 3 <job-id>`
2. Test the script manually: `sudo -u hermes node /home/hermes/scripts/<script-name>.js`
3. Common causes:
   - Missing env var → add to `/home/hermes/.env`
   - Obsidian REST API unreachable (PC offline or Obsidian closed)
   - Script path changed on PC but not re-synced → run `deploy.ps1`

### Obsidian writes failing
The Obsidian REST API plugin must be running on your PC. To verify from Hermes:
```bash
curl -H "Authorization: Bearer $OBSIDIAN_KEY" http://<your-pc-tailscale-ip>:27123/
```
If this fails, open Obsidian on your PC. Hermes will retry queued writes automatically.

### Hetzner billing alert
Check usage: log into Hetzner Cloud → Server `hermes` → Graphs tab. CX22 = 20TB transfer/month included. You'll never hit this.

### Recover from a full server crash
Hetzner backups are daily snapshots. To restore:
1. Log into Hetzner Cloud → Server `hermes` → Backups tab
2. Click "Restore" on most recent snapshot
3. Wait ~5 min
4. SSH back in and run `sudo -u hermes pm2 resurrect`

---

## Monitoring

### Set up Telegram alerts on job failure
Add to each job script's catch block:
```js
if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
  fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: `🔥 Hermes job failed: ${jobName}\n\`\`\`${error}\`\`\``,
      parse_mode: 'Markdown',
    }),
  });
}
```

### Daily health summary
Add a `daily-health-summary` job that runs at 22:00 CT and posts to Telegram:
- Jobs run today vs scheduled
- Success/fail counts
- Disk usage
- Memory usage

---

## Cost Monitoring

- Login to https://console.hetzner.cloud/
- Project: AIOS → Server `hermes` → Pricing tab
- Should show ~€4.71 ($4.98) per month
- If you see anything higher, check: extra IPs, additional volumes, snapshots above the daily one

---

## Killing It (if you ever want to)

```bash
# Stop Hermes
sudo -u hermes pm2 delete hermes

# Or delete the entire server from Hetzner Console:
# Server `hermes` → ... menu → Delete
```

Deletion is immediate and stops billing within the hour.
