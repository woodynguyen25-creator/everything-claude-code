# voice-note — Hermes Skill

Telegram voice memo → Groq Whisper transcript → tag-routed write into Woody's Obsidian Command Center vault.

## Pipeline

```
iPhone Telegram (voice memo)
  → @LeBotJamesAiosBot
  → Hermes Agent gateway (this skill)
    ├─ Groq Whisper-large-v3-turbo transcribe
    ├─ Detect hashtag → route to project folder
    ├─ POST /api/vault/write on PC dashboard (via Tailscale)
  → Reply on Telegram: "✅ Saved to <path>"
```

## Tag routing

| Hashtag in voice | Saves to |
|---|---|
| `#trading`  | `Trading Assistant/Voice Notes/` |
| `#luckydog` | `Lucky Dog Landing Page/Voice Notes/` |
| `#parlay`   | `ParlayBot/Voice Notes/` |
| `#solo`     | `Solo Store/Voice Notes/` |
| `#homework` | `Homework/Voice Notes/` |
| `#idea`     | `_inbox/` |
| (no tag)    | `_inbox/` |

## Required env

Set in `/home/hermes/.hermes/.env` (mode 600):

```bash
GROQ_API_KEY=<groq key — same one Whisper Dictate V3 uses>
ECC_BRIDGE_URL=http://100.69.115.98:3738
ECC_BRIDGE_TOKEN=<same token dashboard expects>
```

## Deploy

From the PC, with the dashboard repo checked out:

```powershell
# Copy skill files to Droplet
scp -r dashboard/hetzner/skills/voice-note root@142.93.12.177:/home/hermes/.hermes/skills/

# Install via Hermes CLI
ssh root@142.93.12.177
sudo -u hermes -i
hermes skill install /home/hermes/.hermes/skills/voice-note
hermes gateway restart  # picks up new trigger
```

## Verify

1. Confirm Hermes sees it:
   ```bash
   hermes skill list | grep voice-note
   ```
2. Confirm PC bridge is up (from PC):
   ```powershell
   curl http://localhost:3737/api/vault/write
   ```
   Should return JSON with `vault_root` field.
3. Record a Telegram voice memo to `@LeBotJamesAiosBot`:
   > "This is a trading idea, hashtag trading, watch SPY puts tomorrow at open"
4. Within ~10s, expect a Telegram reply:
   > ✅ Saved to `Trading Assistant/Voice Notes/voice-YYYY-MM-DD-HHMM.md`
5. Open the file in Obsidian to confirm transcript + frontmatter.

## Fallback

If the PC bridge is unreachable (PC off, dashboard down, Tailscale broken):

- Voice is saved locally on Droplet at `/tmp/voice-<ts>.md`
- Reply tells Woody: "⚠️ PC bridge unreachable — voice saved locally"
- A future cron job (`voice-flush.py`) can scan `/tmp/voice-*.md` on a schedule
  and replay them through the bridge when PC is reachable. Build that when
  this skill has at least one fallback save in real life.

## Test locally (no network)

```bash
cd /home/hermes/.hermes/skills/voice-note
python -m pytest test_voice_note.py -v
```

Tests cover tag routing + note rendering — they don't hit Groq or the bridge.

## Tuning Whisper bias

`WHISPER_BIAS_PROMPT` in `main.py` is the same bias prompt as Whisper Dictate V3.
Add new vocabulary as Woody adds projects (e.g., new ticker, new agent name).
Keep it under ~200 tokens — Whisper only uses the start of the prompt as bias.

## Security

- Skill trigger filters by `user_id: 2019823847` — only Woody can fire it
- All bridge requests carry `Authorization: Bearer $ECC_BRIDGE_TOKEN`
- Dashboard validates folder path against vault root (no `..`, no absolute paths)
- Filename regex on the bridge side limits to `[\w\-. ]+\.md` — no shell tricks
- Groq + bridge requests have 10–30s timeouts so the gateway never hangs

## Estimated cost

- Groq Whisper: free tier covers ~10 hrs/day. Single 1-min voice = ~$0.0004 if metered. Effectively free.
- DeepSeek/Claude: not used by this skill at all. Pure transport + Whisper.
