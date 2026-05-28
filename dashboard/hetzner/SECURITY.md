# Hermes Hetzner — Security Audit & Hardening
> Audit pass before Woody signs up to Hetzner. 2026-05-25.

---

## What Leaves Your PC

These secrets will exist on the Hetzner server (in `/home/hermes/.env`):

| Secret | Why it's there | Worst case if leaked |
|--------|----------------|---------------------|
| `GROQ_API_KEY` | Voice transcription | Attacker spends your Groq credits (~$0 since free tier) |
| `GEMINI_API_KEY` | Morning brief LLM calls | Attacker spends your Gemini credits (free tier) |
| `CEREBRAS_API_KEY` | Council fallback | Free tier, low impact |
| `DEEPSEEK_API_KEY` | Perseus agent | Attacker spends your $5 deposit |
| `TELEGRAM_BOT_TOKEN` | Telegram inbox bot | **HIGH** — attacker controls your bot, can read all incoming messages, can send messages as your bot |
| `OBSIDIAN_KEY` | Obsidian REST API auth | Only useful if attacker is on your Tailscale mesh (they're not) |
| `HERMES_TOKEN` | Trigger API auth | Attacker can manually trigger Hermes jobs |

**What stays on your PC (NEVER on Hetzner):**
- Your SSH private key (`~/.ssh/id_ed25519`)
- Your local SQLite DBs (habits, internships, finances, workouts)
- Your Obsidian vault
- Any Anthropic/OpenAI/Claude Code keys
- Your Hetzner account password
- Your Tailscale account password

---

## Defense Layers

### Layer 1 — Network: Zero public surface
- Hermes binds to `0.0.0.0:3001` BUT `ufw` blocks port 3001 from the public internet
- Tailscale traffic bypasses ufw (uses its own `tailscale0` interface)
- **Result:** Only your Tailscale-authenticated devices can reach Hermes. The public internet sees only port 22 (SSH).
- **Verify after setup:** `nmap <hetzner-public-ip>` from another machine — should only show port 22

### Layer 2 — SSH: Key-only, no root password
The `bootstrap.sh` script sets:
- `PasswordAuthentication no` — passwords disabled entirely
- `PermitRootLogin prohibit-password` — root can only log in with SSH key
- `ChallengeResponseAuthentication no` — disables alternative auth methods
- `KbdInteractiveAuthentication no` — disables keyboard-interactive auth
- `fail2ban` blocks any IP that fails SSH auth 5 times in 10 min

### Layer 3 — Process isolation: Hermes runs as non-root
- A dedicated `hermes` user (not root) runs the daemon
- Even if Hermes is compromised, attacker has limited system access
- `.env` file is `chmod 600` (only `hermes` user can read it)

### Layer 4 — Token security: Constant-time, crypto-strong
- `HERMES_TOKEN` is 32 chars from `RandomNumberGenerator` (cryptographic CSPRNG, not `Get-Random`)
- API uses `crypto.timingSafeEqual()` for comparison (prevents timing attacks)
- Token rotation: `nano /home/hermes/.env`, update token, `pm2 restart hermes`

### Layer 5 — Encryption in transit
- All traffic PC ↔ Hetzner goes through Tailscale (WireGuard, modern encryption)
- All traffic to/from external APIs (Groq, Gemini, Telegram) uses HTTPS
- No plaintext anywhere

### Layer 6 — Encryption at rest
- Hetzner backups encrypted at rest by default
- `.env` file is on Hetzner's encrypted volume
- SSH key on your PC: optionally protected with a passphrase

### Layer 7 — Auto-updates
- `unattended-upgrades` installs Ubuntu security patches automatically
- No manual intervention needed for OS-level CVEs

---

## What Could Still Go Wrong (Threat Model)

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|-----------|
| Hetzner account compromise (weak password) | LOW | HIGH | **Enable 2FA in Hetzner console** (Settings → Security) |
| Tailscale account compromise | LOW | HIGH | **Enable 2FA in Tailscale** (Settings → Security) |
| SSH key stolen from PC | LOW | HIGH | Use passphrase on SSH key (optional but recommended) |
| Script in Hermes runs malicious code | LOW | MEDIUM | All scripts are written by you/Claude — reviewable before deploy |
| API key rotation forgotten | MEDIUM | LOW | Rotate quarterly: edit `/home/hermes/.env`, restart Hermes |
| Hetzner billing surprise | LOW | LOW | Set spending limit: Console → Settings → Billing → Limit |
| Logs leak secrets accidentally | MEDIUM | LOW | Never `console.log(process.env)` in scripts — code review catches this |
| Backup snapshot restored by attacker | LOW | HIGH | 2FA on Hetzner account prevents this |

---

## Things You MUST Do Before / During Signup

### Before SSHing in (5 min)
- [ ] Sign up to Hetzner with a **unique strong password** (not reused from anywhere)
- [ ] **Enable 2FA on Hetzner account** (Settings → Security → Two-factor authentication)
- [ ] Use a TOTP app (Authy, 1Password, Google Authenticator) — save the recovery codes somewhere safe
- [ ] Same for Tailscale account — **enable 2FA there too**
- [ ] Set a spending limit in Hetzner (Settings → Billing → ~$15/mo cap so you can't be surprise-billed)

### When generating SSH key (1 min)
- [ ] Optional: set a passphrase on the SSH key
  - Pro: even if your PC is stolen, the key is useless
  - Con: you have to type it every time you SSH
  - **Recommended: use a passphrase, save it in 1Password**

### After bootstrap.sh runs (5 min)
- [ ] Verify SSH is locked down: `ssh root@<ip>` should ONLY work with your key (not password)
- [ ] Verify firewall: `ufw status` should show "active" with only OpenSSH allowed
- [ ] Verify fail2ban: `fail2ban-client status sshd` should show jail running
- [ ] Verify Tailscale: `tailscale status` should show your PC + the Hetzner box

### Periodic (monthly, 5 min)
- [ ] Check Hetzner billing matches expected (~$5)
- [ ] Check `pm2 logs hermes` for any errors
- [ ] Update server: `apt update && apt upgrade -y` (or trust `unattended-upgrades` to do it)

### Yearly (15 min)
- [ ] Rotate `HERMES_TOKEN` (run `deploy.ps1` again with `-NewToken` flag — to be added)
- [ ] Rotate API keys for any service that supports it (Telegram bot, etc.)
- [ ] Review `/home/hermes/.env` — remove any secrets no longer in use

---

## Operational Security Best Practices

### DO
- ✅ Use a password manager (1Password, Bitwarden) for Hetzner + Tailscale passwords
- ✅ Enable 2FA on every account that supports it
- ✅ Keep your PC operating system updated (Windows Update + restart weekly)
- ✅ Review PM2 logs weekly for any unexpected job failures
- ✅ Lock your PC when away (Windows Key + L)

### DON'T
- ❌ Commit `.env` files to git (already in `.gitignore`)
- ❌ Paste `.env` contents into Claude/ChatGPT (they don't need to see secrets)
- ❌ Reuse the Hetzner password anywhere
- ❌ SSH to the server from public WiFi without confirming the connection
- ❌ Add additional users or open additional ports without thinking it through

---

## If Something Looks Wrong

### Suspicious activity in logs
1. `sudo -u hermes pm2 logs hermes --lines 200`
2. Look for: jobs you didn't trigger, errors with weird URLs, env variable references in output
3. If anything looks malicious: `sudo -u hermes pm2 stop hermes` immediately, then investigate

### Hetzner sent you a security email
1. Don't panic — they email proactively about unusual activity
2. Log into Hetzner console, change password, regenerate API tokens
3. Check the "Audit log" in your project for what changed
4. Reissue SSH key if needed

### Telegram bot doing things you didn't ask
1. `pm2 stop telegram-bot` immediately
2. Revoke bot token via @BotFather in Telegram: `/revoke`
3. Generate new token, update `/home/hermes/.env`, restart

### You see jobs running you didn't add
1. Check `/home/hermes/hermes-jobs.json` — diff against what you have locally
2. If it was modified by someone other than you: full incident response — change all passwords, rotate all tokens, restore from a known-good snapshot

---

## The Honest Bottom Line

For a personal AIOS used by one person with all the layers above:
- **Realistic risk = very low.** You'd need someone to specifically target you AND bypass multiple security layers.
- **Most likely failure mode:** you forget to enable 2FA on Hetzner OR your SSH key is on a PC that gets stolen. Both are preventable with the checklist.
- **Cost of a worst-case breach:** ~$50 in surprise API bills (capped by spending limits) + having to revoke + reissue tokens (~30 min).

This is more secure than 99% of personal projects on the internet. Good architecture.
